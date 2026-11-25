import { heartPoint, platterLeftAt, polar, scaleAngle } from './geometry';
import { PHONE_LAYOUT } from './layouts/phone';

describe('geometry helpers', () => {
    it('should convert polar to stage coordinates with y pointing down', () => {
        const [right, down] = [polar({ x: 10, y: 20 }, 5, 0), polar({ x: 10, y: 20 }, 5, 90)];
        expect(right.x).toBeCloseTo(15);
        expect(right.y).toBeCloseTo(20);
        expect(down.x).toBeCloseTo(10);
        expect(down.y).toBeCloseTo(25);
    });

    it('should find the left edge of the platter at a given height', () => {
        const { disc, platter } = PHONE_LAYOUT;
        expect(platterLeftAt(PHONE_LAYOUT, disc.y)).toBeCloseTo(disc.x - platter.r);
        expect(Math.round(platterLeftAt(PHONE_LAYOUT, 1784))).toBe(531);
    });

    it('should space the scale positions evenly from the start angle', () => {
        expect(scaleAngle(PHONE_LAYOUT, 0)).toBe(185);
        expect(scaleAngle(PHONE_LAYOUT, 17)).toBe(376.25);
    });

    it('should put the heart just outside the last scale position and slide it to the letters', () => {
        const { knob, scale, dial } = PHONE_LAYOUT;
        const POSITIONS = 18;
        const closed = heartPoint(PHONE_LAYOUT, POSITIONS, 0);
        const open = heartPoint(PHONE_LAYOUT, POSITIONS, 1);
        expect(Math.hypot(closed.x - knob.x, closed.y - knob.y)).toBeCloseTo(
            scale.long + scale.heartGap,
        );
        expect(Math.hypot(open.x - knob.x, open.y - knob.y)).toBeCloseTo(dial.letters);
    });
});
