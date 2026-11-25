/*
 * 播放端嘅上限同逾時（Technical Spec 組件圖 `config/limits.ts`）。
 */

/**
 * Catalog 請求（連讀 body）最多等幾耐，之後用本機上次嘅版本（Technical Spec「性能考量：首次載入」）。
 * Spec 冇定數值：Preload 期間等，太長會令冇網嘅用戶對住旗幟等好耐；8 秒夠慢網絡攞完約 150 KB。
 */
export const CATALOG_FETCH_TIMEOUT_MS = 8000;
