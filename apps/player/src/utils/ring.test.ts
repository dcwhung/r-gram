import { mod, ringDelta } from './ring';

/* 頭尾相接嘅圈（設計稿第 20 版 mod()）：弧線歌單同旋鈕共用 */
describe('ring', () => {
    it.each([
        [7, 5, 2],
        [-1, 5, 4],
        [-5, 5, 0],
        [0, 5, 0],
        [12.6, 13, 12.6],
        [-0.4, 13, 12.6],
    ])('should fold %d into a ring of %d as %d', (value, size, folded) => {
        expect(mod(value, size)).toBeCloseTo(folded);
    });

    it('should never give minus zero', () => {
        expect(Object.is(mod(-5, 5), 0)).toBe(true);
        expect(Object.is(mod(-0, 3), 0)).toBe(true);
    });

    it('should give the short way round between two places on the ring', () => {
        expect(ringDelta(12.7, 0, 13)).toBeCloseTo(0.3);
        expect(ringDelta(0, 12, 13)).toBeCloseTo(-1);
        expect(ringDelta(1, 3, 5)).toBeCloseTo(2);
        expect(ringDelta(3, 1, 5)).toBeCloseTo(-2);
        expect(ringDelta(2, 2, 5)).toBe(0);
    });
});
