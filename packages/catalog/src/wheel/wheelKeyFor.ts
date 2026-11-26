/** 碟名冇字母、數字或者中文字時用嘅標記 */
export const WHEEL_KEY_FALLBACK = '?';

/** 第一個字母或者數字（任何語言）；之前嘅空格同符號（例如 `¿`、`《`）跳過 */
const FIRST_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/**
 * 字母盤標記：英文名第一個字母（大楷）、中文名第一個字。
 * CR-007（Functional Spec D69）：永遠自動，唔可以改、唔儲存；生成 catalog 同管理端列表時由碟名計。
 */
export const wheelKeyFor = (title: string): string => {
    const first = FIRST_LETTER_OR_DIGIT.exec(title)?.[0];
    return first ? first.toUpperCase() : WHEEL_KEY_FALLBACK;
};
