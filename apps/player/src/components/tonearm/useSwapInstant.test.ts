import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { useSwapInstant } from './useSwapInstant';

/** 手動推進嘅 animation frame；`alongside` 喺同一個 act 入面做（同一次 render 處理埋） */
const frames = () => {
    const queue = new Map<number, FrameRequestCallback>();
    let lastId = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        lastId += 1;
        queue.set(lastId, callback);
        return lastId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
        queue.delete(id);
    });
    return {
        next: (alongside?: () => void) =>
            act(() => {
                const due = [...queue.values()];
                queue.clear();
                due.forEach((callback) => callback(0));
                alongside?.();
            }),
        pending: () => queue.size,
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

    // 瀏覽器實測（T-048）：一格到咗嗰陣同一次 render 又換碟（Home 再方向鍵），記號唔可以卡住
    it('should still clear when the disc changes again in the same render as a frame', () => {
        const frame = frames();
        const { result, rerender } = renderHook(({ key }) => useSwapInstant(key), {
            initialProps: { key: 'room' as string | null },
        });
        rerender({ key: 'apollo-18' });
        frame.next(() => rerender({ key: 'room' }));
        expect(result.current).toBe(true);
        frame.next();
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
