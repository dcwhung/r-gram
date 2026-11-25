/*
 * 歌曲文字嘅長度上限（Technical Spec「安全設計」、backlog B-006）。管理端即時檢查同 API 儲存驗證共用；
 * `parseSongText()` 逐項報錯。字數按 Unicode code point 計（一個中文字 = 1），大細按 UTF-8 byte 計。
 */
const BYTES_PER_KIB = 1024;
const SONG_TEXT_MAX_KIB = 64;

/** 成段文字（API 收到更大嘅 body 回 413 `TOO_LARGE`）；取代之前嘅 `LRC_MAX_BYTES` */
export const SONG_TEXT_MAX_BYTES = SONG_TEXT_MAX_KIB * BYTES_PER_KIB;
/** 成段文字嘅行數（包括空行）：一首歌連時間標記約一二百行，1000 行已經好鬆 */
export const SONG_TEXT_MAX_LINES = 1000;
/** 歌名、副題（初始資料最長 25 字） */
export const TITLE_MAX_CHARS = 200;
/** 曲 / 詞 / 編 / 監 每一項（初始資料最長 42 字） */
export const CREDIT_MAX_CHARS = 200;
/** 每行歌詞（連時間標記）；一行有幾個時間標記都夠用 */
export const LYRIC_LINE_MAX_CHARS = 500;

/** 字數：按 code point 計 */
export const charCount = (text: string): number => [...text].length;

/** UTF-8 每個 code point 用幾多 byte：上限 0x7f → 1、0x7ff → 2、0xffff → 3，再大 → 4 */
const UTF8_LIMITS = [0x7f, 0x7ff, 0xffff] as const;
const UTF8_MAX_BYTES = 4;

const utf8Size = (codePoint: number): number => {
    const index = UTF8_LIMITS.findIndex((limit) => codePoint <= limit);
    return index < 0 ? UTF8_MAX_BYTES : index + 1;
};

/**
 * UTF-8 byte 數（同 `TextEncoder` 一樣；落單嘅 surrogate 當 U+FFFD 計 3 byte）。
 * 自己計：呢個 package 唔假設執行環境有 `TextEncoder` 嘅型別（lib 只有 ES2023）。
 */
export const byteLength = (text: string): number =>
    [...text].reduce((sum, char) => sum + utf8Size(char.codePointAt(0) ?? 0), 0);
