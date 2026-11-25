/*
 * Catalog loader（Technical Spec 數據流 A、API-070；Functional Spec US-001、FR-008）：
 *   GET catalog.json ─► parseCatalogDocument() ─► 存本機 ─► ready（network）
 *   任何一步失敗 ─► 本機有上次好嘅 ─► ready（cache，連失敗原因）
 *                  本機都冇        ─► unavailable（Preload 顯示錯誤同重試掣）
 * IO（fetch、storage）由外面注入，呢度冇網絡、冇 DOM，可以直接 unit test。
 *
 * 唔自己加 `If-None-Match`：加咗就唔係 CORS「簡單請求」，每次都要 preflight。
 * `max-age=60` + ETag 嘅重新驗證交畀瀏覽器 HTTP cache 做（佢自己帶 ETag，304 會變返 200 畀我哋）。
 */
import { type CatalogDocument, parseCatalogDocument } from '@r-gram/catalog';
import type { CatalogStore } from './catalogStore';

/** 點解冇用到網絡嗰份 */
export type CatalogFailure = 'notConfigured' | 'network' | 'timeout' | 'http' | 'invalid';

export type CatalogLoadResult =
    | { status: 'ready'; source: 'network'; document: CatalogDocument }
    | { status: 'ready'; source: 'cache'; document: CatalogDocument; failure: CatalogFailure }
    | { status: 'unavailable'; failure: CatalogFailure };

/** `fetch` 用到嘅部分 */
export type CatalogFetch = (url: string, init: { signal: AbortSignal }) => Promise<Response>;

export interface CatalogLoaderDeps {
    /** `VITE_CATALOG_URL`；null = build 時冇設定（唔請求，直接用本機） */
    url: string | null;
    fetch: CatalogFetch;
    store: CatalogStore;
    /** 請求連讀 body 嘅上限 */
    timeoutMs: number;
}

type FetchOutcome =
    | { ok: true; document: CatalogDocument; etag: string | null }
    | { ok: false; failure: CatalogFailure };

const fail = (failure: CatalogFailure): FetchOutcome => ({ ok: false, failure });

/** 讀 body 同驗證；JSON 都唔係 = invalid */
const readDocument = async (response: Response): Promise<FetchOutcome> => {
    if (!response.ok) return fail('http');
    let body: unknown;
    try {
        body = await response.json();
    } catch {
        return fail('invalid');
    }
    const parsed = parseCatalogDocument(body);
    if (!parsed.ok) return fail('invalid');
    return { ok: true, document: parsed.document, etag: response.headers.get('ETag') };
};

/** 請求 + 讀 body，超時就 abort；abort 引致嘅錯一律當 timeout */
const fetchDocument = async (url: string, deps: CatalogLoaderDeps): Promise<FetchOutcome> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), deps.timeoutMs);
    try {
        return await readDocument(await deps.fetch(url, { signal: controller.signal }));
    } catch {
        return fail(controller.signal.aborted ? 'timeout' : 'network');
    } finally {
        clearTimeout(timer);
    }
};

const fallBack = (store: CatalogStore, failure: CatalogFailure): CatalogLoadResult => {
    const cached = store.read();
    return cached
        ? { status: 'ready', source: 'cache', document: cached.document, failure }
        : { status: 'unavailable', failure };
};

/** 載入 catalog。永遠 resolve（唔 reject）：結果入面講明用咗邊份、點解 */
export const loadCatalog = async (deps: CatalogLoaderDeps): Promise<CatalogLoadResult> => {
    if (deps.url === null) return fallBack(deps.store, 'notConfigured');
    const outcome = await fetchDocument(deps.url, deps);
    if (!outcome.ok) return fallBack(deps.store, outcome.failure);
    deps.store.write({ etag: outcome.etag, document: outcome.document });
    return { status: 'ready', source: 'network', document: outcome.document };
};
