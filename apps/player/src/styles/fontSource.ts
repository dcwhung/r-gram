/*
 * slab 字體嘅遠端來源（T-044，用戶 2026-11-25 決定）：媒體 bucket 有字體檔就用佢，冇就用隨 app 嘅 Rokkitt；
 * 用戶嘅商業字體永遠唔入 repo。網址係 build 變數 `VITE_FONT_URL`，build 時由 vite.config.ts 寫入 fonts.css
 *（CSS 讀唔到 env）。純函數：唔掂 DOM，vite.config.ts（Node）同測試都用。
 */

/** fonts.css 入面遠端來源嘅位置：喺 local() 之後、隨 app 嘅檔案之前 */
export const REMOTE_FONT_MARKER = '/* remote-font */';

/** Service Worker 留低遠端字體嘅 cache 名 */
export const REMOTE_FONT_CACHE = 'r-gram-remote-font';

/** 字體檔副檔名 → CSS `format()` */
const FORMAT_BY_EXTENSION: Readonly<Record<string, string>> = {
    woff2: 'woff2',
    woff: 'woff',
    otf: 'opentype',
    ttf: 'truetype',
};

/** 只收 https：app 係 https，http 字體會俾瀏覽器當混合內容擋 */
const ALLOWED_PROTOCOL = 'https:';
const HTTP_OK = 200;

/** 設定值 → 正規化咗嘅網址（引號等會 percent-encode）；冇設定或者唔係 https 絕對網址 = null */
export const remoteFontUrl = (value: string | undefined): string | null => {
    const trimmed = value?.trim();
    if (!trimmed || !URL.canParse(trimmed)) return null;
    const url = new URL(trimmed);
    return url.protocol === ALLOWED_PROTOCOL ? url.href : null;
};

/** `src` 入面遠端嗰項（連後面逗號）；冇就空字串，唔會出空嘅 `url()` */
export const remoteFontSource = (value: string | undefined): string => {
    const href = remoteFontUrl(value);
    if (!href) return '';
    const extension = new URL(href).pathname.split('.').pop()?.toLowerCase() ?? '';
    const format = FORMAT_BY_EXTENSION[extension];
    return `url("${href}")${format ? ` format("${format}")` : ''},`;
};

/** 將 fonts.css 每個標記換做遠端來源（冇設定就拎走標記） */
export const withRemoteFont = (css: string, value: string | undefined): string =>
    css.replaceAll(REMOTE_FONT_MARKER, remoteFontSource(value));

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/**
 * Workbox 執行期 cache：遠端字體第一次載入之後留低，離線都用到。佢唔喺 precache（唔同網域、build 時唔知內容）。
 * 載入失敗（CORS、404、離線又未 cache）瀏覽器就用 `src` 下一項（隨 app 嘅 Rokkitt），app 照用。
 */
export const remoteFontCaching = (value: string | undefined) => {
    const href = remoteFontUrl(value);
    if (!href) return [];
    return [
        {
            urlPattern: new RegExp(`^${escapeRegExp(href)}$`),
            handler: 'CacheFirst' as const,
            options: { cacheName: REMOTE_FONT_CACHE, cacheableResponse: { statuses: [HTTP_OK] } },
        },
    ];
};
