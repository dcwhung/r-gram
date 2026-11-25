import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { zhHant } from './src/i18n/zh-Hant';

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
    transformIndexHtml: (html) =>
        Object.entries(HTML_PLACEHOLDERS).reduce(
            (text, [placeholder, value]) => text.replaceAll(placeholder, escapeHtml(value)),
            html,
        ),
});

/** 啟動畫面同狀態列嘅底色：Preload 旗幟畫面係黑底（styles/tokens.css --color-flag-bg 同值） */
const LAUNCH_COLOR = '#0a0a0a';

export default defineConfig({
    // Vitest 共用呢份 config，所以測試都睇到同一個 define
    define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
    plugins: [
        react(),
        injectAppText(),
        VitePWA({
            // prompt：新 Service Worker 裝好後喺 waiting 等，由 pwa/updateManager 揀冇播歌嘅時候先換（T-039）
            registerType: 'prompt',
            manifest: {
                name: APP_NAME,
                short_name: APP_NAME,
                description: APP_DESCRIPTION,
                lang: 'zh-Hant',
                display: 'standalone',
                orientation: 'portrait',
                background_color: LAUNCH_COLOR,
                theme_color: LAUNCH_COLOR,
                // icon 喺 T-039 加
                icons: [],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
                skipWaiting: false,
                clientsClaim: true,
            },
        }),
    ],
    test: {
        name: '@r-gram/player',
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
        include: ['src/**/*.test.{ts,tsx}'],
    },
});
