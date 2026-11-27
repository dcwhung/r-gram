import { wrapLine } from './wrapLine';

/** 每個字（code point）一個字級闊：size 10、width 60 = 一列 6 個字 */
const measure = (text: string, size: number) => [...text].length * size;
const SPEC = { size: 10, width: 60, indentEm: 1 };
const texts = (line: string, spec = SPEC) => wrapLine(line, spec, measure).map((row) => row.text);

/* Functional Spec D38（第 17 版）；Technical Spec「歌書歌詞版面」嘅測試：空格優先、逐字斷、行尾空格、續列縮入、空行 */
describe('wrapLine', () => {
    it('should keep a line that fits as one row', () => {
        expect(wrapLine('一二三四五六', SPEC, measure)).toEqual([
            { text: '一二三四五六', indent: 0 },
        ]);
    });

    it('should break at a full-width space before breaking a word', () => {
        expect(texts('一二三　四五六七')).toEqual(['一二三', '四五六七']);
    });

    it('should break at a half-width space too', () => {
        expect(texts('ab cd efgh')).toEqual(['ab cd', 'efgh']);
    });

    // 續列縮入一個字（10），所以續列只得 5 個字位
    it('should break a word that is too long by itself character by character', () => {
        expect(texts('一二三四五六七八九十甲乙丙')).toEqual(['一二三四五六', '七八九十甲', '乙丙']);
    });

    it('should indent the continued rows by indentEm', () => {
        const rows = wrapLine('一二三　四五六', { ...SPEC, width: 40 }, measure);
        expect(rows.map((row) => row.indent)).toEqual([0, 10]);
    });

    it('should line the rows up when indentEm is 0 (the long line in the frame)', () => {
        const rows = wrapLine('一二三　四五六', { ...SPEC, width: 40, indentEm: 0 }, measure);
        expect(rows).toEqual([
            { text: '一二三', indent: 0 },
            { text: '四五六', indent: 0 },
        ]);
    });

    // 行尾嘅空格唔計闊度：「一二三四五六」後面加全形空格照放得落一列；空格亦唔會帶去下一列開頭
    it('should not count or carry the spaces at the end of a row', () => {
        expect(texts('一二三四五六　七八')).toEqual(['一二三四五六', '七八']);
        expect(texts('一二三四五六　　　七八')).toEqual(['一二三四五六', '七八']);
    });

    it('should give a blank row for a blank line (a paragraph break)', () => {
        expect(wrapLine('', SPEC, measure)).toEqual([{ text: '', indent: 0 }]);
    });

    // 設計稿佔位：(Placeholder) 混排，英文字照空格位斷
    it('should break mixed Latin and CJK text at the spaces', () => {
        const rows = texts('(Placeholder) 歌詞佔位文字', { size: 10, width: 140, indentEm: 1 });
        expect(rows).toEqual(['(Placeholder)', '歌詞佔位文字']);
    });
});
