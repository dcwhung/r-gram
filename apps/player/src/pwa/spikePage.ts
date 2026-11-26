/*
 * T-010 真機 spike 頁（用完即棄，唔入產品、app 冇連結）：`/spike.html`，用另一次 Vite build 出
 *（`vite.spike.config.ts`，app build 完先跑），所以 app 嘅 chunk 同 precache 清單唔受影響。
 * Service Worker：唔 precache 佢（呢度嘅 glob）；導航 fallback 唔可以換佢做 app（manifest.ts 嘅 denylist）。
 * 純資料：vite.config.ts（Node）同測試都用。
 */
export const SPIKE_PAGE = 'spike.html';
/** spike 自己嘅 JS、CSS、圖（同 app 嘅 `assets/` 分開，先可以成個資料夾唔 precache） */
export const SPIKE_ASSETS_DIR = 'spike-assets';
export const SPIKE_PRECACHE_IGNORES: readonly string[] = [SPIKE_PAGE, `${SPIKE_ASSETS_DIR}/**`];
