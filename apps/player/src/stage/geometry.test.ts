import {
    armCentreYAt,
    heartHitPoint,
    heartPoint,
    heldColumnBottom,
    heldRowHitRight,
    miniHitBox,
    miniLabelX,
    miniScale,
    miniTitleMaxWidth,
    orbitPose,
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

/* T-036：轉碟時其他碟沿弧線排（設計稿 discPose()；ORBIT r 1000、由 −48° 起每張隔 30°、0.72 倍、白紗 0.42） */
describe('orbitPose', () => {
    const { disc } = PHONE_LAYOUT;

    it('should keep the selected disc on the platter at full size', () => {
        expect(orbitPose(PHONE_LAYOUT, 0, true)).toEqual({ ...disc, opacity: 1, veil: 0 });
        expect(orbitPose(PHONE_LAYOUT, 0, false)).toEqual({ ...disc, opacity: 1, veil: 0 });
    });

    it('should place the next disc on the arc, smaller and veiled, once the dial is open', () => {
        const pose = orbitPose(PHONE_LAYOUT, 1, true);
        expect(pose.x).toBeCloseTo(1221.9, 1);
        expect(pose.y).toBeCloseTo(1630.1, 1);
        expect(pose.r).toBeCloseTo(504);
        expect(pose).toMatchObject({ opacity: 1, veil: 0.42 });
    });

    it('should spread the discs further out and hide them while the dial is closed', () => {
        const pose = orbitPose(PHONE_LAYOUT, -1, false);
        // −48 − 30 × 1.9 = −105°
        expect(pose.x).toBeCloseTo(270.87 + 1000 * Math.cos((-105 * Math.PI) / 180), 1);
        expect(pose.opacity).toBe(0);
    });

    it.each([-2, 3])('should keep the disc %d places away hidden even when open', (offset) => {
        expect(orbitPose(PHONE_LAYOUT, offset, true).opacity).toBe(0);
    });

    it.each([-1, 2])('should show the disc %d places away when open', (offset) => {
        expect(orbitPose(PHONE_LAYOUT, offset, true).opacity).toBe(1);
    });
});

/* T-048：細唱片機（設計稿第 18 版 miniTurntable()） */
describe('mini turntable geometry', () => {
    it('should scale the turntable by MINI.r / PLATTER.r', () => {
        expect(miniScale(PHONE_LAYOUT)).toBeCloseTo(120 / 716);
    });

    // hitRect(MINI.x − hitPad / 2, MINI.y, 2r + hitPad, 2r)：以中心計
    it('should cover the disc and the text on its left with one touch target', () => {
        expect(miniHitBox(PHONE_LAYOUT)).toEqual({ left: 510, top: 202, right: 1050, bottom: 442 });
    });

    it('should right-align the two lines of text at MINI.x − MINI.r − labelGap', () => {
        expect(miniLabelX(PHONE_LAYOUT)).toBe(782);
    });

    // B-083 ④：歌名由 782 向左用到 MINI.titleLeft（330）
    it('should give the mini title the width from titleLeft to the label edge', () => {
        expect(miniTitleMaxWidth(PHONE_LAYOUT)).toBe(452);
    });
});

/* T-049：拎住嘅碟嘅歌單欄（設計稿第 18 版 panelMetrics()、trackPanel()） */
describe('held track column geometry', () => {
    it('should end the column lower while the dial is open (no small buttons then)', () => {
        expect(heldColumnBottom(PHONE_LAYOUT, true)).toBe(1470);
        expect(heldColumnBottom(PHONE_LAYOUT, false)).toBe(1290);
    });

    // 欄底避開嘅字母盤同旋鈕貼底：高身手機跟住向下移，見到多幾行
    it('should move the bottom down with the bottom group on a tall phone', () => {
        expect(heldColumnBottom(PHONE_LAYOUT, false, 120)).toBe(1410);
    });

    // 設計稿：每行透明範圍 width = right + 20（擋住碟面）
    it('should cover the whole row to a little past the right edge of the text', () => {
        expect(heldRowHitRight(PHONE_LAYOUT)).toBe(620);
    });
});
