import { ELLIPSIS } from './fitText';
import { estimateTextWidth } from './textMeasure';
import { truncateLine } from './truncateLine';

/** 設計稿 textWidth()：中文字 = 字級，其他 = 0.56 個字級；呢度用字級 10 */
const SIZE = 10;
const measure = (text: string) =>
    estimateTextWidth(text, { family: 'cjk', size: SIZE, weight: 500, spacing: 0 });

/* 一行截短加「…」（T-049 歌單欄同 T-037 弧線歌單共用；Functional Spec FR-036、FR-044、D23） */
describe('truncateLine', () => {
    it('should keep the text when it fits', () => {
        expect(truncateLine('一二三', 30, measure)).toBe('一二三');
    });

    it('should cut a long line and end it with an ellipsis that still fits', () => {
        // 「…」係半形（5.6）；40 只夠三個字加「…」
        const shown = truncateLine('一二三四五六', 40, measure);
        expect(shown).toBe(`一二三${ELLIPSIS}`);
        expect(measure(shown)).toBeLessThanOrEqual(40);
    });

    it('should not cut inside a Latin word or leave a space before the ellipsis', () => {
        expect(truncateLine('一二 (Live 2021)', 45, measure)).toBe(`一二${ELLIPSIS}`);
    });

    it('should cut inside a word only when the word alone is wider than the line', () => {
        expect(truncateLine('ABCDEFGHIJKLMNOP', 40, measure)).toBe(`ABCDEF${ELLIPSIS}`);
    });

    it('should show only the ellipsis when nothing else fits', () => {
        expect(truncateLine('一二三', 12, measure)).toBe(ELLIPSIS);
    });

    it('should keep an empty title empty', () => {
        expect(truncateLine('', 40, measure)).toBe('');
    });
});
