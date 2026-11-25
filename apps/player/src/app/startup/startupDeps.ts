/*
 * 開 app 載入嘅三項 IO（由外面注入：測試用假嘅，瀏覽器用 createBrowserStartup()）。
 */
import { fetchImage } from '../../catalog/fetchImage';
import { defaultCatalogDeps } from '../../catalog/defaultDeps';
import { type CatalogLoadResult, loadCatalog } from '../../catalog/loader';
import { COVER_PRELOAD_TIMEOUT_MS, FONT_LOAD_TIMEOUT_MS } from '../../config/limits';
import { loadSlabFonts, withTimeout } from './startupTasks';

export interface StartupDeps {
    /** 永遠 resolve：網絡 → 本機副本 → unavailable（catalog/loader） */
    loadCatalog: () => Promise<CatalogLoadResult>;
    /** slab 字體就緒（或者逾時）；永遠 resolve */
    loadFonts: () => Promise<void>;
    /** 攞一張圖入 cache；resolve 攞唔攞到（或者逾時 = false） */
    loadImage: (url: string) => Promise<boolean>;
    /** 揀封面用嘅隨機數（測試用固定值）；冇 = Math.random */
    random?: () => number;
}

/** 瀏覽器：`VITE_CATALOG_URL` + localStorage、`document.fonts`、cors fetch（Service Worker 會 cache） */
export const createBrowserStartup = (): StartupDeps => ({
    loadCatalog: () => loadCatalog(defaultCatalogDeps()),
    loadFonts: () => loadSlabFonts(document.fonts, FONT_LOAD_TIMEOUT_MS),
    loadImage: (url) =>
        withTimeout((signal) => fetchImage(url, signal), COVER_PRELOAD_TIMEOUT_MS, false),
});
