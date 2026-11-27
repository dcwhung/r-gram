/**
 * 設計稿 isLatin()：全部係拉丁字（英文、數字）就用 slab，否則用 Noto Sans HK。
 * 設計稿只認 ASCII；真資料有排版標點（用戶 2026-11-27：「Dedicated To…」嘅省略號），所以都當拉丁字：
 * - `\x20-\x7e`：ASCII 可見字元
 * - ` -ɏ`：Latin-1 補充同 Latin Extended-A／B（重音字母、`·`、`©` 等）
 * - `‐-‧`：一般標點入面嘅破折號、彎引號、`…`、`•`
 * 全形標點（`、`、`！`、全形空格）唔包，照樣當中文。
 */
const LATIN_ONLY = /^[\x20-\x7e -ɏ‐-‧]+$/;

export const isLatin = (text: string): boolean => LATIN_ONLY.test(text);
