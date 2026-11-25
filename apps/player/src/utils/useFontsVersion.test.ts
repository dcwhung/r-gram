import { act, renderHook } from '@testing-library/react';
import { installFakeFonts, removeFakeFonts } from './testing/fakeFonts';
import { useFontsVersion } from './useFontsVersion';

describe('useFontsVersion', () => {
    afterEach(removeFakeFonts);

    it('should stay at 0 where the browser has no font loading API', () => {
        const { result } = renderHook(() => useFontsVersion());
        expect(result.current).toBe(0);
    });

    // W-017：字體載入完（第一次 ready、之後每次 loadingdone）都要重新量字
    it('should count up when the fonts are ready and every time more fonts finish loading', async () => {
        const fonts = installFakeFonts();
        const { result } = renderHook(() => useFontsVersion());
        await act(() => fonts.resolveReady());
        expect(result.current).toBe(1);
        act(() => fonts.finishLoading());
        act(() => fonts.finishLoading());
        expect(result.current).toBe(3);
    });

    it('should stop listening once unmounted', async () => {
        const fonts = installFakeFonts();
        const { result, unmount } = renderHook(() => useFontsVersion());
        unmount();
        await act(() => fonts.resolveReady());
        act(() => fonts.finishLoading());
        expect(result.current).toBe(0);
        expect(fonts.listenerCount()).toBe(0);
    });
});
