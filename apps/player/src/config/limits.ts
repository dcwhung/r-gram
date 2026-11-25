/*
 * 播放端嘅上限同逾時（Technical Spec 組件圖 `config/limits.ts`）。
 */

/**
 * Catalog 請求（連讀 body）最多等幾耐，之後用本機上次嘅版本（Technical Spec「性能考量：首次載入」）。
 * Spec 冇定數值：Preload 期間等，太長會令冇網嘅用戶對住旗幟等好耐；8 秒夠慢網絡攞完約 150 KB。
 */
export const CATALOG_FETCH_TIMEOUT_MS = 8000;

/**
 * 背景小工作（例如攞另一張封面入 cache，CR-005 D56）：瀏覽器有空先做，最多等幾耐（requestIdleCallback 嘅 timeout）。
 * Spec 冇定數值：唔好同開 app 嘅載入搶網絡，但都唔好等到用戶已經離開。
 */
export const IDLE_TIMEOUT_MS = 5000;

/** 冇 requestIdleCallback（Safari）就遲呢個時間先做 */
export const IDLE_FALLBACK_MS = 1500;
