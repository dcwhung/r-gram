/*
 * 比較歌名用嘅 key（Functional Spec D70「唔吻合」；Technical Spec「CR-007 → packages/catalog」）：
 * `info.txt`、音檔檔名、歌曲文字第一行三個歌名，唔理全形半形、大細楷、空格同彎直引號。只用嚟比較，唔顯示。
 * S-157（main session 決定，等用戶確認）：檔名唔可以有嘅字（`/ \ : * ? " < > |`，全形嗰啲經 NFKC 變返半形）
 * 一律略過，例如 `Re: SimpleLoveSong` 對得上 `Re SimpleLoveSong.m4a`；彎雙引號變直之後一齊略過
 */
const SPACES = /\s+/gu;
const CURLY_SINGLE = /[‘’‚‛]/gu;
const CURLY_DOUBLE = /[“”„‟]/gu;
const NOT_IN_FILE_NAMES = /[/\\:*?"<>|]/gu;

export const titleKey = (title: string): string =>
    title
        .normalize('NFKC')
        .toLowerCase()
        .replace(SPACES, '')
        .replace(CURLY_SINGLE, "'")
        .replace(CURLY_DOUBLE, '"')
        .replace(NOT_IN_FILE_NAMES, '');
