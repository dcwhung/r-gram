import { clampOffset, snapIndex, wheelSteps } from './arcScroll';

/* 弧線歌單捲動：停低時一定有一行喺框入面（揀中嗰行），灰色行（未有音檔）唔會停喺框入面 */
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

        it('should snap to the nearest row when no row can play, within the list', () => {
            expect(snapIndex(1.6, [], 3)).toBe(2);
            expect(snapIndex(-3, [], 3)).toBe(0);
            expect(snapIndex(9, [], 3)).toBe(2);
            expect(snapIndex(0, [], 0)).toBe(0);
        });
    });

    it('should keep the offset between the first and the last row', () => {
        expect(clampOffset(-0.4, 5)).toBe(0);
        expect(clampOffset(2.5, 5)).toBe(2.5);
        expect(clampOffset(7, 5)).toBe(4);
        expect(clampOffset(3, 0)).toBe(0);
    });

    // 滾輪（觸控板一次好細）：儲夠一行先移一行，餘數留低；兩個方向一樣
    it('should turn the wheel into whole rows and keep the remainder', () => {
        expect(wheelSteps(100, 89)).toEqual({ steps: 1, rest: 11 });
        expect(wheelSteps(40, 89)).toEqual({ steps: 0, rest: 40 });
        expect(wheelSteps(-200, 89)).toEqual({ steps: -2, rest: -22 });
    });
});
