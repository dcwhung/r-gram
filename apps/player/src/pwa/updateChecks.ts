/*
 * 幾時檢查新版（Functional Spec US-011：啟動、返回前景、定時）。移植自 903-player。
 * 主畫面嘅 PWA 通常由背景恢復而唔係重新載入，所以返回前景、bfcache 還原同定時都要主動查；
 * iOS 背景唔行 timer，靠 visibilitychange 補返。每次檢查只係 `registration.update()`（向自己 origin 攞 sw.js）。
 */
import type { UpdateManager } from './updateManager';

/** 開住 app 時每隔幾耐檢查一次新版 */
export const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

export interface UpdateCheckEnv {
    document: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
    window: Pick<
        Window,
        'addEventListener' | 'removeEventListener' | 'setInterval' | 'clearInterval'
    >;
}

/** 開始檢查（即刻查一次）；返回停止 function */
export const startUpdateChecks = (
    manager: Pick<UpdateManager, 'checkNow'>,
    env: UpdateCheckEnv,
): (() => void) => {
    const isVisible = () => env.document.visibilityState === 'visible';
    const checkIfVisible = () => (isVisible() ? manager.checkNow() : undefined);
    const onPageShow = (event: PageTransitionEvent) =>
        event.persisted ? manager.checkNow() : undefined;
    env.document.addEventListener('visibilitychange', checkIfVisible);
    env.window.addEventListener('pageshow', onPageShow);
    const timer = env.window.setInterval(checkIfVisible, UPDATE_CHECK_INTERVAL_MS);
    manager.checkNow();
    return () => {
        env.document.removeEventListener('visibilitychange', checkIfVisible);
        env.window.removeEventListener('pageshow', onPageShow);
        env.window.clearInterval(timer);
    };
};

/**
 * Shift-reload：頁面冇 controller，但 SW 一早已經 activated。要喺 registerSW 之前查。
 * 要 activated 唔係 activating：第一次安裝嘅 SW 喺 activating 但未 clients.claim 嗰陣唔算
 */
export const isHardReload = async (
    container: Pick<ServiceWorkerContainer, 'controller' | 'getRegistration'> | undefined,
): Promise<boolean> => {
    if (!container || container.controller) return false;
    const existing = await container.getRegistration().catch(() => undefined);
    return existing?.active?.state === 'activated';
};
