import { isStandalone, pickStageHeight, readStageHeight, viewportKey } from './viewportHeight';

const LVH = { source: 'lvh', height: 852 } as const;

/** 主畫面 app：display-mode standalone */
const stubStandalone = (standalone: boolean) =>
    vi.stubGlobal('matchMedia', (query: string) => ({
        matches: standalone && query === '(display-mode: standalone)',
    }));

/** 隱藏 probe 量到嘅 100lvh（jsdom 冇 layout：直接 stub） */
const stubFullHeight = (height: number) =>
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
        height,
    } as DOMRect);

const stubInnerHeight = (height: number) =>
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(height);

const stubInsets = (paddingTop: string, paddingBottom: string) =>
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        paddingTop,
        paddingBottom,
    } as CSSStyleDeclaration);

describe('pickStageHeight', () => {
    it('should keep innerHeight in a browser tab, even when 100lvh is taller', () => {
        expect(pickStageHeight(735, false, LVH)).toEqual({ source: 'inner', height: 735 });
    });

    // iOS 26+ 主畫面 app：innerHeight 喺 793（螢幕 − 頂部安全區）同 852 之間跳，100lvh 一直係 852
    it.each([793, 852])(
        'should use the full-screen height in standalone whatever innerHeight is (%d)',
        (inner) => {
            expect(pickStageHeight(inner, true, LVH)).toEqual(LVH);
        },
    );

    it('should fall back to 100vh where 100lvh is not supported', () => {
        expect(pickStageHeight(793, true, { source: 'vh', height: 852 })).toEqual({
            source: 'vh',
            height: 852,
        });
    });

    it('should keep innerHeight in standalone when it is the taller one', () => {
        expect(pickStageHeight(900, true, LVH)).toEqual({ source: 'inner', height: 900 });
    });
});

describe('isStandalone', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should follow the display-mode media query', () => {
        stubStandalone(true);
        expect(isStandalone()).toBe(true);
        stubStandalone(false);
        expect(isStandalone()).toBe(false);
    });

    it('should accept the iOS navigator.standalone flag', () => {
        stubStandalone(false);
        vi.stubGlobal('navigator', { ...navigator, standalone: true });
        expect(isStandalone()).toBe(true);
    });

    it('should be false without matchMedia', () => {
        vi.stubGlobal('matchMedia', undefined);
        expect(isStandalone()).toBe(false);
    });
});

describe('readStageHeight', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        document.querySelectorAll('.full-height-probe').forEach((probe) => probe.remove());
    });

    it('should not add a probe in a browser tab', () => {
        stubStandalone(false);
        stubInnerHeight(735);
        expect(readStageHeight()).toEqual({ source: 'inner', height: 735 });
        expect(document.querySelector('.full-height-probe')).toBeNull();
    });

    it('should measure one hidden 100lvh probe in standalone', () => {
        stubStandalone(true);
        stubInnerHeight(793);
        stubFullHeight(852);
        vi.stubGlobal('CSS', { supports: () => true });
        expect(readStageHeight()).toEqual({ source: 'lvh', height: 852 });
        readStageHeight();
        const probes = document.querySelectorAll('.full-height-probe');
        expect(probes).toHaveLength(1);
        expect(probes[0]).toHaveAttribute('aria-hidden', 'true');
    });

    it('should name 100vh as the source where 100lvh is not supported', () => {
        stubStandalone(true);
        stubInnerHeight(793);
        stubFullHeight(852);
        vi.stubGlobal('CSS', { supports: () => false });
        expect(readStageHeight()).toEqual({ source: 'vh', height: 852 });
    });
});

describe('viewportKey', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        document.querySelectorAll('.full-height-probe').forEach((probe) => probe.remove());
    });

    it('should stay the same in standalone while innerHeight flips between 793 and 852', () => {
        stubStandalone(true);
        stubInsets('59px', '34px');
        stubFullHeight(852);
        const inner = stubInnerHeight(793);
        const first = viewportKey();
        inner.mockReturnValue(852);
        expect(viewportKey()).toBe(first);
        expect(first).toBe(`${window.innerWidth} 852 59 34`);
    });

    it('should follow innerHeight in a browser tab', () => {
        stubStandalone(false);
        stubInsets('0px', '0px');
        stubInnerHeight(735);
        expect(viewportKey()).toBe(`${window.innerWidth} 735 0 0`);
    });
});
