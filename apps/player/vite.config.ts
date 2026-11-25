import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// package.json 係版本嘅唯一來源；build 時注入，唔使 runtime fetch
const PACKAGE_JSON = new URL('./package.json', import.meta.url);
const { version: APP_VERSION } = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')) as {
    version: string;
};

// index.html 入面嘅版本號（JS 未跑都要顯示，所以喺 HTML 層換）
const APP_VERSION_PLACEHOLDER = '%APP_VERSION%';
const injectAppVersion = (): Plugin => ({
    name: 'inject-app-version',
    transformIndexHtml: (html) => html.replaceAll(APP_VERSION_PLACEHOLDER, APP_VERSION),
});

const APP_NAME = 'R Gram';
/** 啟動畫面同狀態列嘅底色：Preload 旗幟畫面係黑底（styles/tokens.css --color-flag-bg 同值） */
const LAUNCH_COLOR = '#0a0a0a';

export default defineConfig({
    // Vitest 共用呢份 config，所以測試都睇到同一個 define
    define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
    plugins: [
        react(),
        injectAppVersion(),
        VitePWA({
            // prompt：新 Service Worker 裝好後喺 waiting 等，由 pwa/updateManager 揀冇播歌嘅時候先換（T-039）
            registerType: 'prompt',
            manifest: {
                name: APP_NAME,
                short_name: APP_NAME,
                description: '歌迷自製的 RubberBand 唱片機（非官方）',
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
