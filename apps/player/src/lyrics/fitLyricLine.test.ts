import { fitLyricLine } from './fitLyricLine';

/** 全形空格（一行歌詞入面分隔幾句） */
const SP = '\u3000';

/** 每個字一個字級闊 */
const measure = (text: string, size: number) => [...text].length * size;
/** 設計稿：44 → 32（每次 2），框內闊 410 = 44 號約 9 個字、32 號約 12 個字 */
const SPEC = { size: 44, minSize: 32, step: 2, width: 410, wrapSize: 32, maxRows: 12 };
const PH = (count: number) => '歌詞佔位文字'.repeat(20).slice(0, count);

/* Functional Spec D22（第 17 版修訂）；Technical Spec `fitLyricLine()` */
describe('fitLyricLine', () => {
    it('should keep a short line at 44', () => {
        expect(fitLyricLine(PH(9), SPEC, measure)).toEqual({ size: 44, rows: [PH(9)], cut: false });
    });

    it('should shrink a line that fits one row at a smaller size', () => {
        expect(fitLyricLine(PH(11), SPEC, measure)).toEqual({
            size: 36,
            rows: [PH(11)],
            cut: false,
        });
    });

    // 縮到 32 都放唔落：喺框入面斷行（空格優先），幾列左邊對齊；冇跑馬燈
    it('should wrap a line that does not fit even at 32, at the spaces first', () => {
        const line = `${PH(7)}${SP}${PH(6)}${SP}${PH(10)}`;
        expect(fitLyricLine(line, SPEC, measure)).toEqual({
            size: 32,
            rows: [PH(7), PH(6), PH(10)],
            cut: false,
        });
    });

    // 設計稿冇畫：超過 12 列，最後一列唔再斷
    it('should stop wrapping after the last allowed row', () => {
        const line = Array.from({ length: 20 }, () => PH(10)).join('　');
        const fitted = fitLyricLine(line, { ...SPEC, maxRows: 3 }, measure);
        expect(fitted.rows).toHaveLength(3);
        expect(fitted.rows[2]).toBe(Array.from({ length: 18 }, () => PH(10)).join('　'));
        expect(fitted.cut).toBe(true);
    });

    // review S-276：框入面斷行用自己嘅字級（設計稿 LONG.size），唔係縮字嘅最細字級
    it('should wrap at the wrap size, not at the smallest shrink size', () => {
        const fitted = fitLyricLine(PH(30), { ...SPEC, wrapSize: 30 }, measure);
        expect(fitted.size).toBe(30);
        expect(fitted.rows[0]).toBe(PH(13));
    });
});
