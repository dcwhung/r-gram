import { CATALOG_IMAGE_CACHE_MAX_ENTRIES, LYRICS_CACHE_MAX_ENTRIES } from '../config/limits';
import { catalogCaching } from './catalogCaching';

const WORKER = 'https://r-gram-api.example.workers.dev';

const ruleFor = (url: string) => catalogCaching().find((rule) => rule.urlPattern.test(url));

/*
 * Backlog B-071 ①、③（Functional Spec FR-042 離線；Technical Spec「性能考量」：圖片、歌詞 CacheFirst）：
 * catalog 嘅圖片同歌詞係內容 hash 檔名（immutable），第一次攞到就留低，離線都用到。
 */
describe('catalogCaching', () => {
    it.each([
        [`${WORKER}/catalog/v1/img/0123456789abcdef.webp`, CATALOG_IMAGE_CACHE_MAX_ENTRIES],
        [`${WORKER}/catalog/v1/lyrics/0123456789abcdef.json`, LYRICS_CACHE_MAX_ENTRIES],
    ])('should keep %s cache-first with an entry limit', (url, maxEntries) => {
        const rule = ruleFor(url);
        expect(rule?.handler).toBe('CacheFirst');
        expect(rule?.options.expiration.maxEntries).toBe(maxEntries);
    });

    // catalog.json 要 max-age=60 + ETag 重新驗證（Technical Spec「Catalog」），唔可以 cache-first
    it.each([
        `${WORKER}/catalog/v1/catalog.json`,
        `${WORKER}/api/albums`,
        'http://insecure.example/catalog/v1/img/0123456789abcdef.webp',
        `${WORKER}/other/catalog/v1/img/0123456789abcdef.webp`,
    ])('should leave %s alone', (url) => {
        expect(ruleFor(url)).toBeUndefined();
    });

    // 只 cache 普通 200 回應；Worker 回 `Vary: Origin`，<image> 嘅請求冇 Origin header 都要對到 cors 攞返嚟嗰份
    it('should cache only complete responses and match them whatever the Origin header', () => {
        catalogCaching().forEach((rule) => {
            expect(rule.options.cacheableResponse).toEqual({ statuses: [200] });
            expect(rule.options.matchOptions).toEqual({ ignoreVary: true });
        });
    });

    it('should give each kind of file its own cache', () => {
        const names = catalogCaching().map((rule) => rule.options.cacheName);
        expect(new Set(names).size).toBe(names.length);
    });
});
