/*
 * T-010 真機 spike 頁（用完即棄）嘅 build：由 vite.config.ts 嘅 `spikeBuild()` 喺 app build 完之後叫。
 * 寫入同一個 `dist/`（唔清空），檔案放 `spike-assets/`（Service Worker 唔 precache，src/pwa/spikePage.ts）。
 * 冇 PWA plugin：spike 頁唔註冊 Service Worker。開發時 `npm run dev` 已經可以開 `/spike.html`。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { SPIKE_ASSETS_DIR, SPIKE_PAGE } from './src/pwa/spikePage';

const APP_DIR = fileURLToPath(new URL('.', import.meta.url));
// spike 頁用到 Preload 嘅版本號：同 app 一樣由 package.json 嚟
const { version } = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as {
    version: string;
};

export default defineConfig({
    root: APP_DIR,
    define: { __APP_VERSION__: JSON.stringify(version) },
    plugins: [react()],
    build: {
        outDir: 'dist',
        emptyOutDir: false,
        assetsDir: SPIKE_ASSETS_DIR,
        // public/ 已經由 app build 抄咗
        copyPublicDir: false,
        rollupOptions: { input: fileURLToPath(new URL(`./${SPIKE_PAGE}`, import.meta.url)) },
    },
});
