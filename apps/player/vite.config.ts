import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';
import { build, loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { zhHant } from './src/i18n/zh-Hant';
import { catalogCaching } from './src/pwa/catalogCaching';
import { appManifest, iconLinks, NAVIGATE_FALLBACK_DENYLIST } from './src/pwa/manifest';
import { SPIKE_PRECACHE_IGNORES } from './src/pwa/spikePage';
import { remoteFontCaching, remoteFontUrl, withRemoteFont } from './src/styles/fontSource';

// package.json 係版本嘅唯一來源；build 時注入，唔使 runtime fetch
const PACKAGE_JSON = new URL('./package.json', import.meta.url);
const { version: APP_VERSION } = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')) as {
    version: string;
};

// PWA 名稱同描述係介面文字：由語言檔嚟（Functional Spec FR-037），唔喺呢度同 index.html 寫死
const APP_NAME = zhHant.app.name;
const APP_DESCRIPTION = zhHant.app.description;

const HTML_ESCAPES: Readonly<Record<string, string>> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
};
/** 佔位符會落入 HTML 屬性：文字入面有 `"` 或者 `&` 都唔可以整爛個屬性 */
const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (char) => HTML_ESCAPES[char] ?? char);

// index.html 入面嘅佔位符（JS 未跑都要有，所以喺 HTML 層換）
const HTML_PLACEHOLDERS: Readonly<Record<string, string>> = {
    '%APP_VERSION%': APP_VERSION,
    '%APP_DESCRIPTION%': APP_DESCRIPTION,
};
const injectAppText = (): Plugin => ({
    name: 'inject-app-text',
    transformIndexHtml: (html) => ({
        html: Object.entries(HTML_PLACEHOLDERS).reduce(
            (text, [placeholder, value]) => text.replaceAll(placeholder, escapeHtml(value)),
            html,
        ),
        // favicon 同 iOS 主畫面 icon：路徑只喺 src/pwa/manifest.ts 寫一次（T-039）
        tags: iconLinks().map((attrs) => ({ tag: 'link', attrs, injectTo: 'head' as const })),
    }),
});

/** slab 字體嘅 @font-face 喺呢個檔（main.tsx 直接 import，所以 transform 睇得到） */
const FONTS_CSS = '/src/styles/fonts.css';
const APP_DIR = fileURLToPath(new URL('.', import.meta.url));

/**
 * T-044：將 `VITE_FONT_URL`（媒體 bucket 嘅字體檔）寫入 fonts.css 嘅 `src`。CSS 讀唔到 env，所以喺 build 時換；
 * `pre`：要喺 Vite 處理 CSS（解析 url()、hash 檔名）之前。設咗但唔係 https 網址就警告兼當冇設定。
 */
const remoteFont = (value: string | undefined): Plugin => ({
    name: 'remote-font',
    enforce: 'pre',
    configResolved: (config) => {
        if (value?.trim() && !remoteFontUrl(value)) {
            config.logger.warn(`VITE_FONT_URL is not an https URL; using the bundled font only.`);
        }
    },
    transform: (code, id) =>
        id.split('?')[0]?.endsWith(FONTS_CSS)
            ? { code: withRemoteFont(code, value), map: null }
            : null,
});

/** T-010 spike 頁嘅 build 設定（另一次 build：app 嘅 chunk 同 precache 清單唔受影響；src/pwa/spikePage.ts） */
const SPIKE_CONFIG = fileURLToPath(new URL('./vite.spike.config.ts', import.meta.url));

/**
 * app build 完（連 Service Worker）先 build spike 頁入同一個 `dist/`：Vercel 跑邊個 build 指令都會有 `/spike.html`。
 * `post` + `sequential`：排喺 vite-plugin-pwa 生成 sw.js 之後
 */
const spikeBuild = (): Plugin => ({
    name: 'spike-build',
    apply: 'build',
    closeBundle: {
        order: 'post',
        sequential: true,
        handler: async () => {
            await build({ configFile: SPIKE_CONFIG });
        },
    },
});

export default defineConfig(({ mode }) => {
    // build 變數（.env.example）：喺 config 入面用嘅要自己讀（import.meta.env 只係 app code 先有）
    const fontUrl = loadEnv(mode, APP_DIR, 'VITE_').VITE_FONT_URL;
    return {
        // Vitest 共用呢份 config，所以測試都睇到同一個 define
        define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
        plugins: [
            react(),
            injectAppText(),
            remoteFont(fontUrl),
            VitePWA({
                // prompt：新 Service Worker 裝好後喺 waiting 等，由 pwa/updateManager 揀冇播歌嘅時候先換（T-039）
                registerType: 'prompt',
                // public/icons 嘅 png 已經由 globPatterns precache：唔使 plugin 再加一次（唔係就重複兩份）
                includeManifestIcons: false,
                manifest: appManifest({ name: APP_NAME, description: APP_DESCRIPTION }),
                workbox: {
                    globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
                    skipWaiting: false,
                    clientsClaim: true,
                    // 真檔（robots.txt，backlog B-021）唔可以畀導航 fallback 換成 index.html
                    navigateFallbackDenylist: [...NAVIGATE_FALLBACK_DENYLIST],
                    // T-010 spike 頁（用完即棄）唔入 precache：唔會隨 app 更新落到用戶部機
                    globIgnores: [...SPIKE_PRECACHE_IGNORES],
                    // 隨 app 嘅 Rokkitt（woff2）由 globPatterns precache；遠端字體、catalog 圖片同歌詞由呢度留低
                    runtimeCaching: [...remoteFontCaching(fontUrl), ...catalogCaching()],
                },
            }),
            spikeBuild(),
        ],
        test: {
            name: '@r-gram/player',
            globals: true,
            environment: 'jsdom',
            setupFiles: ['./tests/setup.ts'],
            include: ['src/**/*.test.{ts,tsx}'],
        },
    };
});
