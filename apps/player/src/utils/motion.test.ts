import { durationFor, prefersReducedMotion } from './motion';

const stubMatchMedia = (matches: boolean) =>
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({ matches, media: query })),
    );

describe('prefersReducedMotion', () => {
    it('should read the system setting each time it is called', () => {
        stubMatchMedia(true);
        expect(prefersReducedMotion()).toBe(true);
        stubMatchMedia(false);
        expect(prefersReducedMotion()).toBe(false);
        expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    });

    it('should be false where matchMedia is not available', () => {
        vi.stubGlobal('matchMedia', undefined);
        expect(prefersReducedMotion()).toBe(false);
    });
});

describe('durationFor', () => {
    it('should return the token duration when motion is allowed', () => {
        stubMatchMedia(false);
        expect(durationFor(500)).toBe(500);
    });

    it('should return zero when the user asked for reduced motion', () => {
        stubMatchMedia(true);
        expect(durationFor(500)).toBe(0);
    });
});
