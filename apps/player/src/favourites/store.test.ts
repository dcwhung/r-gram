import { memoryStorage } from '../catalog/testing/catalogFixtures';
import { FAVOURITES_STORAGE_KEY } from '../config/storageKeys';
import { createFavouritesStore, type FavouriteEntry } from './store';

const clock = (start = 1000) => {
    let time = start;
    return () => {
        time += 1;
        return time;
    };
};

const stored = (entries: readonly FavouriteEntry[]) => ({
    [FAVOURITES_STORAGE_KEY]: JSON.stringify(entries),
});

const ids = (entries: readonly FavouriteEntry[]) => entries.map((entry) => entry.trackId);

describe('createFavouritesStore', () => {
    it('should start empty when nothing is stored', () => {
        const store = createFavouritesStore({ storage: memoryStorage() });
        expect(store.getSnapshot()).toEqual([]);
        expect(store.has('a-01')).toBe(false);
    });

    it('should add tracks in the order they were favourited and write them to storage', () => {
        const storage = memoryStorage();
        const store = createFavouritesStore({ storage, now: clock() });
        store.add('b-02');
        store.add('a-01');
        expect(store.getSnapshot()).toEqual([
            { trackId: 'b-02', addedAt: 1001 },
            { trackId: 'a-01', addedAt: 1002 },
        ]);
        expect(JSON.parse(storage.getItem(FAVOURITES_STORAGE_KEY) ?? '')).toEqual(
            store.getSnapshot(),
        );
    });

    it('should survive a reload (a new store over the same storage)', () => {
        const storage = memoryStorage();
        createFavouritesStore({ storage, now: clock() }).add('a-01');
        const reloaded = createFavouritesStore({ storage });
        expect(reloaded.has('a-01')).toBe(true);
    });

    it('should not add the same track twice', () => {
        const store = createFavouritesStore({ storage: memoryStorage(), now: clock() });
        store.add('a-01');
        const before = store.getSnapshot();
        store.add('a-01');
        expect(store.getSnapshot()).toBe(before);
    });

    it('should remove a track and return the removed entry', () => {
        const store = createFavouritesStore({ storage: memoryStorage(), now: clock() });
        store.add('a-01');
        store.add('b-02');
        expect(store.remove('a-01')).toEqual({ trackId: 'a-01', addedAt: 1001 });
        expect(ids(store.getSnapshot())).toEqual(['b-02']);
        expect(store.remove('zz-99')).toBeNull();
    });

    it('should put a track favourited again at the end (a new favourite time)', () => {
        const store = createFavouritesStore({ storage: memoryStorage(), now: clock() });
        store.add('a-01');
        store.add('b-02');
        store.remove('a-01');
        store.add('a-01');
        expect(ids(store.getSnapshot())).toEqual(['b-02', 'a-01']);
    });

    it('should keep an explicit favourite time (undoing a removal puts it back in place)', () => {
        const store = createFavouritesStore({ storage: memoryStorage(), now: clock() });
        store.add('a-01');
        store.add('b-02');
        const removed = store.remove('a-01');
        store.add('a-01', removed?.addedAt);
        expect(ids(store.getSnapshot())).toEqual(['a-01', 'b-02']);
    });

    it('should notify subscribers on every change and stop after unsubscribe', () => {
        const store = createFavouritesStore({ storage: memoryStorage(), now: clock() });
        const listener = vi.fn();
        const stop = store.subscribe(listener);
        store.add('a-01');
        store.remove('a-01');
        stop();
        store.add('b-02');
        expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should sort stored entries by favourite time', () => {
        const storage = memoryStorage(
            stored([
                { trackId: 'b-02', addedAt: 20 },
                { trackId: 'a-01', addedAt: 10 },
            ]),
        );
        expect(ids(createFavouritesStore({ storage }).getSnapshot())).toEqual(['a-01', 'b-02']);
    });

    it.each([
        ['not JSON', '{oops'],
        ['not an array', '{"trackId":"a-01","addedAt":1}'],
        ['null', 'null'],
    ])('should treat a corrupt record (%s) as empty', (_name, raw) => {
        const storage = memoryStorage({ [FAVOURITES_STORAGE_KEY]: raw });
        expect(createFavouritesStore({ storage }).getSnapshot()).toEqual([]);
    });

    it('should drop malformed and duplicate entries but keep the valid ones', () => {
        const raw = JSON.stringify([
            { trackId: 'a-01', addedAt: 1 },
            { trackId: '', addedAt: 2 },
            { trackId: 'b-02', addedAt: 'soon' },
            { trackId: 'c-03', addedAt: Number.MAX_VALUE * 10 },
            'd-04',
            null,
            { trackId: 'a-01', addedAt: 3 },
            { trackId: 'e-05', addedAt: 4 },
        ]);
        const storage = memoryStorage({ [FAVOURITES_STORAGE_KEY]: raw });
        expect(createFavouritesStore({ storage }).getSnapshot()).toEqual([
            { trackId: 'a-01', addedAt: 1 },
            { trackId: 'e-05', addedAt: 4 },
        ]);
    });

    it('should work in memory when storage is blocked (null, or reads and writes throw)', () => {
        const throwing = {
            getItem: () => {
                throw new Error('SecurityError');
            },
            setItem: () => {
                throw new Error('QuotaExceededError');
            },
        };
        for (const storage of [null, throwing]) {
            const store = createFavouritesStore({ storage, now: clock() });
            store.add('a-01');
            expect(store.has('a-01')).toBe(true);
        }
    });

    it('should pick up a change made in another tab (storage event for its key)', () => {
        const storage = memoryStorage();
        const events = new EventTarget();
        const store = createFavouritesStore({ storage, events });
        const listener = vi.fn();
        store.subscribe(listener);
        storage.setItem(FAVOURITES_STORAGE_KEY, JSON.stringify([{ trackId: 'a-01', addedAt: 5 }]));
        events.dispatchEvent(Object.assign(new Event('storage'), { key: 'other' }));
        expect(listener).not.toHaveBeenCalled();
        events.dispatchEvent(Object.assign(new Event('storage'), { key: FAVOURITES_STORAGE_KEY }));
        expect(store.has('a-01')).toBe(true);
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should read again when another tab clears all storage (key null)', () => {
        const storage = memoryStorage();
        const events = new EventTarget();
        const store = createFavouritesStore({ storage, events, now: clock() });
        store.add('a-01');
        storage.items.clear();
        events.dispatchEvent(Object.assign(new Event('storage'), { key: null }));
        expect(store.getSnapshot()).toEqual([]);
    });
});
