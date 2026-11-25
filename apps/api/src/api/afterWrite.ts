/*
 * 寫入之後嘅後置步驟（Technical Spec API-061、「CR-003 對技術設計嘅影響 → 內容流程」）：
 * 每個成功（2xx）嘅 /api 寫入請求之後行一次 hook，各 route 唔使自己叫。
 * hook 有結果就加入回應 JSON 做 `catalog`（CatalogStatus：同 GET /api/albums 嘅 `catalog` 同一個形狀，backlog B-046 ②；
 * `ok: false` = 已儲存但生成失敗）。api/routes.ts 用 catalog/rebuildRoute.ts 嘅 rebuildAfterWrite（T-026）。
 * 生成成功（catalog.ok）之後先刪 route 記低嘅歌詞檔（tracks/lyricsCleanup.ts，review W-021）。
 * 唔改 catalog 內容嘅寫入 route 加 skipPostWrite（T-024：上載圖；T-026：重新生成 endpoint 自己，backlog B-043 ③）
 */
import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../app';
import { internalFailure, type CatalogStatus } from '../catalog/state';
import { dropReleasedLyrics } from '../tracks/lyricsCleanup';
import { isJsonObject, type JsonObject } from '../lib/http';

export type PostWriteHook = (c: Context<AppEnv>) => Promise<CatalogStatus | undefined>;

export const noPostWrite: PostWriteHook = async () => undefined;

/** route 級 middleware：呢個寫入唔使行後置步驟 */
export const skipPostWrite = createMiddleware<AppEnv>(async (c, next) => {
    c.set('skipPostWrite', true);
    await next();
});

const WRITE_METHODS: readonly string[] = ['POST', 'PUT', 'PATCH', 'DELETE'];
const JSON_TYPE = 'application/json';

/** 回應 body 係 JSON object 先回；其他（文字、array）→ undefined */
const jsonBodyOf = async (response: Response): Promise<JsonObject | undefined> => {
    if (!response.headers.get('content-type')?.startsWith(JSON_TYPE)) return undefined;
    const body: unknown = await response.clone().json();
    return isJsonObject(body) ? body : undefined;
};

/**
 * hook throw 都唔可以令已儲存嘅寫入變 500：D1 已儲存但 catalog.json 未更新（API-061、D30），寫入照回成功，
 * `catalog.ok = false`（error INTERNAL）。log 只寫錯誤名：message / stack 可能帶 R2 key 或內部細節
 */
const runHook = async (
    hook: PostWriteHook,
    c: Context<AppEnv>,
): Promise<CatalogStatus | undefined> => {
    try {
        return await hook(c);
    } catch (error) {
        const name = error instanceof Error ? error.name : typeof error;
        console.error('[api] post-write step failed', name);
        return internalFailure(new Date().toISOString());
    }
};

export const afterWrite = (hook: PostWriteHook) =>
    createMiddleware<AppEnv>(async (c, next) => {
        await next();
        if (!WRITE_METHODS.includes(c.req.method) || !c.res.ok) return;
        if (c.get('skipPostWrite') === true) return;
        const catalog = await runHook(hook, c);
        // 生成成功先刪冇人用嘅歌詞檔：失敗時播放端嘅上一份 catalog 仲指住佢哋（W-021）
        if (catalog?.ok === true) await dropReleasedLyrics(c);
        if (catalog === undefined) return;
        const body = await jsonBodyOf(c.res);
        if (!body) return;
        const headers = new Headers(c.res.headers);
        headers.delete('content-length');
        c.res = new Response(JSON.stringify({ ...body, catalog }), {
            status: c.res.status,
            headers,
        });
    });
