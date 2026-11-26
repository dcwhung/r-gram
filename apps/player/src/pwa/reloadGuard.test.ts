import { UPDATE_RELOAD_STORAGE_KEY } from '../config/storageKeys';
import { createReloadGuard, readSessionStorage, RELOAD_LOOP_WINDOW_MS } from './reloadGuard';

const memoryStorage = (initial: Record<string, string> = {}) => {
    const values = new Map(Object.entries(initial));
    return {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => void values.set(key, value),
    };
};

const NOW = 1_000_000;

describe('createReloadGuard', () => {
    it('should allow the first reload of this tab', () => {
        expect(createReloadGuard(memoryStorage(), () => NOW).allow()).toBe(true);
    });

    it('should block a second update reload inside the loop window, even after the page reloaded', () => {
        const storage = memoryStorage();
        createReloadGuard(storage, () => NOW).mark();
        const afterReload = createReloadGuard(storage, () => NOW + RELOAD_LOOP_WINDOW_MS - 1);
        expect(afterReload.allow()).toBe(false);
    });

    it('should allow another reload once the loop window has passed', () => {
        const storage = memoryStorage({ [UPDATE_RELOAD_STORAGE_KEY]: String(NOW) });
        const later = createReloadGuard(storage, () => NOW + RELOAD_LOOP_WINDOW_MS);
        expect(later.allow()).toBe(true);
    });

    it('should ignore a stored time in the future or garbage', () => {
        const future = memoryStorage({ [UPDATE_RELOAD_STORAGE_KEY]: String(NOW + 1) });
        const garbage = memoryStorage({ [UPDATE_RELOAD_STORAGE_KEY]: 'x' });
        expect(createReloadGuard(future, () => NOW).allow()).toBe(true);
        expect(createReloadGuard(garbage, () => NOW).allow()).toBe(true);
    });

    it('should still allow reloading when session storage is missing or throws', () => {
        const broken = {
            getItem: () => {
                throw new Error('blocked');
            },
            setItem: () => {
                throw new Error('blocked');
            },
        };
        expect(createReloadGuard(undefined, () => NOW).allow()).toBe(true);
        const guard = createReloadGuard(broken, () => NOW);
        expect(() => guard.mark()).not.toThrow();
        expect(guard.allow()).toBe(true);
    });
});

describe('readSessionStorage', () => {
    afterEach(() => vi.restoreAllMocks());

    it('should return the tab storage', () => {
        expect(readSessionStorage()).toBe(window.sessionStorage);
    });

    it('should return nothing when the browser refuses access', () => {
        vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
            throw new DOMException('denied', 'SecurityError');
        });
        expect(readSessionStorage()).toBeUndefined();
    });
});
