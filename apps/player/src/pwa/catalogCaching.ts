/*
 * Service Worker 執行期 cache：catalog 嘅圖片同歌詞（backlog B-071 ①、③；Functional Spec FR-042 離線；
 * Technical Spec「性能考量」：圖片、歌詞 CacheFirst）。兩樣都喺 Worker（另一個 origin）、內容 hash 檔名、
 * `immutable`，所以第一次攞到就可以一直用。catalog.json 唔喺度：佢要 max-age=60 + ETag 重新驗證。
 * 純資料：vite.config.ts（Node）同測試都用。
 */
import { CATALOG_IMAGE_CACHE_MAX_ENTRIES, LYRICS_CACHE_MAX_ENTRIES } from '../config/limits';

export const CATALOG_IMAGE_CACHE = 'r-gram-catalog-img';
export const LYRICS_CACHE = 'r-gram-catalog-lyrics';

const HTTP_OK = 200;

/**
 * 跨 origin 嘅網址：Workbox 只認由網址開頭對起嘅 RegExp，所以連 `https://<主機>` 一齊寫。
 * 只收 https（catalog validator 都只收 https 嘅 base）。
 */
const workerPath = (prefix: string) => new RegExp(`^https://[^/]+${prefix}`);

const cacheFirst = (prefix: string, cacheName: string, maxEntries: number) => ({
    urlPattern: workerPath(prefix),
    handler: 'CacheFirst' as const,
    options: {
        cacheName,
        expiration: { maxEntries },
        // 只留普通 200 回應（Preload 同背景預載用 cors 攞，backlog B-071 ②）；opaque 回應唔留
        cacheableResponse: { statuses: [HTTP_OK] },
        // Worker 回 `Vary: Origin`：<image> 元素嘅請求冇 Origin header，唔理 Vary 先對得返 cors 攞嗰份
        matchOptions: { ignoreVary: true },
    },
});

export const catalogCaching = () => [
    cacheFirst('/catalog/v1/img/', CATALOG_IMAGE_CACHE, CATALOG_IMAGE_CACHE_MAX_ENTRIES),
    cacheFirst('/catalog/v1/lyrics/', LYRICS_CACHE, LYRICS_CACHE_MAX_ENTRIES),
];
