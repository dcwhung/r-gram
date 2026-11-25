import type { CatalogDocument } from '@r-gram/catalog';
import { CATALOG_FETCH_TIMEOUT_MS } from '../config/limits';
import { createCatalogStore } from './catalogStore';
import { type CatalogFetch, type CatalogLoaderDeps, loadCatalog } from './loader';
import {
    FIXTURE_CATALOG_URL,
    jsonResponse,
    memoryStorage,
    preCategoryDocument,
    sampleDocument,
} from './testing/catalogFixtures';
import { CATALOG_STORAGE_KEY } from '../config/storageKeys';

const CACHED_AT = '2026-11-20T00:00:00.000Z';
const FRESH_AT = '2026-11-25T08:00:00.000Z';

const setup = (fetchImpl: CatalogFetch, cached?: CatalogDocument) => {
    const store = createCatalogStore(memoryStorage());
    if (cached) store.write({ etag: '"old"', document: cached });
    const deps: CatalogLoaderDeps = {
        url: FIXTURE_CATALOG_URL,
        fetch: vi.fn(fetchImpl),
        store,
        timeoutMs: CATALOG_FETCH_TIMEOUT_MS,
    };
    return { deps, store };
};

/** 一個永遠唔回應嘅請求：只會喺 signal abort 時失敗（同瀏覽器一樣） */
const hangingFetch: CatalogFetch = (_url, init) =>
    new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
        );
    });

/** Header 即刻到，但 body 永遠讀唔完：`json()` 只會喺 signal abort 時失敗 */
const stalledBodyFetch: CatalogFetch = (_url, init) => {
    const response = jsonResponse(sampleDocument(FRESH_AT));
    vi.spyOn(response, 'json').mockImplementation(
        () =>
            new Promise((_resolve, reject) => {
                init.signal.addEventListener('abort', () =>
                    reject(new DOMException('aborted', 'AbortError')),
                );
            }),
    );
    return Promise.resolve(response);
};

