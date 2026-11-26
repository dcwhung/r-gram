// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { zhHant } from '../i18n/zh-Hant';
import {
    APP_BASE,
    APP_ICONS,
    appManifest,
    iconLinks,
    LAUNCH_COLOR,
    NAVIGATE_FALLBACK_DENYLIST,
} from './manifest';

const fromApp = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));
const readText = (path: string) => readFileSync(fromApp(path), 'utf8');

const PNG_SIGNATURE = '89504e470d0a1a0a';
/** PNG 檔頭：簽名 8 byte + IHDR 長度同類型 8 byte，之後係闊同高（各 4 byte，big-endian） */
const IHDR_WIDTH_OFFSET = 16;
const IHDR_HEIGHT_OFFSET = 20;
const pngSize = (path: string) => {
    const bytes = readFileSync(fromApp(`public/${path}`));
    expect(bytes.subarray(0, 8).toString('hex')).toBe(PNG_SIGNATURE);
    return `${bytes.readUInt32BE(IHDR_WIDTH_OFFSET)}x${bytes.readUInt32BE(IHDR_HEIGHT_OFFSET)}`;
};

const manifest = appManifest({ name: zhHant.app.name, description: zhHant.app.description });

describe('appManifest', () => {
    it('should describe an installable, portrait, standalone app at the site root', () => {
        expect(manifest).toMatchObject({
            name: 'R Gram',
            short_name: 'R Gram',
            description: zhHant.app.description,
            lang: 'zh-Hant',
            display: 'standalone',
            orientation: 'portrait',
            start_url: APP_BASE,
            scope: APP_BASE,
            id: APP_BASE,
        });
    });

    it('should use the launch colour for the splash screen and the status bar', () => {
        expect(manifest.background_color).toBe(LAUNCH_COLOR);
        expect(manifest.theme_color).toBe(LAUNCH_COLOR);
    });

    it('should list 192 and 512 icons for any purpose and maskable 192 and 512 icons', () => {
        expect(manifest.icons).toEqual([
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            {
                src: 'icons/icon-maskable-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
                src: 'icons/icon-maskable-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ]);
    });

    it.each(manifest.icons)('should point manifest icon $src at a PNG of $sizes', (icon) => {
        expect(pngSize(icon.src)).toBe(icon.sizes);
    });

    it.each(Object.values(APP_ICONS))('should ship $src as a PNG of $sizes', (icon) => {
        expect(pngSize(icon.src)).toBe(icon.sizes);
    });
});

describe('iconLinks', () => {
    it('should link the small favicons (16, 32, 48) and the home-screen icon for iOS', () => {
        expect(iconLinks()).toEqual([
            { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/icons/icon-16.png' },
            { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/icons/icon-32.png' },
            { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/icons/icon-48.png' },
            { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/apple-touch-icon.png' },
        ]);
    });

    it.each(iconLinks())('should point the $rel link $href at a PNG of $sizes', (link) => {
        expect(pngSize(link.href.slice(APP_BASE.length))).toBe(link.sizes);
    });
});

describe('launch colour', () => {
    it('should match the Preload flag background token', () => {
        expect(readText('src/styles/tokens.css')).toContain(`--color-flag-bg: ${LAUNCH_COLOR};`);
    });

    it('should match the theme-color meta in index.html', () => {
        expect(readText('index.html')).toContain(
            `<meta name="theme-color" content="${LAUNCH_COLOR}" />`,
        );
    });
});

describe('search engines (Functional Spec FR-011)', () => {
    it('should ask robots not to index or follow the app in index.html', () => {
        expect(readText('index.html')).toContain(
            '<meta name="robots" content="noindex, nofollow" />',
        );
    });

    it('should serve a robots.txt that disallows everything', () => {
        expect(readText('public/robots.txt')).toBe('User-agent: *\nDisallow: /\n');
    });

    it('should keep robots.txt out of the service worker navigation fallback', () => {
        const denied = (path: string) => NAVIGATE_FALLBACK_DENYLIST.some((rule) => rule.test(path));
        expect(denied('/robots.txt')).toBe(true);
        expect(denied('/')).toBe(false);
        expect(denied('/index.html')).toBe(false);
    });
});

// T-115：T-010 嘅 spike 頁拆咗，`/spike.html` 同其他唔認得嘅路徑一樣，由導航 fallback 換成 app
describe('retired spike page (T-115)', () => {
    it('should let the navigation fallback serve the app for the old spike path', () => {
        const denied = (path: string) => NAVIGATE_FALLBACK_DENYLIST.some((rule) => rule.test(path));
        expect(denied('/spike.html')).toBe(false);
        expect(denied('/spike')).toBe(false);
    });
});
