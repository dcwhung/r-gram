/*
 * rebuildCatalog()（Technical Spec API-061、「核心原則 1」）：每個成功嘅寫入之後（api/afterWrite.ts）同重試 endpoint 行。
 * D1 → document → parseCatalogDocument() → 內容 hash 同 R2 而家嗰份一樣就唔寫 → 寫 R2 catalog.json → catalog_state。
 *
 * 同時有兩個寫入（並發）：
 * - 每次嘗試先讀 R2 而家嗰份（etag），之後先讀 D1；寫 R2 用條件寫入：嗰份仲係啱先讀嗰份先寫得入。
 *   期間有另一個生成寫咗 → 由讀 D1 重新嚟過（最多 CATALOG_WRITE_ATTEMPTS 次）
 * - 「冇變」嘅一輪唔寫 R2，etag 唔郁，所以一個讀 D1 比較早嘅生成之後條件寫入照啱，會寫入舊內容
 *  （A→B→A，review W-020）。所以寫入之後再讀一次 D1：內容 hash 唔同啱啱寫嗰份 → 再嚟一輪（同一個上限）
 * 保證：回 ok: true 嗰陣，生效嗰份 = 寫入之後（或者「冇變」嗰陣）D1 嘅內容，已經包括呢個請求自己嘅 D1 修改
 *（佢喺生成開始之前已經完成）；之後蓋過佢嘅條件寫入一定係喺佢之後先讀 R2、再讀 D1，所以都包括。
 * 「冇變」之後一個舊生成可以短暫蓋過，但嗰個舊生成寫完再讀 D1 會發現，喺上限之內寫返新嘅，
 * 上限用完就記 failed（管理端出重試），永遠唔會記 ok。
 * 剩低嘅缺口：舊生成寫完、未再讀 D1 之前 Worker 被中止（冇 code 再行）：生效嗰份係舊嘅、catalog_state 仲係 ok，
 * 直到下一次儲存或者重試
 * 失敗（validator 唔收、R2 寫唔到、重試用完）：catalog_state 記 failed、保留上一份嘅值；R2 冇寫或者最後寫入嘅唔係最新。
 * log 只寫失敗種類同結構位置（例如 albums[3].accent），唔寫內容
 */
import { parseCatalogDocument, type CatalogDocument } from '@r-gram/catalog';
import { CATALOG_JSON_KEY, CATALOG_WRITE_ATTEMPTS, ERROR_CODE, JSON_CONTENT_TYPE } from '../config';
import type { Env } from '../env';
import { sha256Hex } from '../lib/crypto';
import { buildContent, buildDocument, catalogBases, type CatalogContent } from './buildDocument';
import { locateIssues, type CatalogIssue } from './issues';
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

/** details：INVALID_DOCUMENT 嘅位置（S-092） */
interface Failed {
    kind: 'failed';
    error: CatalogFailure;
    details?: readonly CatalogIssue[];
}

/** conflict：條件寫入唔啱；superseded：寫咗，但寫完 D1 已經唔係嗰份內容。兩種都由頭再嚟 */
type Outcome =
    | { kind: 'written' | 'unchanged'; live: LiveCatalog }
    | { kind: 'conflict' | 'superseded' }
    | Failed;

type Settled = Exclude<Outcome, { kind: 'conflict' | 'superseded' }>;

const trackCountOf = (document: CatalogDocument) =>
    document.albums.reduce((total, album) => total + album.tracks.length, 0);

const contentOf = async (env: RebuildEnv): Promise<CatalogContent> =>
    buildContent(await readCatalogSnapshot(env.DB), catalogBases(env));

/** hash 只計內容（唔計 generatedAt） */
const hashOf = (content: CatalogContent): Promise<string> => sha256Hex(JSON.stringify(content));

/** D1 → 驗證過嘅 document；validator 唔收 → INVALID_DOCUMENT + 位置（id + 欄名，冇內容） */
const prepare = async (env: RebuildEnv, generatedAt: string): Promise<Prepared | Failed> => {
    const content = await contentOf(env);
    const built = buildDocument(content, generatedAt);
    const parsed = parseCatalogDocument(built);
    if (!parsed.ok) {
        const [first] = parsed.errors;
        console.error('[catalog] invalid document', parsed.errors.length, first?.path, first?.code);
        const details = locateIssues(built, parsed.errors);
        return { kind: 'failed', error: ERROR_CODE.invalidDocument, details };
    }
    const { document } = parsed;
    const hash = await hashOf(content);
    const albumCount = document.albums.length;
    const live = { hash, generatedAt, albumCount, trackCount: trackCountOf(document) };
    return { json: JSON.stringify(document), live };
};

/** 讀 R2 嗰陣冇 catalog.json → 寫入時都要仲未有 */
const unchangedSince = (live: R2Object | null): R2PutOptions['onlyIf'] =>
    live ? { etagMatches: live.etag } : new Headers({ 'If-None-Match': '*' });

/** 寫入之後再讀 D1：仲係啱啱寫嗰份內容？（W-020） */
const stillCurrent = async (env: RebuildEnv, hash: string): Promise<boolean> =>
    (await hashOf(await contentOf(env))) === hash;

/** 一次嘗試：讀 R2 而家嗰份 → 讀 D1 → 一樣就唔寫，唔一樣就條件寫入 → 再讀 D1 核對 */
const attempt = async (env: RebuildEnv): Promise<Outcome> => {
    const current = await env.CATALOG.head(CATALOG_JSON_KEY);
    const prepared = await prepare(env, new Date().toISOString());
    if ('kind' in prepared) return prepared;
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
    if (!written) return { kind: 'conflict' };
    return (await stillCurrent(env, live.hash))
        ? { kind: 'written', live }
        : { kind: 'superseded' };
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

const isSettled = (outcome: Outcome): outcome is Settled =>
    outcome.kind !== 'conflict' && outcome.kind !== 'superseded';

const settle = async (env: RebuildEnv): Promise<Settled> => {
    for (let round = 0; round < CATALOG_WRITE_ATTEMPTS; round += 1) {
        const outcome = await safeAttempt(env);
        if (isSettled(outcome)) return outcome;
    }
    console.error('[catalog] gave up after concurrent writes', CATALOG_WRITE_ATTEMPTS);
    return { kind: 'failed', error: ERROR_CODE.catalogWriteFailed };
};

/** `actor`：admin email，寫入 catalog_state.updated_by */
export const rebuildCatalog = async (env: RebuildEnv, actor: string): Promise<RebuildResult> => {
    const outcome = await settle(env);
    const stamp = { updatedAt: new Date().toISOString(), actor };
    if (outcome.kind === 'failed') {
        const status = await recordFailure(env.DB, outcome.error, stamp);
        const { details } = outcome;
        return { ...status, unchanged: false, ...(details && { details }) };
    }
    await recordSuccess(env.DB, outcome.live, stamp);
    const unchanged = outcome.kind === 'unchanged';
    return { ok: true, ...outcome.live, updatedAt: stamp.updatedAt, error: null, unchanged };
};

/** 回應入面嘅 `catalog`（寫入回應同 GET /api/albums 同一個形狀，冇 unchanged） */
export const statusOf = ({ unchanged: _unchanged, ...status }: RebuildResult): CatalogStatus =>
    status;
