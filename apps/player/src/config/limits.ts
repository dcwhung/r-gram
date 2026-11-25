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

/**
 * Service Worker 留低幾多張 catalog 圖片（backlog B-071 ①）。而家 21 隻碟 × 兩張封面 × 大封面同縮圖 ≈ 84 張；
 * 留多啲位畀之後加碟同換封面（換咗嘅舊檔名唔會再用，超出上限由最舊嗰張清起）。
 */
export const CATALOG_IMAGE_CACHE_MAX_ENTRIES = 200;

/** Service Worker 留低幾多份歌詞（B-071 ③）：291 首歌，每首最多一份，留位畀改歌詞同加歌 */
export const LYRICS_CACHE_MAX_ENTRIES = 400;

/** 未實作（TDD 紅燈） */
export const FONT_LOAD_TIMEOUT_MS = 1;
export const COVER_PRELOAD_TIMEOUT_MS = 1;
