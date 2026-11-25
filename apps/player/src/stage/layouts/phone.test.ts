import { PHONE_LAYOUT } from './phone';

/* 幾何表嘅數值以設計稿 template.html 嘅常數做準 */
describe('PHONE_LAYOUT', () => {
    // W-009：設計稿 ARM = { x: 900, y: 330, len: 640, base: 92, park: 176, play: 99, bend: -1 }
    it('should carry every tonearm constant of the mockup, including the bend', () => {
        expect(PHONE_LAYOUT.arm).toEqual({
            x: 900,
            y: 330,
            length: 640,
            base: 92,
            parkDeg: 176,
            playDeg: 99,
            bend: -1,
        });
    });

    // CR-003 決定 2：設計稿 SCALE = { from: 185, to: 376.25, … }；弧固定，唔再有每格固定角度
    it('should carry the fixed scale arc of the mockup', () => {
        expect(PHONE_LAYOUT.scale).toEqual({
            fromDeg: 185,
            toDeg: 376.25,
            inner: 92,
            outer: 104,
            long: 112,
            heart: 26,
            heartGap: 18,
        });
    });
});
