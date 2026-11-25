import { readSafeAreaInsets } from './safeArea';

const stubPadding = (paddingTop: string, paddingBottom: string) =>
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        paddingTop,
        paddingBottom,
    } as CSSStyleDeclaration);

describe('readSafeAreaInsets', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        document.querySelectorAll('.safe-area-probe').forEach((probe) => probe.remove());
    });

    it('should read the insets the browser resolved for the probe element', () => {
        stubPadding('59px', '34px');
        expect(readSafeAreaInsets()).toEqual({ top: 59, bottom: 34 });
    });

    it('should report zero where env() is not supported', () => {
        stubPadding('', 'env(safe-area-inset-bottom)');
        expect(readSafeAreaInsets()).toEqual({ top: 0, bottom: 0 });
    });

    it('should reuse one hidden probe element', () => {
        stubPadding('0px', '0px');
        readSafeAreaInsets();
        readSafeAreaInsets();
        const probes = document.querySelectorAll('.safe-area-probe');
        expect(probes).toHaveLength(1);
        expect(probes[0]).toHaveAttribute('aria-hidden', 'true');
    });
});
