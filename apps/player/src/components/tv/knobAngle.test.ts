import { pointerAngle, seekStepsFor, turnDelta, volumeAfterTurn, volumeTurn } from './knobAngle';

const SWEEP = 270;

/* T-061：電視旋鈕嘅角度（純函數）：0° 向右、順時針為正（同舞台一樣，y 向下） */
describe('knobAngle', () => {
    it('should point the volume grip from -135° (silent) through 0° to 135° (full)', () => {
        expect(volumeTurn(0, SWEEP)).toBe(-135);
        expect(volumeTurn(0.5, SWEEP)).toBe(0);
        expect(volumeTurn(1, SWEEP)).toBe(135);
    });

    it('should measure the angle of a pointer around the centre', () => {
        const centre = { x: 50, y: 50 };
        expect(pointerAngle(centre, { x: 100, y: 50 })).toBeCloseTo(0);
        expect(pointerAngle(centre, { x: 50, y: 100 })).toBeCloseTo(90);
        expect(pointerAngle(centre, { x: 50, y: 0 })).toBeCloseTo(-90);
    });

    it('should take the short way round between two angles', () => {
        expect(turnDelta(-90, 0)).toBe(90);
        expect(turnDelta(170, -170)).toBe(20);
        expect(turnDelta(-170, 170)).toBe(-20);
    });

    it('should turn the volume by the angle over the sweep and keep it between 0 and 1', () => {
        expect(volumeAfterTurn(0.5, 90, SWEEP)).toBeCloseTo(0.5 + 1 / 3);
        expect(volumeAfterTurn(0.5, -270, SWEEP)).toBe(0);
        expect(volumeAfterTurn(0.9, 90, SWEEP)).toBe(1);
    });

    it('should count whole steps of fast-forward (right) and rewind (left)', () => {
        expect(seekStepsFor(29, 30)).toBe(0);
        expect(seekStepsFor(61, 30)).toBe(2);
        expect(seekStepsFor(-31, 30)).toBe(-1);
    });
});
