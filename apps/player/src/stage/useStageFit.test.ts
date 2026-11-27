import { act, renderHook } from '@testing-library/react';
import { fitStage } from './fitStage';
import { useStageFit } from './useStageFit';

const stubStandalone = (standalone: boolean) =>
    vi.stubGlobal('matchMedia', (query: string) => ({
        matches: standalone && query === '(display-mode: standalone)',
    }));

describe('useStageFit', () => {
    beforeEach(() => {
        vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(393);
        vi.spyOn(window, 'getComputedStyle').mockReturnValue({
            paddingTop: '59px',
            paddingBottom: '34px',
        } as CSSStyleDeclaration);
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
            height: 852,
        } as DOMRect);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        document.querySelectorAll('.full-height-probe').forEach((probe) => probe.remove());
    });

    it('should not re-fit while iOS flips innerHeight in the home-screen app', () => {
        stubStandalone(true);
        const inner = vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(793);
        let renders = 0;
        const { result } = renderHook(() => {
            renders += 1;
            return useStageFit();
        });
        const first = result.current;
        const rendersBefore = renders;
        act(() => {
            inner.mockReturnValue(852);
            window.dispatchEvent(new Event('resize'));
            inner.mockReturnValue(793);
            window.dispatchEvent(new Event('resize'));
        });
        expect(renders).toBe(rendersBefore);
        expect(result.current).toEqual(first);
        expect(first).toEqual(fitStage(393, 852, { top: 59, bottom: 34 }));
    });

    it('should keep following innerHeight in a browser tab', () => {
        stubStandalone(false);
        const inner = vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(852);
        const { result } = renderHook(() => useStageFit());
        act(() => {
            inner.mockReturnValue(735);
            window.dispatchEvent(new Event('resize'));
        });
        expect(result.current).toEqual(fitStage(393, 735, { top: 59, bottom: 34 }));
    });
});
