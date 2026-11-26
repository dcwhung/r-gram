/*
 * 瀏覽器嘅接駁（T-039）：註冊 Service Worker（vite-plugin-pwa，prompt 模式）、交畀 UpdateManager 決定幾時換版。
 * 要喺 main.tsx 一開始同步叫：controlledAtLoad、controllerchange listener 要趕喺 SW 狀態變之前（同 903-player）。
 */
import { registerSW } from 'virtual:pwa-register';
import { trackGestures } from './gestures';
import { createReloadGuard } from './reloadGuard';
import { isHardReload, startUpdateChecks } from './updateChecks';
import { UpdateManager } from './updateManager';

export interface BrowserUpdateEnv {
    window: Window;
    document: Document;
    navigator: Pick<Navigator, 'onLine' | 'serviceWorker'>;
    reload: () => void;
    storage: Pick<Storage, 'getItem' | 'setItem'> | undefined;
}

/** 瀏覽器唔支援 Service Worker（或者唔係 secure context）時係 undefined */
const containerOf = (env: BrowserUpdateEnv): ServiceWorkerContainer | undefined =>
    env.navigator.serviceWorker as ServiceWorkerContainer | undefined;

type RegisterReady = (registration: ServiceWorkerRegistration) => void;

/** registerSW 嘅 callback：新版 waiting、新版接管、註冊完成之後開始定時檢查 */
const register = (manager: UpdateManager, env: BrowserUpdateEnv, onReady: RegisterReady) =>
    registerSW({
        immediate: true,
        onNeedRefresh: manager.handleNeedRefresh,
        onNeedReload: manager.handleNeedReload,
        onRegisteredSW: (_url, registration) => {
            if (!registration) return;
            onReady(registration);
            startUpdateChecks(manager, env);
        },
    });

interface SwHandles {
    registration?: ServiceWorkerRegistration;
    updateSW?: (reloadPage?: boolean) => Promise<void>;
}

const createManager = (env: BrowserUpdateEnv, deps: SwHandles) =>
    new UpdateManager({
        checkForUpdate: () => deps.registration?.update() ?? Promise.resolve(),
        applyUpdate: () => void deps.updateSW?.(true),
        reload: env.reload,
        now: Date.now,
        isOnline: () => env.navigator.onLine,
        guard: createReloadGuard(env.storage, Date.now),
        controlledAtLoad: Boolean(containerOf(env)?.controller),
    });

/** 開始處理更新；冇 Service Worker 都返回一個 manager（永遠冇新版），App 照用 */
export const startBrowserUpdates = (env: BrowserUpdateEnv): UpdateManager => {
    const handles: SwHandles = {};
    const manager = createManager(env, handles);
    const container = containerOf(env);
    if (!container) return manager;
    container.addEventListener('controllerchange', manager.handleControllerChange);
    trackGestures(env.window, manager.setGesturing);
    // Shift-reload 要喺 registerSW 之前判斷（903-player S-648）
    void isHardReload(container)
        .then((hardReload) => (hardReload ? manager.markControlled() : undefined))
        .finally(() => {
            handles.updateSW = register(manager, env, (registration) => {
                handles.registration = registration;
            });
        });
    return manager;
};
