import type { RegisterSWOptions } from 'vite-plugin-pwa/types';
import { startBrowserUpdates, type BrowserUpdateEnv } from './registerUpdates';

const pwa = vi.hoisted(() => ({
    options: undefined as RegisterSWOptions | undefined,
    updateSW: vi.fn(() => Promise.resolve()),
}));

vi.mock('virtual:pwa-register', () => ({
    registerSW: (options: RegisterSWOptions) => {
        pwa.options = options;
        return pwa.updateSW;
    },
}));

/** 假嘅 navigator.serviceWorker：可以發 controllerchange */
const fakeContainer = (controlled: boolean) =>
    Object.assign(new EventTarget(), {
        controller: controlled ? ({} as ServiceWorker) : null,
        getRegistration: () => Promise.resolve(undefined),
    });

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const setup = async (serviceWorker: unknown = fakeContainer(true)) => {
    const env: BrowserUpdateEnv = {
        window,
        document,
        navigator: { onLine: true, serviceWorker } as unknown as Navigator,
        reload: vi.fn(),
        storage: undefined,
    };
    const manager = startBrowserUpdates(env);
    await flush();
    return { env, manager };
};

describe('startBrowserUpdates', () => {
    beforeEach(() => {
        pwa.options = undefined;
        pwa.updateSW.mockClear();
    });

    it('should register the service worker in prompt mode', async () => {
        await setup();
        expect(pwa.options).toMatchObject({ immediate: true });
    });

    it('should check the registration for a new version once registered', async () => {
        await setup();
        const registration = { update: vi.fn(() => Promise.resolve()) };
        pwa.options?.onRegisteredSW?.(
            '/sw.js',
            registration as unknown as ServiceWorkerRegistration,
        );
        expect(registration.update).toHaveBeenCalledTimes(1);
    });

    it('should ignore a registration callback without a registration', async () => {
        await setup();
        expect(() => pwa.options?.onRegisteredSW?.('/sw.js', undefined)).not.toThrow();
    });

    it('should activate a waiting version and reload when it takes control', async () => {
        const container = fakeContainer(true);
        const { env } = await setup(container);
        pwa.options?.onNeedRefresh?.();
        expect(pwa.updateSW).toHaveBeenCalledWith(true);
        container.dispatchEvent(new Event('controllerchange'));
        pwa.options?.onNeedReload?.();
        expect(env.reload).toHaveBeenCalledTimes(1);
    });

    it('should hold the update while a finger is on the screen', async () => {
        await setup();
        const down = Object.assign(new Event('pointerdown'), { pointerId: 1 });
        window.dispatchEvent(down);
        pwa.options?.onNeedRefresh?.();
        expect(pwa.updateSW).not.toHaveBeenCalled();
        window.dispatchEvent(Object.assign(new Event('pointerup'), { pointerId: 1 }));
        expect(pwa.updateSW).toHaveBeenCalledTimes(1);
    });

    it('should still give the app a manager without service worker support', async () => {
        // null：同 `navigator.serviceWorker` 唔存在一樣（undefined 會用返預設參數）
        const { manager } = await setup(null);
        expect(pwa.options).toBeUndefined();
        expect(manager.getSnapshot()).toBe('none');
    });
});
