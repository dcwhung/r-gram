/*
 * 寫入之後嘅後置步驟（Technical Spec API-061、「CR-003 對技術設計嘅影響 → 內容流程」）：
 * 每個成功（2xx）嘅 /api 寫入請求之後行一次 hook，各 route 唔使自己叫。
 * hook 有結果就加入回應 JSON 做 `catalog`（例如 `{ ok: false }` = 已儲存但生成失敗）。
 * T-022 只做接口：預設 noPostWrite（乜都唔做）；T-026 喺 api/routes.ts 換做 rebuildCatalog()
 */
import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../app';
import { isJsonObject, type JsonObject } from '../lib/http';

/** 回應入面嘅 `catalog`；細節由 T-026 定案 */
export interface CatalogWriteResult {
    ok: boolean;
}

export type PostWriteHook = (c: Context<AppEnv>) => Promise<CatalogWriteResult | undefined>;

export const noPostWrite: PostWriteHook = async () => undefined;

const WRITE_METHODS: readonly string[] = ['POST', 'PUT', 'PATCH', 'DELETE'];
const JSON_TYPE = 'application/json';

/** 回應 body 係 JSON object 先回；其他（文字、array）→ undefined */
const jsonBodyOf = async (response: Response): Promise<JsonObject | undefined> => {
    if (!response.headers.get('content-type')?.startsWith(JSON_TYPE)) return undefined;
    const body: unknown = await response.clone().json();
    return isJsonObject(body) ? body : undefined;
};

/** 生成失敗 = D1 已儲存但 catalog.json 未更新（API-061、D30）：寫入照回成功，`catalog.ok = false` */
const CATALOG_FAILED: CatalogWriteResult = { ok: false };

/**
 * hook throw 都唔可以令已儲存嘅寫入變 500。log 只寫錯誤名：message / stack 可能帶 R2 key 或內部細節
 */
const runHook = async (
    hook: PostWriteHook,
    c: Context<AppEnv>,
): Promise<CatalogWriteResult | undefined> => {
    try {
        return await hook(c);
    } catch (error) {
        const name = error instanceof Error ? error.name : typeof error;
        console.error('[api] post-write step failed', name);
        return CATALOG_FAILED;
    }
};

export const afterWrite = (hook: PostWriteHook) =>
    createMiddleware<AppEnv>(async (c, next) => {
        await next();
        if (!WRITE_METHODS.includes(c.req.method) || !c.res.ok) return;
        const catalog = await runHook(hook, c);
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
