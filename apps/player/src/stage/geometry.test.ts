import {
    armCentreYAt,
    heartHitPoint,
    heartPoint,
    platterLeftAt,
    polar,
    positionsFor,
    scaleAngle,
} from './geometry';
import { PHONE_LAYOUT } from './layouts/phone';

const { knob, scale, dial } = PHONE_LAYOUT;
const angleOf = (point: { x: number; y: number }) =>
    (Math.atan2(point.y - knob.y, point.x - knob.x) * 180) / Math.PI;
/** 角度化做 0–360，等 376.25° 同 16.25° 比得 */
const normalised = (deg: number) => ((deg % 360) + 360) % 360;

describe('geometry helpers', () => {
    it('should follow the tonearm centre line from its pivot at a given angle', () => {
        const { arm } = PHONE_LAYOUT;
        expect(armCentreYAt(PHONE_LAYOUT, arm.parkDeg, arm.x)).toBeCloseTo(arm.y);
        // 176°：向左伸、慢慢向下（y 向下）
        expect(armCentreYAt(PHONE_LAYOUT, 176, 470)).toBeCloseTo(
            330 + 430 * Math.tan((4 * Math.PI) / 180),
        );
    });

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
});

/* CR-003 決定 2：刻度弧固定（185° 至 376.25°），格數 = 專輯數 + 1，專輯平均分佈，♥ 永遠喺弧尾 */
describe('scale arc', () => {
    it('should count one position per album plus the heart', () => {
        expect(positionsFor(17)).toBe(18);
        expect(positionsFor(0)).toBe(1);
    });

    it('should keep the arc fixed and spread 17 albums 11.25° apart as in the mockup', () => {
        const positions = positionsFor(17);
        expect(scaleAngle(PHONE_LAYOUT, 0, positions)).toBe(185);
        expect(scaleAngle(PHONE_LAYOUT, 1, positions)).toBeCloseTo(196.25);
        expect(scaleAngle(PHONE_LAYOUT, 17, positions)).toBe(376.25);
    });

    it.each([1, 4, 9, 24, 30])(
        'should start at the arc start, end at the arc end and space evenly for %i albums',
        (albums) => {
            const positions = positionsFor(albums);
            const step = (scale.toDeg - scale.fromDeg) / albums;
            const angles = Array.from({ length: positions }, (_, pos) =>
                scaleAngle(PHONE_LAYOUT, pos, positions),
            );
            expect(angles[0]).toBe(scale.fromDeg);
            expect(angles.at(-1)).toBeCloseTo(scale.toDeg);
            angles.slice(1).forEach((angle, index) => {
                expect(angle - (angles[index] ?? 0)).toBeCloseTo(step);
            });
        },
    );

    // 冇專輯：刻度上面只有 ♥（Functional Spec §CR-003「刻度弧」）
    it('should put the only position at the arc end when there are no albums', () => {
        expect(scaleAngle(PHONE_LAYOUT, 0, positionsFor(0))).toBe(scale.toDeg);
    });

    it('should put the heart just outside the arc end and slide it out to the letters', () => {
        const closed = heartPoint(PHONE_LAYOUT, 0);
        const open = heartPoint(PHONE_LAYOUT, 1);
        expect(Math.hypot(closed.x - knob.x, closed.y - knob.y)).toBeCloseTo(
            scale.long + scale.heartGap,
        );
        expect(Math.hypot(open.x - knob.x, open.y - knob.y)).toBeCloseTo(dial.letters);
        expect(normalised(angleOf(closed))).toBeCloseTo(normalised(scale.toDeg));
        expect(normalised(angleOf(heartHitPoint(PHONE_LAYOUT)))).toBeCloseTo(
            normalised(scale.toDeg),
        );
    });
});
