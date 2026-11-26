/*
 * `info.txt` 嘅大細上限（Functional Spec D68；Technical Spec「CR-007 → packages/catalog」）。
 * 超過 = 檢查結果 INFO_TOO_LARGE，當冇 `info.txt`。Worker 讀檔前亦用 INFO_TEXT_MAX_BYTES 先睇大細（T-105）
 */
const BYTES_PER_KIB = 1024;
const INFO_TEXT_MAX_KIB = 16;

export const INFO_TEXT_MAX_BYTES = INFO_TEXT_MAX_KIB * BYTES_PER_KIB;
/** 有內容嘅行，包括中間嘅空行（檔尾換行之後唔計，S-160）；一張碟幾十首歌，1000 行已經好鬆 */
export const INFO_TEXT_MAX_LINES = 1000;
