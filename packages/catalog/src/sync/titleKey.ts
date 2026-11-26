/*
 * 比較歌名用嘅 key（Functional Spec D70「唔吻合」；Technical Spec「CR-007 → packages/catalog」）：
 * `info.txt`、音檔檔名、歌曲文字第一行三個歌名，唔理全形半形、大細楷、空格同彎直引號。只用嚟比較，唔顯示
 */
const SPACES = /\s+/gu;
const CURLY_SINGLE = /[‘’‚‛]/gu;
const CURLY_DOUBLE = /[“”„‟]/gu;

export const titleKey = (title: string): string =>
    title
        .normalize('NFKC')
        .toLowerCase()
        .replace(SPACES, '')
        .replace(CURLY_SINGLE, "'")
        .replace(CURLY_DOUBLE, '"');
