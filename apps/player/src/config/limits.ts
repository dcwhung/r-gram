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

/**
 * Preload 等 slab 字體最多幾耐（Technical Spec「字體」：逾時係常數；CR-004：bucket 字體失敗唔卡住）。
 * Spec 冇定數值：內建 Rokkitt 喺 precache，好快；慢嘅係 bucket 字體。3 秒之後照入主頁，字體遲到會重新量字（W-017）。
 */
export const FONT_LOAD_TIMEOUT_MS = 3000;

/**
 * Preload 等當前專輯封面最多幾耐。Spec 冇定數值：一張 1200 嘅 WebP 約 100–200 KB；
 * 慢網絡唔好令用戶對住旗幟等，攞唔到主頁照開（碟面先用專輯色，圖到咗再出）。
 */
export const COVER_PRELOAD_TIMEOUT_MS = 5000;

/*
 * 播放卡住（T-011 報告 §2.3「卡住」）：想播而冇出聲／等數據幾耐先算。唔係動畫，所以唔入 motion.ts。
 * 數值由報告定：4 秒通知、8 秒（前景）重新載入，每首最多重試 2 次，之後當載入失敗。
 */
export const STALL_NOTICE_MS = 4000;
export const STALL_RETRY_MS = 8000;
export const STALL_MAX_RETRIES = 2;
