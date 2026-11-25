import { IDLE_FALLBACK_MS, IDLE_TIMEOUT_MS } from '../config/limits';

/**
 * 瀏覽器有空先行 `callback`；回傳取消函數。冇 requestIdleCallback（Safari）就遲 IDLE_FALLBACK_MS 先行。
 */
export const onIdle = (callback: () => void): (() => void) => {
    if (typeof globalThis.requestIdleCallback === 'function') {
        const handle = globalThis.requestIdleCallback(() => callback(), {
            timeout: IDLE_TIMEOUT_MS,
        });
        return () => globalThis.cancelIdleCallback(handle);
    }
    const timer = setTimeout(callback, IDLE_FALLBACK_MS);
    return () => clearTimeout(timer);
};
