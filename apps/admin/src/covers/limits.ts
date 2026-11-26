/*
 * 封面來源（媒體 bucket 嘅 cover.jpg｜png）同輸出嘅上限。輸出尺寸同 2 MB 上限喺 packages/catalog（同 Worker 共用）
 */
const BYTES_PER_MB = 1024 * 1024;
const SOURCE_MAX_MB = 20;
/** 原圖檔案上限：再大唔下載（同 903-player 管理端一樣） */
export const SOURCE_MAX_BYTES = SOURCE_MAX_MB * BYTES_PER_MB;
/** 原圖最長邊：再大 decode 會食好多記憶體（手機 Safari 會直接 crash） */
export const SOURCE_MAX_EDGE_PX = 8000;
export const WEBP_TYPE = 'image/webp';
/** WebP 質素（0–1）：封面 0.85 夠清又細（同 903-player；Technical Spec 冇指定數值） */
export const WEBP_QUALITY = 0.85;
/** @jsquash/webp 嘅 quality 用 0–100 */
export const PERCENT = 100;
