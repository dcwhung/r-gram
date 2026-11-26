import { CATALOG_FETCH_TIMEOUT_MS } from '../config/limits';
import { CATALOG_STORAGE_KEY } from '../config/storageKeys';
import { browserStorage, defaultCatalogDeps, readCatalogUrl } from './defaultDeps';
import { loadCatalog } from './loader';
import { FIXTURE_CATALOG_URL, jsonResponse, sampleDocument } from './testing/catalogFixtures';

describe('readCatalogUrl', () => {
    it('should read VITE_CATALOG_URL', () => {
        expect(readCatalogUrl({ VITE_CATALOG_URL: FIXTURE_CATALOG_URL })).toBe(FIXTURE_CATALOG_URL);
    });

    // T-113：同一個部署入面嘅檔（public/test-catalog）用根相對路徑，fetch 按頁面 origin 解析
    it('should accept a root-relative URL', () => {
        const url = '/test-catalog/catalog.json';
        expect(readCatalogUrl({ VITE_CATALOG_URL: url })).toBe(url);
    });

    it.each([undefined, '', '   '])('should return null for %j', (value) => {
        expect(readCatalogUrl({ VITE_CATALOG_URL: value })).toBeNull();
    });
});

describe('browserStorage', () => {
    afterEach(() => vi.restoreAllMocks());

    it('should return localStorage when it is available', () => {
        expect(browserStorage()).toBe(globalThis.localStorage);
    });

    it('should return null when reading localStorage throws (blocked site data)', () => {
        vi.spyOn(globalThis, 'localStorage', 'get').mockImplementation(() => {
            throw new DOMException('denied', 'SecurityError');
        });
        expect(browserStorage()).toBeNull();
    });
});

describe('defaultCatalogDeps', () => {
    it('should wire the global fetch, localStorage and the timeout constant', async () => {
        const fresh = sampleDocument();
        const fetchStub = vi.fn(() => Promise.resolve(jsonResponse(fresh)));
        vi.stubGlobal('fetch', fetchStub);
        const deps = { ...defaultCatalogDeps(), url: FIXTURE_CATALOG_URL };
        expect(deps.timeoutMs).toBe(CATALOG_FETCH_TIMEOUT_MS);
        await expect(loadCatalog(deps)).resolves.toMatchObject({ source: 'network' });
        expect(fetchStub).toHaveBeenCalledOnce();
        expect(localStorage.getItem(CATALOG_STORAGE_KEY)).not.toBeNull();
    });
});
