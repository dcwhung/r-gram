/*
 * rebuildCatalog()（Technical Spec API-061、「核心原則 1」）：每個成功嘅寫入之後（api/afterWrite.ts）同重試 endpoint 行。
 * D1 → document → parseCatalogDocument() → 內容 hash 同 R2 而家嗰份一樣就唔寫 → 寫 R2 catalog.json → catalog_state。
 *
 * 同時有兩個寫入（並發）：
 * - 每次嘗試先讀 R2 而家嗰份（etag），之後先讀 D1；寫 R2 用條件寫入：嗰份仲係啱先讀嗰份先寫得入。
 *   期間有另一個生成寫咗 → 由讀 D1 重新嚟過（最多 CATALOG_WRITE_ATTEMPTS 次）。
 *   所以寫得入嘅一份，一定係喺上一份生效之後先讀 D1 砌出嚟：舊嘅 document 永遠蓋唔到新嘅
 * - 每個請求自己嘅 D1 寫入喺生成開始之前已經完成，所以佢成功返回時，生效嗰份已經包括佢嘅修改
 * 失敗（validator 唔收、R2 寫唔到、重試用完）：唔掂 R2（上一份照用），catalog_state 記 failed、保留上一份嘅值。
 * log 只寫失敗種類同結構位置（例如 albums[3].accent），唔寫內容
 */
import { parseCatalogDocument, type CatalogDocument } from '@r-gram/catalog';
import { CATALOG_JSON_KEY, CATALOG_WRITE_ATTEMPTS, ERROR_CODE, JSON_CONTENT_TYPE } from '../config';
import type { Env } from '../env';
import { sha256Hex } from '../lib/crypto';
import { buildContent, buildDocument, catalogBases } from './buildDocument';
import { readCatalogSnapshot } from './snapshot';
import {
    recordFailure,
    recordSuccess,
    type CatalogFailure,
    type CatalogStatus,
    type LiveCatalog,
} from './state';

export type RebuildEnv = Pick<Env, 'DB' | 'CATALOG' | 'MEDIA_BASE' | 'WORKER_ORIGIN'>;

/** API-061 嘅回應：CatalogStatus + 今次有冇寫 R2 */
export type RebuildResult = CatalogStatus & { unchanged: boolean };

interface Prepared {
    json: string;
    live: LiveCatalog;
}

type Outcome =
    | { kind: 'written' | 'unchanged'; live: LiveCatalog }
    | { kind: 'conflict' }
    | { kind: 'failed'; error: CatalogFailure };

const trackCountOf = (document: CatalogDocument) =>
    document.albums.reduce((total, album) => total + album.tracks.length, 0);

/** D1 → 驗證過嘅 document；validator 唔收 → INVALID_DOCUMENT */
const prepare = async (
    env: RebuildEnv,
    generatedAt: string,
): Promise<Prepared | CatalogFailure> => {
    const content = buildContent(await readCatalogSnapshot(env.DB), catalogBases(env));
    const parsed = parseCatalogDocument(buildDocument(content, generatedAt));
    if (!parsed.ok) {
        const [first] = parsed.errors;
        console.error('[catalog] invalid document', parsed.errors.length, first?.path, first?.code);
        return ERROR_CODE.invalidDocument;
    }
    const { document } = parsed;
    const hash = await sha256Hex(JSON.stringify(content));
    const albumCount = document.albums.length;
    const live = { hash, generatedAt, albumCount, trackCount: trackCountOf(document) };
    return { json: JSON.stringify(document), live };
};

/** 讀 R2 嗰陣冇 catalog.json → 寫入時都要仲未有 */
const unchangedSince = (live: R2Object | null): R2PutOptions['onlyIf'] =>
    live ? { etagMatches: live.etag } : new Headers({ 'If-None-Match': '*' });

/** 一次嘗試：讀 R2 而家嗰份 → 讀 D1 → 一樣就唔寫，唔一樣就條件寫入 */
const attempt = async (env: RebuildEnv): Promise<Outcome> => {
    const current = await env.CATALOG.head(CATALOG_JSON_KEY);
    const prepared = await prepare(env, new Date().toISOString());
    if (typeof prepared === 'string') return { kind: 'failed', error: prepared };
    const { json, live } = prepared;
    const stored = current?.customMetadata;
    if (stored?.hash === live.hash) {
        // 內容冇變：生效嗰份嘅生成時間唔變（ETag 亦唔變）
        return {
            kind: 'unchanged',
            live: { ...live, generatedAt: stored.generatedAt ?? live.generatedAt },
        };
    }
    const written = await env.CATALOG.put(CATALOG_JSON_KEY, json, {
        httpMetadata: { contentType: JSON_CONTENT_TYPE },
        customMetadata: { hash: live.hash, generatedAt: live.generatedAt },
        onlyIf: unchangedSince(current),
    });
    // put 回 null = 條件唔啱（期間另一個生成寫咗）
    return written ? { kind: 'written', live } : { kind: 'conflict' };
};

/** R2 / D1 出錯（throw）當寫入失敗：上一份 catalog.json 照用 */
const safeAttempt = async (env: RebuildEnv): Promise<Outcome> => {
    try {
        return await attempt(env);
    } catch (error) {
        const name = error instanceof Error ? error.name : typeof error;
        console.error('[catalog] generation step failed', name);
        return { kind: 'failed', error: ERROR_CODE.catalogWriteFailed };
    }
};

const settle = async (env: RebuildEnv): Promise<Exclude<Outcome, { kind: 'conflict' }>> => {
    for (let round = 0; round < CATALOG_WRITE_ATTEMPTS; round += 1) {
        const outcome = await safeAttempt(env);
        if (outcome.kind !== 'conflict') return outcome;
    }
    console.error('[catalog] gave up after concurrent writes', CATALOG_WRITE_ATTEMPTS);
    return { kind: 'failed', error: ERROR_CODE.catalogWriteFailed };
};

/** `actor`：admin email（或者 seed），寫入 catalog_state.updated_by */
export const rebuildCatalog = async (env: RebuildEnv, actor: string): Promise<RebuildResult> => {
    const outcome = await settle(env);
    const stamp = { updatedAt: new Date().toISOString(), actor };
    if (outcome.kind === 'failed') {
        return { ...(await recordFailure(env.DB, outcome.error, stamp)), unchanged: false };
    }
    await recordSuccess(env.DB, outcome.live, stamp);
    const unchanged = outcome.kind === 'unchanged';
    return { ok: true, ...outcome.live, updatedAt: stamp.updatedAt, error: null, unchanged };
};

/** 回應入面嘅 `catalog`（寫入回應同 GET /api/albums 同一個形狀，冇 unchanged） */
export const statusOf = ({ unchanged: _unchanged, ...status }: RebuildResult): CatalogStatus =>
    status;
