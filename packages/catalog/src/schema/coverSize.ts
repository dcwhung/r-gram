/*
 * 封面圖嘅尺寸同大細（Technical Spec API-050、「CR-005 → 封面尺寸」D50）：管理端喺瀏覽器出圖、Worker 收圖都用呢份，
 * 管理端出得到 = Worker 收得到
 */
/** 揀中嘅碟（大封面）：正方形邊長 */
export const COVER_SIDE_PX = 1200;
/** 縮圖：正方形邊長 */
export const THUMB_SIDE_PX = 320;
const BYTES_PER_MB = 1024 * 1024;
export const IMAGE_MAX_MB = 2;
/** 一張上載圖嘅大細上限（Technical Spec「安全設計 → 上載」IMAGE_MAX_BYTES） */
export const IMAGE_MAX_BYTES = IMAGE_MAX_MB * BYTES_PER_MB;
