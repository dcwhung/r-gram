import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { useSwapInstant } from './useSwapInstant';

/** 手動推進嘅 animation frame */
const frames = () => {
    let queue: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        queue.push(callback);
        return queue.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {
        queue = [];
    });
    return {
        next: () =>
            act(() => {
                const due = queue;
                queue = [];
                due.forEach((callback) => callback(0));
            }),
        pending: () => queue.length,
    };
};

/*
 * T-048：返去載入嘅碟（顯示嘅碟換咗）嗰下唱臂即時到位、唔行開場（設計稿 swapAlbum、data-arm-instant；FR-040）。
 * 記號留到瀏覽器畫完一格先除，否則 transition 會喺同一格恢復，唱臂照樣轉過去
 */
describe('useSwapInstant', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('should not be instant on the first render or while the disc stays the same', () => {
        frames();
        const { result, rerender } = renderHook(({ key }) => useSwapInstant(key), {
            initialProps: { key: 'apollo-18' as string | null },
        });
        expect(result.current).toBe(false);
        rerender({ key: 'apollo-18' });
        expect(result.current).toBe(false);
    });

    it('should be instant from the render where the disc changes until two frames later', () => {
        const frame = frames();
        const { result, rerender } = renderHook(({ key }) => useSwapInstant(key), {
            initialProps: { key: 'room' as string | null },
        });
        rerender({ key: 'apollo-18' });
        expect(result.current).toBe(true);
        frame.next();
        expect(result.current).toBe(true);
        frame.next();
        expect(result.current).toBe(false);
    });

    it('should stop waiting for frames once unmounted', () => {
        const frame = frames();
        const { rerender, unmount } = renderHook(({ key }) => useSwapInstant(key), {
            initialProps: { key: 'room' as string | null },
        });
        rerender({ key: 'apollo-18' });
        unmount();
        expect(frame.pending()).toBe(0);
    });
});
