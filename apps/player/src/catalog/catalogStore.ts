/*
 * 本機 catalog 副本（localStorage `rgram.catalog.v1` = `{ etag, document }`）。
 * 讀出嚟嗰份照樣行 `parseCatalogDocument()`：壞咗、舊版 app 留低嘅、被人改過嘅，一律當冇。
 * Storage 拋錯（私隱模式、封鎖網站資料、爆 quota）都唔會傳出去：最多係冇 fallback。
 */
import { type CatalogDocument, parseCatalogDocument } from '@r-gram/catalog';
import { CATALOG_STORAGE_KEY } from '../config/storageKeys';

/** `localStorage` 用到嘅部分（唔用 DOM 嘅 `Storage` 型別：Node 測試都用得） */
export interface KeyValueStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

export interface CachedCatalog {
    /** 回應嘅 `ETag` header；冇就 null */
    etag: string | null;
    document: CatalogDocument;
}

export interface CatalogStore {
    read(): CachedCatalog | null;
    write(entry: CachedCatalog): void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/** 驗 `{ etag, document }` 嘅 shape，document 經 validator */
const toCachedCatalog = (value: unknown): CachedCatalog | null => {
    if (!isRecord(value)) return null;
    const { etag } = value;
    if (etag !== null && typeof etag !== 'string') return null;
    const parsed = parseCatalogDocument(value.document);
    return parsed.ok ? { etag, document: parsed.document } : null;
};

const readEntry = (storage: KeyValueStorage, key: string): CachedCatalog | null => {
    try {
        const raw = storage.getItem(key);
        return raw === null ? null : toCachedCatalog(JSON.parse(raw));
    } catch {
        return null;
    }
};

const writeEntry = (storage: KeyValueStorage, key: string, entry: CachedCatalog): void => {
    try {
        storage.setItem(key, JSON.stringify(entry));
    } catch {
        // 寫唔到（爆 quota 等）：今次照用網絡嗰份，只係下次冇 fallback
    }
};

/** `storage` 係 null（瀏覽器唔畀用）時：讀永遠係冇，寫乜都唔做 */
export const createCatalogStore = (
    storage: KeyValueStorage | null,
    key: string = CATALOG_STORAGE_KEY,
): CatalogStore => ({
    read: () => (storage ? readEntry(storage, key) : null),
    write: (entry) => {
        if (storage) writeEntry(storage, key, entry);
    },
});
