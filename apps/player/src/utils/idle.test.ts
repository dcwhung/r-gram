import { IDLE_FALLBACK_MS, IDLE_TIMEOUT_MS } from '../config/limits';
import { onIdle } from './idle';

describe('onIdle', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('should run the callback when the browser is idle', () => {
        const cancelIdle = vi.fn();
        let idle: (() => void) | undefined;
        const request = vi.fn((callback: () => void) => {
            idle = callback;
            return 7;
        });
        vi.stubGlobal('requestIdleCallback', request);
        vi.stubGlobal('cancelIdleCallback', cancelIdle);
        const callback = vi.fn();
        const cancel = onIdle(callback);
        expect(request).toHaveBeenCalledWith(expect.any(Function), { timeout: IDLE_TIMEOUT_MS });
        idle?.();
        expect(callback).toHaveBeenCalledTimes(1);
        cancel();
        expect(cancelIdle).toHaveBeenCalledWith(7);
    });

    // Safari 冇 requestIdleCallback：遲少少先做
    it('should fall back to a short delay without requestIdleCallback', () => {
        vi.useFakeTimers();
        vi.stubGlobal('requestIdleCallback', undefined);
        const callback = vi.fn();
        onIdle(callback);
        vi.advanceTimersByTime(IDLE_FALLBACK_MS - 1);
        expect(callback).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not run the delayed callback after it was cancelled', () => {
        vi.useFakeTimers();
        vi.stubGlobal('requestIdleCallback', undefined);
        const callback = vi.fn();
        onIdle(callback)();
        vi.advanceTimersByTime(IDLE_FALLBACK_MS);
        expect(callback).not.toHaveBeenCalled();
    });
});
