/** 碟名冇字母、數字或者中文字時用嘅標記 */
export const WHEEL_KEY_FALLBACK = '?';

/** 第一個字母或者數字（任何語言）；之前嘅空格同符號（例如 `¿`、`《`）跳過 */
const FIRST_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/**
 * 字母盤標記嘅預設值：英文名第一個字母（大楷）、中文名第一個字。
 * 管理端可以改（例如兩張碟同一個字母時）；呢度只係建立專輯時嘅預設。
 */
export const wheelKeyFor = (title: string): string => {
    const first = FIRST_LETTER_OR_DIGIT.exec(title)?.[0];
    return first ? first.toUpperCase() : WHEEL_KEY_FALLBACK;
};
