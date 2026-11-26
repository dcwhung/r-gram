import { isPhoneLandscape, PHONE_MAX_SHORT_SIDE_PX } from './deviceClass';

const touch = (width: number, height: number) => ({ width, height, coarsePointer: true });

describe('isPhoneLandscape (Functional Spec US-015, FR-018)', () => {
    it.each([
        [852, 393],
        [844, 390],
        [800, 360],
        [932, 430],
    ])('should be true for a touch phone turned sideways (%i × %i)', (width, height) => {
        expect(isPhoneLandscape(touch(width, height))).toBe(true);
    });

    it.each([
        [393, 852],
        [390, 844],
        [360, 800],
    ])('should be false for the same phone held upright (%i × %i)', (width, height) => {
        expect(isPhoneLandscape(touch(width, height))).toBe(false);
    });

    it('should be false for a tablet or an open iPhone Duo in landscape (no phone layout there)', () => {
        expect(isPhoneLandscape(touch(1180, 820))).toBe(false);
        expect(isPhoneLandscape(touch(876, 612))).toBe(false);
        expect(isPhoneLandscape(touch(PHONE_MAX_SHORT_SIDE_PX * 2, PHONE_MAX_SHORT_SIDE_PX + 1))).toBe(
            false,
        );
    });

    it('should be false for a small desktop window with a mouse', () => {
        expect(isPhoneLandscape({ width: 852, height: 393, coarsePointer: false })).toBe(false);
    });

    it('should be false for a square screen such as HomeView', () => {
        expect(isPhoneLandscape(touch(544, 544))).toBe(false);
    });
});
