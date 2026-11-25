import { ELLIPSIS } from './fitText';
import { fitLines } from './fitLines';

/** 每個字闊 = 字級（方便計數）；ASCII 半個字級 */
const square = (text: string, size: number) =>
    [...text].reduce((sum, char) => sum + (char.charCodeAt(0) < 0x80 ? size / 2 : size), 0);

const options = {
    size: 44,
    minSize: 32,
    step: 2,
    maxWidth: 320,
    secondMaxWidth: 160,
    measure: square,
};

/* Functional Spec D51（CR-005，修訂 D23）；設計稿第 18 版 fitSong() */
describe('fitLines', () => {
    it('should keep one line at the normal size when it fits', () => {
        expect(fitLines('一二三四五六七', options)).toEqual({
            lines: ['一二三四五六七'],
            size: 44,
        });
    });

    it('should shrink in steps before breaking the line', () => {
        // 9 個字：44、42、40、38、36 都放唔落，34 × 9 = 306
        expect(fitLines('一二三四五六七八九', options)).toEqual({
            lines: ['一二三四五六七八九'],
            size: 34,
        });
    });

    it('should break onto two lines at the minimum size when one line is not enough', () => {
        expect(fitLines('一二三四五六七八九十甲乙', options)).toEqual({
            lines: ['一二三四五六七八九十', '甲乙'],
            size: 32,
        });
    });

    it('should fill the second line up to its own narrower limit', () => {
        expect(fitLines('一二三四五六七八九十甲乙丙丁戊', options).lines).toEqual([
            '一二三四五六七八九十',
            '甲乙丙丁戊',
        ]);
    });

    it('should end the second line with an ellipsis only when two lines are not enough', () => {
        const { lines, size } = fitLines('一二三四五六七八九十甲乙丙丁戊己庚辛', options);
        expect(size).toBe(32);
        expect(lines).toEqual(['一二三四五六七八九十', `甲乙丙丁${ELLIPSIS}`]);
    });

    it('should keep a Latin word whole on the second line', () => {
        expect(fitLines('一二三四五六七八九 Live', options).lines).toEqual([
            '一二三四五六七八九',
            'Live',
        ]);
    });
});
