// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, type InlineConfig, type PluginOption, type UserConfig } from 'vite';
import viteConfig from '../../vite.config';
import { APP_ICONS } from './manifest';

/*
 * S-221（T-039、T-112）：每個 icon 喺 Service Worker 嘅預載清單入面只出現一次。
 * public/icons 嘅 png 由 globPatterns 收；plugin 再加 manifest icon（includeManifestIcons: true）就會重複兩份。
 * 用真嘅 vite.config.ts（production）build 一次去暫存資料夾，再數 sw.js 入面每個檔出現幾多次。
 * spike 頁（T-010）嘅 build 會寫入 `dist/`，同預載清單無關：呢度拎走。
 */
const SKIPPED_PLUGIN = 'spike-build';
/** 成個 build（連 Service Worker）要幾秒 */
const BUILD_TIMEOUT_MS = 120_000;

const isSkipped = (plugin: PluginOption) =>
    typeof plugin === 'object' &&
    plugin !== null &&
    'name' in plugin &&
    plugin.name === SKIPPED_PLUGIN;

const appConfig = (outDir: string): InlineConfig => {
    const resolve = viteConfig as (env: { mode: string; command: 'build' }) => UserConfig;
    const config = resolve({ mode: 'production', command: 'build' });
    return {
        ...config,
        configFile: false,
        mode: 'production',
        logLevel: 'silent',
        root: join(import.meta.dirname, '../..'),
        plugins: (config.plugins ?? []).filter((plugin) => !isSkipped(plugin)),
        build: { outDir, emptyOutDir: true },
    };
};

let outDir = '';
let sw = '';

beforeAll(async () => {
    outDir = mkdtempSync(join(tmpdir(), 'r-gram-precache-'));
    await build(appConfig(outDir));
    sw = readFileSync(join(outDir, 'sw.js'), 'utf8');
}, BUILD_TIMEOUT_MS);

afterAll(() => rmSync(outDir, { recursive: true, force: true }));

/** sw.js 預載清單入面 `url: "<path>"` 出現幾多次（壓縮版 `url:"…"`；測試環境 workbox 唔壓縮，key 有引號） */
const precacheCount = (path: string) =>
    sw.match(new RegExp(`"?url"?:\\s*"${path.replace(/\./g, '\\.')}"`, 'g'))?.length ?? 0;

describe('service worker precache', () => {
    it.each(Object.values(APP_ICONS))('should precache $src exactly once', ({ src }) => {
        expect(precacheCount(src)).toBe(1);
    });

    it('should precache the app page exactly once', () => {
        expect(precacheCount('index.html')).toBe(1);
    });
});
