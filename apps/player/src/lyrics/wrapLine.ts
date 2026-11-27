/*
 * 一行歌詞斷成幾列（純函數；Functional Spec D38、D22 第 17 版修訂；Technical Spec「歌書歌詞版面」；設計稿第 17 版 wrapLine()）：
 * - 喺全形／半形空格後面切成詞，成個詞放唔落就開新列；一個詞自己都放唔落先逐字斷
 * - 行尾嘅空格唔計闊度，亦唔會帶去下一列嘅開頭
 * - 續列縮入 `indentEm × size`（純文字欄 1 個字；框入面嘅長行 0：幾列左邊對齊）
 * - 空行 = 一列空白（純文字嘅分段）
 * 量字闊嘅函數由外面注入（瀏覽器量真字，測試用固定字闊）。
 */

export interface WrappedRow {
    text: string;
    /** 縮入（設計單位）：第一列 0 */
    indent: number;
}

export interface WrapSpec {
    size: number;
    /** 可用闊度（設計單位） */
    width: number;
    indentEm: number;
}

export type MeasureAt = (text: string, size: number) => number;

/** 喺空格（全形或者半形）後面切：空格跟住前面個詞 */
const AFTER_SPACE = /(?<=[ \u3000])/;
const isSpace = (char: string) => char === ' ' || char === '\u3000';

export const wrapLine = (line: string, spec: WrapSpec, measure: MeasureAt): WrappedRow[] => {
    const rows: WrappedRow[] = [];
    let row = '';
    let indent = 0;
    const fits = (text: string) => measure(text, spec.size) <= spec.width - indent;
    const push = () => {
        rows.push({ text: row.trimEnd(), indent });
        row = '';
        indent = spec.size * spec.indentEm;
    };
    for (const word of line.split(AFTER_SPACE)) {
        if (row && !fits((row + word).trimEnd())) push();
        for (const char of word) {
            // 新一列唔會以空格開頭；行尾嘅空格唔量（下一個字先量埋佢）
            if (isSpace(char) && !row) continue;
            if (!isSpace(char) && row && !fits(row + char)) push();
            row += char;
        }
    }
    rows.push({ text: row.trimEnd(), indent });
    return rows;
};
