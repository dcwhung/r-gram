import { breakAt } from './breakAt';
import { estimateTextWidth } from './textMeasure';

/** 設計稿 textWidth()：中文字 = 字級，其他 = 0.56 個字級；呢度用字級 10 */
const SIZE = 10;
const measure = (text: string) =>
    estimateTextWidth(text, { family: 'cjk', size: SIZE, weight: 700, spacing: 0 });

/* 設計稿第 18 版 breakAt()：喺闊度之內斬開一行；英文字、數字、括號唔喺中間斬 */
describe('breakAt', () => {
    it('should keep the whole text when it fits', () => {
        expect(breakAt('一二三', 30, measure)).toEqual(['一二三', '']);
    });

    it('should break Chinese text between any two characters', () => {
        expect(breakAt('一二三四五', 30, measure)).toEqual(['一二三', '四五']);
    });

    it('should move a Latin word that does not fit to the next line', () => {
        // 「一二」= 20；「Live」每個 5.6
        expect(breakAt('一二Live', 35, measure)).toEqual(['一二', 'Live']);
    });

    it('should not break inside brackets or digits, and drop the space at the break', () => {
        expect(breakAt('一二 (Live 2021)', 70, measure)).toEqual(['一二 (Live', '2021)']);
        expect(breakAt('一二 (Live 2021)', 40, measure)).toEqual(['一二', '(Live 2021)']);
    });

    it('should break inside a word only when the word alone is wider than the line', () => {
        expect(breakAt('ABCDEFGHIJ', 30, measure)).toEqual(['ABCDE', 'FGHIJ']);
    });

    it('should break at a full-width space', () => {
        expect(breakAt('一二　三四', 35, measure)).toEqual(['一二', '三四']);
    });

    it('should count characters outside the basic plane as one', () => {
        expect(breakAt('😀😀😀', 15, measure)).toEqual(['😀', '😀😀']);
    });
});
