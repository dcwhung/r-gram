/*
 * 有時間標記嘅而家嗰行（純函數；Functional Spec D22 第 17 版修訂；Technical Spec「歌書歌詞版面」`fitLyricLine()`）：
 * 字級 `size` 一列放得落 → 照舊；縮到 `minSize`（每次 `step`）一列放得落 → 縮字；
 * 仍然放唔落 → 喺框入面用 `minSize` 斷成幾列（`wrapLine()`，續列唔縮入，左邊對齊）。冇跑馬燈。
 * 最多 `maxRows` 列（設計稿冇畫）：再長嘅最後一列唔斷（放唔落嘅部分由畫面喺右邊淡出）。
 */
import { shrunkSize } from '../utils/fitText';
import { type MeasureAt, wrapLine } from './wrapLine';

export interface LyricFitSpec {
    size: number;
    minSize: number;
    step: number;
    /** 框內闊 */
    width: number;
    maxRows: number;
}

export interface FittedLyric {
    size: number;
    /** 一列 = 唔使斷 */
    rows: string[];
    /** 最後一列放唔落（超過 maxRows）：畫面喺右邊淡出 */
    cut: boolean;
}

/** 超過 maxRows：頭 maxRows − 1 列照斷，原文其餘部分（連原本嘅空格）全部擺落最後一列 */
const capRows = (text: string, rows: string[], maxRows: number): string[] => {
    if (rows.length <= maxRows) return rows;
    const kept = rows.slice(0, maxRows - 1);
    const used = kept.reduce((at, row) => text.indexOf(row, at) + row.length, 0);
    return [...kept, text.slice(used).trimStart()];
};

export const fitLyricLine = (text: string, spec: LyricFitSpec, measure: MeasureAt): FittedLyric => {
    const size = shrunkSize(text, { ...spec, maxWidth: spec.width, measure });
    if (size !== null) return { size, rows: [text], cut: false };
    const wrapped = wrapLine(text, { size: spec.minSize, width: spec.width, indentEm: 0 }, measure);
    const rows = capRows(
        text,
        wrapped.map((row) => row.text),
        spec.maxRows,
    );
    return { size: spec.minSize, rows, cut: rows.length < wrapped.length };
};