describe('loadCatalog', () => {
    // S-048：「永遠 resolve」唔可以靠注入嘅 store 守規矩
    it('should still resolve when the store fails to save the fetched document', async () => {
        const fresh = sampleDocument(FRESH_AT);
        const { deps } = setup(() => Promise.resolve(jsonResponse(fresh)));
        deps.store = {
            read: () => null,
            write: () => {
                throw new Error('quota');
            },
        };
        await expect(loadCatalog(deps)).resolves.toMatchObject({ source: 'network' });
    });

    it('should fetch the catalog URL and return the validated document', async () => {
        const fresh = sampleDocument(FRESH_AT);
        const { deps } = setup(() => Promise.resolve(jsonResponse(fresh)));
        await expect(loadCatalog(deps)).resolves.toEqual({
            status: 'ready',
            source: 'network',
            document: fresh,
        });
        expect(deps.fetch).toHaveBeenCalledWith(FIXTURE_CATALOG_URL, expect.anything());
    });

    it('should store the fetched document with its ETag for next time', async () => {
        const fresh = sampleDocument(FRESH_AT);
        const response = jsonResponse(fresh, { headers: { ETag: '"new"' } });
        const { deps, store } = setup(() => Promise.resolve(response), sampleDocument(CACHED_AT));
        await loadCatalog(deps);
        expect(store.read()).toEqual({ etag: '"new"', document: fresh });
    });

    it('should store a null etag when the response has none', async () => {
        const { deps, store } = setup(() => Promise.resolve(jsonResponse(sampleDocument())));
        await loadCatalog(deps);
        expect(store.read()?.etag).toBeNull();
    });

    it.each([
        ['network', () => Promise.reject(new TypeError('offline'))],
        ['http', () => Promise.resolve(jsonResponse({ error: 'NOT_READY' }, { status: 404 }))],
        ['invalid', () => Promise.resolve(jsonResponse('<html>not json</html>'))],
        ['invalid', () => Promise.resolve(jsonResponse({ ...sampleDocument(), version: 2 }))],
    ] as const)(
        'should fall back to the stored copy on a %s failure',
        async (failure, fetchImpl) => {
            const cached = sampleDocument(CACHED_AT);
            const { deps, store } = setup(fetchImpl, cached);
            await expect(loadCatalog(deps)).resolves.toEqual({
                status: 'ready',
                source: 'cache',
                document: cached,
                failure,
            });
            // 失敗唔可以蓋走上一份好嘅
            expect(store.read()?.document).toEqual(cached);
        },
    );

    it('should report unavailable when the fetch fails and nothing is stored', async () => {
        const { deps } = setup(() => Promise.reject(new TypeError('offline')));
        await expect(loadCatalog(deps)).resolves.toEqual({
            status: 'unavailable',
            failure: 'network',
        });
    });

    it('should not fetch without a configured URL and use the stored copy', async () => {
        const cached = sampleDocument(CACHED_AT);
        const { deps } = setup(() => Promise.resolve(jsonResponse(sampleDocument())), cached);
        const result = await loadCatalog({ ...deps, url: null });
        expect(result).toEqual({
            status: 'ready',
            source: 'cache',
            document: cached,
            failure: 'notConfigured',
        });
        expect(deps.fetch).not.toHaveBeenCalled();
    });

    // 舊版 app 留低嘅副本（CR-004 之前、冇類別）驗唔過：當冇，唔可以 throw
    describe('a stored copy from before release categories', () => {
        const oldStore = () =>
            createCatalogStore(
                memoryStorage({
                    [CATALOG_STORAGE_KEY]: JSON.stringify({
                        etag: '"old"',
                        document: preCategoryDocument(CACHED_AT),
                    }),
                }),
            );

        it('should report unavailable instead of using it when the fetch fails', async () => {
            const { deps } = setup(() => Promise.reject(new TypeError('offline')));
            await expect(loadCatalog({ ...deps, store: oldStore() })).resolves.toEqual({
                status: 'unavailable',
                failure: 'network',
            });
        });

        it('should replace it with the fetched document', async () => {
            const fresh = sampleDocument(FRESH_AT);
            const store = oldStore();
            const { deps } = setup(() => Promise.resolve(jsonResponse(fresh)));
            await expect(loadCatalog({ ...deps, store })).resolves.toEqual({
                status: 'ready',
                source: 'network',
                document: fresh,
            });
            expect(store.read()?.document).toEqual(fresh);
        });
    });

    describe('timeout', () => {
        beforeEach(() => vi.useFakeTimers());
        afterEach(() => vi.useRealTimers());

        it('should give up after the timeout and use the stored copy', async () => {
            const cached = sampleDocument(CACHED_AT);
            const { deps } = setup(hangingFetch, cached);
            const pending = loadCatalog(deps);
            await vi.advanceTimersByTimeAsync(CATALOG_FETCH_TIMEOUT_MS);
            await expect(pending).resolves.toEqual({
                status: 'ready',
                source: 'cache',
                document: cached,
                failure: 'timeout',
            });
        });

        it('should not abort a request that answers in time', async () => {
            const fresh = sampleDocument(FRESH_AT);
            const { deps } = setup((_url, init) => {
                const answer = jsonResponse(fresh);
                return init.signal.aborted
                    ? Promise.reject(new Error('aborted'))
                    : Promise.resolve(answer);
            });
            const result = await loadCatalog(deps);
            // 一回應就要清走計時器：未行時間之前就要係 0（S-044）
            expect(vi.getTimerCount()).toBe(0);
            expect(result).toMatchObject({ status: 'ready', source: 'network' });
        });

        // S-043：header 到咗但 body 讀到一半超時，都係 timeout（唔係 invalid）
        it('should report a timeout when the body stalls after the headers arrive', async () => {
            const cached = sampleDocument(CACHED_AT);
            const { deps } = setup(stalledBodyFetch, cached);
            const pending = loadCatalog(deps);
            await vi.advanceTimersByTimeAsync(CATALOG_FETCH_TIMEOUT_MS);
            await expect(pending).resolves.toMatchObject({ source: 'cache', failure: 'timeout' });
        });
    });
});
