import { act, renderHook } from '@testing-library/react';
import { usePhoneLandscape } from './usePhoneLandscape';

const setViewport = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
};

/** 假 matchMedia：測試可以改「主要輸入係咪手指」再通知 */
const stubPointer = (coarse: boolean) => {
    const query = Object.assign(new EventTarget(), { matches: coarse });
    vi.stubGlobal(
        'matchMedia',
        vi.fn(() => query),
    );
    return query;
};

describe('usePhoneLandscape', () => {
    it('should follow the viewport as the phone turns', () => {
        stubPointer(true);
        setViewport(393, 852);
        const { result } = renderHook(() => usePhoneLandscape());
        expect(result.current).toBe(false);
        act(() => {
            setViewport(852, 393);
            window.dispatchEvent(new Event('resize'));
        });
        expect(result.current).toBe(true);
    });

    it('should follow a change of the primary pointer', () => {
        const query = stubPointer(false);
        setViewport(852, 393);
        const { result } = renderHook(() => usePhoneLandscape());
        expect(result.current).toBe(false);
        act(() => {
            query.matches = true;
            query.dispatchEvent(new Event('change'));
        });
        expect(result.current).toBe(true);
    });

    it('should treat a browser without matchMedia as having no touch screen', () => {
        vi.stubGlobal('matchMedia', undefined);
        setViewport(852, 393);
        const { result } = renderHook(() => usePhoneLandscape());
        expect(result.current).toBe(false);
    });

    it('should cope with an old matchMedia result without listeners', () => {
        vi.stubGlobal(
            'matchMedia',
            vi.fn(() => ({ matches: true })),
        );
        setViewport(852, 393);
        const { result, unmount } = renderHook(() => usePhoneLandscape());
        expect(result.current).toBe(true);
        expect(() => unmount()).not.toThrow();
    });
});
