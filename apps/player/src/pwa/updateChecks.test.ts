import { isHardReload, startUpdateChecks, UPDATE_CHECK_INTERVAL_MS } from './updateChecks';

const setVisibility = (state: DocumentVisibilityState) =>
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });

describe('startUpdateChecks', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        setVisibility('visible');
    });
    afterEach(() => vi.useRealTimers());

    const start = () => {
        const manager = { checkNow: vi.fn() };
        const stop = startUpdateChecks(manager, { document, window });
        return { manager, stop };
    };

    it('should check once at launch', () => {
        const { manager } = start();
        expect(manager.checkNow).toHaveBeenCalledTimes(1);
    });

    it('should check again when the app comes back to the foreground', () => {
        const { manager } = start();
        setVisibility('hidden');
        document.dispatchEvent(new Event('visibilitychange'));
        expect(manager.checkNow).toHaveBeenCalledTimes(1);
        setVisibility('visible');
        document.dispatchEvent(new Event('visibilitychange'));
        expect(manager.checkNow).toHaveBeenCalledTimes(2);
    });

    it('should check when the page is restored from the back-forward cache', () => {
        const { manager } = start();
        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }));
        expect(manager.checkNow).toHaveBeenCalledTimes(1);
        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
        expect(manager.checkNow).toHaveBeenCalledTimes(2);
    });

    it('should check on an interval while visible only', () => {
        const { manager } = start();
        vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);
        expect(manager.checkNow).toHaveBeenCalledTimes(2);
        setVisibility('hidden');
        vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);
        expect(manager.checkNow).toHaveBeenCalledTimes(2);
    });

    it('should stop listening and checking once stopped', () => {
        const { manager, stop } = start();
        stop();
        document.dispatchEvent(new Event('visibilitychange'));
        vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);
        expect(manager.checkNow).toHaveBeenCalledTimes(1);
    });
});

describe('isHardReload', () => {
    const container = (controller: object | null, state?: ServiceWorkerState) => ({
        controller: controller as ServiceWorker | null,
        getRegistration: () =>
            Promise.resolve(
                state ? ({ active: { state } } as unknown as ServiceWorkerRegistration) : undefined,
            ),
    });

    it('should be false without service worker support or when the page is controlled', async () => {
        await expect(isHardReload(undefined)).resolves.toBe(false);
        await expect(isHardReload(container({}, 'activated'))).resolves.toBe(false);
    });

    it('should be true when an activated worker exists but does not control the page', async () => {
        await expect(isHardReload(container(null, 'activated'))).resolves.toBe(true);
    });

    it('should be false on a first install that is still activating', async () => {
        await expect(isHardReload(container(null, 'activating'))).resolves.toBe(false);
        await expect(isHardReload(container(null))).resolves.toBe(false);
    });

    it('should be false when looking up the registration fails', async () => {
        const failing = {
            controller: null,
            getRegistration: () => Promise.reject(new Error('denied')),
        };
        await expect(isHardReload(failing)).resolves.toBe(false);
    });
});
