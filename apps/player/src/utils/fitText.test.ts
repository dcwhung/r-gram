import { ELLIPSIS, fitText } from './fitText';

/** 每個字闊 = 字級（方便計數） */
const square = (text: string, size: number) => [...text].length * size;

describe('fitText', () => {
    it('should keep the text and the size when it fits', () => {
        expect(
            fitText('我永遠記得', { size: 44, minSize: 32, maxWidth: 220, measure: square }),
        ).toEqual({
            text: '我永遠記得',
            size: 44,
        });
    });

    // D23：左上放唔落就縮字
    it('should shrink to the largest size that fits', () => {
        expect(
            fitText('一二三四五六', { size: 44, minSize: 32, maxWidth: 220, measure: square }),
        ).toEqual({
            text: '一二三四五六',
            size: 36,
        });
    });

    // 字距唔跟字級縮：按比例估完仲要再試細啲
    it('should step down further when fixed spacing keeps it too wide after scaling', () => {
        const spaced = (text: string, size: number) => [...text].length * (size + 4);
        const fitted = fitText('ABCDEFGHIJ', {
            size: 88,
            minSize: 40,
            maxWidth: 600,
            measure: spaced,
        });
        expect(fitted.size).toBe(56);
        expect(spaced('ABCDEFGHIJ', fitted.size)).toBeLessThanOrEqual(600);
    });

    it('should stop at the minimum size and end with an ellipsis when even that is too wide', () => {
        const fitted = fitText('一二三四五六七八九十', {
            size: 44,
            minSize: 32,
            maxWidth: 200,
            measure: square,
        });
        expect(fitted).toEqual({ text: `一二三四五${ELLIPSIS}`, size: 32 });
        expect(square(fitted.text, fitted.size)).toBeLessThanOrEqual(200);
    });

    it('should count characters outside the basic plane as one', () => {
        const fitted = fitText('😀😀😀😀', {
            size: 10,
            minSize: 10,
            maxWidth: 30,
            measure: square,
        });
        expect(fitted.text).toBe(`😀😀${ELLIPSIS}`);
    });

    it('should leave only the ellipsis when not even one character fits', () => {
        expect(fitText('一二', { size: 40, minSize: 40, maxWidth: 50, measure: square }).text).toBe(
            ELLIPSIS,
        );
    });

    // S-075：截短位啱啱喺空格之後，唔好變「笑容 …」
    it('should drop trailing spaces before the ellipsis', () => {
        const fitted = fitText('一二 三四五六', {
            size: 10,
            minSize: 10,
            maxWidth: 40,
            measure: square,
        });
        expect(fitted.text).toBe(`一二${ELLIPSIS}`);
    });
});
