/**
 * Capture the confirmed player home scene (first stage of _mockups_/home-turntable/index.html) as src/player-home.jpg.
 * build.py embeds that picture in the "in the interface" preview. Re-run only when the player mockup changes.
 *
 * Run: node src/capture_home.cjs   (from _mockups_/app-icon; uses the pre-installed Playwright + Chromium)
 */
const path = require('path');
const { chromium } = require('playwright');

const SOURCE = path.resolve(__dirname, '../../home-turntable/index.html');
const TARGET = path.resolve(__dirname, 'player-home.jpg');
const VIEWPORT = { width: 1280, height: 900 };
const PIXEL_RATIO = 2;
const JPEG_QUALITY = 86;
const LOCAL = ['file:', 'data:'];

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: PIXEL_RATIO });
    await context.route('**/*', (route) => (LOCAL.some((scheme) => route.request().url().startsWith(scheme)) ? route.continue() : route.abort()));
    const page = await context.newPage();
    await page.goto(`file://${SOURCE}`);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('svg.stage').first().screenshot({ path: TARGET, type: 'jpeg', quality: JPEG_QUALITY });
    await browser.close();
    console.log(`wrote ${TARGET}`);
})();
