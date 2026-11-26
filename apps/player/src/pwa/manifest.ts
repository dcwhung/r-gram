/*
 * PWA manifest 同 index.html 嘅 icon link（T-039；Functional Spec US-011、FR-009）。純資料：vite.config.ts（Node）同測試都用。
 * 名稱同描述係介面文字：由語言檔傳入（FR-037），呢度唔寫死。
 */

/** 啟動畫面同狀態列嘅底色：Preload 旗幟畫面係黑底（styles/tokens.css `--color-flag-bg` 同值，manifest.node.test.ts 鎖住） */
export const LAUNCH_COLOR = '#0a0a0a';
/** 部署喺網域根目錄（Vercel，T-041）：start_url、scope、id 都係佢 */
export const APP_BASE = '/';
export const APP_LANG = 'zh-Hant';

/**
 * 全部 icon 檔（`public/` 入面嘅路徑）。正式 app icon（方案 D：黑碟）：由
 * `_mockups_/app-icon/export/d-black-disc/` 抄入嚟（`icon-180.png` → `apple-touch-icon.png`），唔好人手改；
 * 要換就重新 export 再抄。maskable 版嘅碟同唱臂縮入 Android 圓形遮罩嘅安全區入面。
 * favicon（16 / 32 / 48）係專為細尺寸畫嘅簡化版（線粗啲），唔係 192 縮細（T-112）。
 */
export const APP_ICONS = {
    favicon16: { src: 'icons/icon-16.png', sizes: '16x16', type: 'image/png' },
    favicon32: { src: 'icons/icon-32.png', sizes: '32x32', type: 'image/png' },
    favicon48: { src: 'icons/icon-48.png', sizes: '48x48', type: 'image/png' },
    any192: { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    maskable192: {
        src: 'icons/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
    },
    any512: { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    maskable512: {
        src: 'icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
    },
    appleTouch: { src: 'icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
} as const;

/**
 * Service Worker 嘅導航 fallback（index.html）唔可以食咗呢啲真檔：
 * 唔係就會好似 backlog B-021 咁，`/robots.txt` 變咗返 index.html。
 * T-010 spike 頁（`pwa/spikePage.ts`）：Workbox 對 pathname + search 比較，所以要容許 `?` 參數
 */
export const NAVIGATE_FALLBACK_DENYLIST: readonly RegExp[] = [
    /^\/robots\.txt$/,
    /^\/spike(?:\.html)?(?:\?|$)/,
];

export interface ManifestText {
    name: string;
    description: string;
}

export const appManifest = ({ name, description }: ManifestText) => ({
    id: APP_BASE,
    name,
    short_name: name,
    description,
    lang: APP_LANG,
    dir: 'ltr' as const,
    start_url: APP_BASE,
    scope: APP_BASE,
    display: 'standalone' as const,
    // 唔做手機橫版（Functional Spec C11）：安裝咗嘅 app 鎖直；瀏覽器入面打橫由「請打直」畫面處理
    orientation: 'portrait' as const,
    background_color: LAUNCH_COLOR,
    theme_color: LAUNCH_COLOR,
    icons: [
        { ...APP_ICONS.any192 },
        { ...APP_ICONS.maskable192 },
        { ...APP_ICONS.any512 },
        { ...APP_ICONS.maskable512 },
    ],
});

/** type（唔係 interface）：要畀得 Vite 嘅 `HtmlTagDescriptor.attrs`（字串索引） */
export type IconLink = {
    rel: string;
    href: string;
    sizes: string;
    type?: string;
};

const FAVICONS = [APP_ICONS.favicon16, APP_ICONS.favicon32, APP_ICONS.favicon48] as const;

/** index.html 嘅 favicon（分頁、書籤）同 iOS 主畫面 icon（iOS 唔讀 manifest 嘅 icon）；同 manifest 用同一批檔 */
export const iconLinks = (): IconLink[] => [
    ...FAVICONS.map(({ src, sizes, type }) => ({
        rel: 'icon',
        type,
        sizes,
        href: `${APP_BASE}${src}`,
    })),
    {
        rel: 'apple-touch-icon',
        sizes: APP_ICONS.appleTouch.sizes,
        href: `${APP_BASE}${APP_ICONS.appleTouch.src}`,
    },
];
