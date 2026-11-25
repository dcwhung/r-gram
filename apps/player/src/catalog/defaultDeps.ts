/*
 * 瀏覽器入面真正用嘅 loader 依賴：`VITE_CATALOG_URL`、全域 `fetch`、`localStorage`。
 * 分開一個檔：loader 本身唔掂 `import.meta.env` 同 DOM。
 */
import { CATALOG_FETCH_TIMEOUT_MS } from '../config/limits';
import { createCatalogStore, type KeyValueStorage } from './catalogStore';
import type { CatalogLoaderDeps } from './loader';

/** Build 時嘅 catalog 網址；冇設定或者淨係空白 = null */
export const readCatalogUrl = (env: { VITE_CATALOG_URL?: string }): string | null => {
    const url = env.VITE_CATALOG_URL?.trim();
    return url ? url : null;
};

/** 封鎖網站資料時，連讀 `localStorage` 呢個屬性都會拋錯 */
export const browserStorage = (): KeyValueStorage | null => {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
};

export const defaultCatalogDeps = (): CatalogLoaderDeps => ({
    url: readCatalogUrl(import.meta.env),
    // 每次叫都攞返而家嘅全域 fetch（測試會換）
    fetch: (url, init) => globalThis.fetch(url, init),
    store: createCatalogStore(browserStorage()),
    timeoutMs: CATALOG_FETCH_TIMEOUT_MS,
});
