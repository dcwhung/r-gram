import { CATALOG_STORAGE_KEY } from '../config/storageKeys';
import { createCatalogStore } from './catalogStore';
import { memoryStorage, sampleDocument } from './testing/catalogFixtures';

describe('createCatalogStore', () => {
    it('should use the storage key from the Technical Spec', () => {
        expect(CATALOG_STORAGE_KEY).toBe('rgram.catalog.v1');
    });

    it('should return null when nothing has been stored', () => {
        expect(createCatalogStore(memoryStorage()).read()).toBeNull();
    });

    it('should read back what it wrote as { etag, document }', () => {
        const storage = memoryStorage();
        const store = createCatalogStore(storage);
        const entry = { etag: '"abc"', document: sampleDocument() };
        store.write(entry);
        expect(JSON.parse(storage.items.get(CATALOG_STORAGE_KEY) ?? '')).toEqual(entry);
        expect(store.read()).toEqual(entry);
    });

    it('should keep a null etag', () => {
        const store = createCatalogStore(memoryStorage());
        store.write({ etag: null, document: sampleDocument() });
        expect(store.read()?.etag).toBeNull();
    });

    it.each([
        ['broken JSON', '{"etag":'],
        ['not an object', '[1,2]'],
        ['an etag that is not a string', JSON.stringify({ etag: 1, document: sampleDocument() })],
        ['a missing document', JSON.stringify({ etag: '"abc"' })],
        [
            'a document that fails the validator',
            JSON.stringify({ etag: null, document: { ...sampleDocument(), version: 2 } }),
        ],
    ])('should treat %s as nothing stored', (_label, raw) => {
        const store = createCatalogStore(memoryStorage({ [CATALOG_STORAGE_KEY]: raw }));
        expect(store.read()).toBeNull();
    });

    it('should treat a storage that throws on read as nothing stored', () => {
        const storage = memoryStorage();
        storage.getItem = () => {
            throw new DOMException('denied', 'SecurityError');
        };
        expect(createCatalogStore(storage).read()).toBeNull();
    });

    it('should not throw when writing fails (quota exceeded)', () => {
        const storage = memoryStorage();
        storage.setItem = () => {
            throw new DOMException('full', 'QuotaExceededError');
        };
        const store = createCatalogStore(storage);
        expect(() => store.write({ etag: null, document: sampleDocument() })).not.toThrow();
    });

    it('should read nothing and write nothing without a storage', () => {
        const store = createCatalogStore(null);
        expect(() => store.write({ etag: null, document: sampleDocument() })).not.toThrow();
        expect(store.read()).toBeNull();
    });
});
