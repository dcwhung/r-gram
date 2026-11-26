import { framedRow, nextRingIndex, snapIndex, stepRing, wheelSteps, wrapOffset } from './arcScroll';

const ALL_12 = Array.from({ length: 12 }, (_, index) => index);

/*
 * 弧線歌單捲動：停低時一定有一行喺框入面（揀中嗰行），灰色行（未有音檔）唔會停喺框入面。
 * 第 20 版頭尾相接：圈 = N 首歌 + 一格接駁位（位置 N）；接駁位唔會停喺框入面，由最後一首去第一首係一步
 */
describe('arcScroll', () => {
    describe('snapIndex', () => {
        it('should snap to the nearest row that can play', () => {
            expect(snapIndex(2.4, [0, 1, 2, 3], 4)).toBe(2);
            expect(snapIndex(2.6, [0, 1, 2, 3], 4)).toBe(3);
            expect(snapIndex(2.4, [0, 1, 3], 4)).toBe(3);
            expect(snapIndex(1.6, [0, 1, 3], 4)).toBe(1);
        });

        // S-204：啱啱喺兩行中間：停喺前面嗰行
        it('should snap to the earlier row when the offset is exactly between two rows', () => {
            expect(snapIndex(1.5, [0, 1, 2, 3], 4)).toBe(1);
            expect(snapIndex(2, [0, 1, 3], 4)).toBe(1);
        });

        it('should snap round the seam to the nearer end, never to the seam', () => {
            expect(snapIndex(12.7, ALL_12, 12)).toBe(0);
            expect(snapIndex(12.3, ALL_12, 12)).toBe(11);
            expect(snapIndex(-0.4, ALL_12, 12)).toBe(0);
            expect(snapIndex(-0.8, ALL_12, 12)).toBe(0);
            expect(snapIndex(-1.4, ALL_12, 12)).toBe(11);
            expect(snapIndex(12, ALL_12, 12)).toBe(0);
            // 頭兩首未有音檔：喺接駁位附近停去最近播得嗰首
            expect(snapIndex(12.7, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 12)).toBe(11);
        });

        it('should snap to the nearest track when no row can play', () => {
            expect(snapIndex(1.6, [], 3)).toBe(2);
            expect(snapIndex(3.2, [], 3)).toBe(2);
            expect(snapIndex(3.6, [], 3)).toBe(0);
            expect(snapIndex(0, [], 0)).toBe(0);
        });
    });

    it('should fold the scroll position onto the ring of tracks and the seam', () => {
        expect(wrapOffset(13.5, 12)).toBeCloseTo(0.5);
        expect(wrapOffset(-0.4, 12)).toBeCloseTo(12.6);
        expect(wrapOffset(2.5, 5)).toBe(2.5);
        expect(wrapOffset(3, 0)).toBe(0);
    });

    it('should frame the nearest track, the last one while the seam is nearer', () => {
        expect(framedRow(5.2, 12)).toBe(5);
        expect(framedRow(12.4, 12)).toBe(11);
        expect(framedRow(12.6, 12)).toBe(0);
        expect(framedRow(-0.4, 12)).toBe(0);
        expect(framedRow(0.4, 1)).toBe(0);
        expect(framedRow(3, 0)).toBe(0);
    });

    describe('stepRing', () => {
        it('should step past the last track to the first and back, in one step', () => {
            expect(stepRing(11, 1, ALL_12, 12)).toBe(0);
            expect(stepRing(0, -1, ALL_12, 12)).toBe(11);
            expect(stepRing(5, 4, ALL_12, 12)).toBe(9);
            expect(stepRing(10, 4, ALL_12, 12)).toBe(2);
            expect(stepRing(1, -4, ALL_12, 12)).toBe(9);
        });

        it('should skip rows without audio in the same direction, round the ring', () => {
            const tail = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
            expect(stepRing(11, 1, tail, 12)).toBe(2);
            expect(stepRing(2, -1, tail, 12)).toBe(11);
            expect(stepRing(4, 1, [1, 4], 30)).toBe(1);
        });

        it('should stay on the only track and give nothing for no tracks', () => {
            expect(stepRing(0, 1, [0], 1)).toBe(0);
            expect(stepRing(0, -1, [0], 1)).toBe(0);
            expect(stepRing(0, 1, [], 0)).toBeNull();
        });
    });

    describe('nextRingIndex', () => {
        it.each([
            ['ArrowDown', 11, 0],
            ['ArrowUp', 0, 11],
            ['PageDown', 10, 2],
            ['PageUp', 1, 9],
            ['Home', 7, 0],
            ['End', 3, 11],
        ])('should move %s from row %d to row %d', (key, current, next) => {
            expect(nextRingIndex(key, current, ALL_12, 12, 4)).toBe(next);
        });

        it('should keep Home and End on the first and last rows that can play', () => {
            expect(nextRingIndex('Home', 7, [2, 5, 9], 12, 4)).toBe(2);
            expect(nextRingIndex('End', 3, [2, 5, 9], 12, 4)).toBe(9);
        });

        it('should leave other keys alone', () => {
            expect(nextRingIndex('Enter', 3, ALL_12, 12, 4)).toBeNull();
            expect(nextRingIndex('a', 3, ALL_12, 12, 4)).toBeNull();
        });
    });

    // 滾輪（觸控板一次好細）：儲夠一行先移一行，餘數留低；兩個方向一樣
    it('should turn the wheel into whole rows and keep the remainder', () => {
        expect(wheelSteps(100, 89)).toEqual({ steps: 1, rest: 11 });
        expect(wheelSteps(40, 89)).toEqual({ steps: 0, rest: 40 });
        expect(wheelSteps(-200, 89)).toEqual({ steps: -2, rest: -22 });
    });
});
