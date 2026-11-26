/**
 * Export the chosen app icons (options C and D) from ../index.html into ../export/<option>/:
 * a self-contained master SVG, the PNG sizes in the page's PLAN and the maskable PNGs.
 * The list of files comes from the page itself (window.RGRAM_ICON.EXPORTS), so the page and the export never disagree.
 *
 * Run: python3 src/build.py && NODE_PATH=/opt/node-tools/node_modules node src/export.cjs   (from _mockups_/app-icon)
 * Uses the pre-installed Playwright + Chromium; every request that is not file: or data: is blocked.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PAGE = path.join(ROOT, 'index.html');
const OUT = path.join(ROOT, 'export');
const LOCAL = ['file:', 'data:'];
const PAGE_VIEWPORT = { width: 1280, height: 900 };

const blockRemote = (route) => (LOCAL.some((scheme) => route.request().url().startsWith(scheme)) ? route.continue() : route.abort());

/** Page that holds one icon at its real pixel size, transparent around it */
const iconPage = (svg, px) =>
    `<!doctype html><html><head><style>html, body { margin: 0; background: transparent; } svg { display: block; width: ${px}px; height: ${px}px; }</style></head><body>${svg}</body></html>`;

const renderPng = async (context, svg, px, target) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: px, height: px });
    await page.setContent(iconPage(svg, px));
    await page.screenshot({ path: target, omitBackground: true, clip: { x: 0, y: 0, width: px, height: px } });
    await page.close();
};

const readme = (dirs, roles, items) =>
    [
        '# R Gram app icon（export）',
        '',
        '由 `src/export.cjs` 生成，唔好人手改；設計稿：`_mockups_/app-icon/index.html`。接入 app 係 T-039。',
        '',
        '| 資料夾 | 方案 | 用途 |',
        '| --- | --- | --- |',
        ...Object.entries(dirs).map(([key, dir]) => `| \`${dir}/\` | ${key} | ${roles[key]} |`),
        '',
        '每個資料夾都有下面嘅檔：',
        '',
        '| 檔案 | 用途 | 精細度 | 形狀 |',
        '| --- | --- | --- | --- |',
        ...items.map((item) => `| \`${item.file}\` | ${item.use} | ${item.detail} | ${item.shape} |`),
        '',
        '形狀：`rounded` = 透明圓角；`square` = 鋪滿正方形（iOS 自己切圓角）；`maskable` = 鋪滿，碟同唱臂縮入中間 80% 安全圓。',
        '',
    ].join('\n');

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: PAGE_VIEWPORT, deviceScaleFactor: 1 });
    await context.route('**/*', blockRemote);
    const source = await context.newPage();
    await source.goto(`file://${PAGE}`);
    const { dirs, roles, items } = await source.evaluate(() => ({ dirs: window.RGRAM_ICON.EXPORT_DIRS, roles: window.RGRAM_ICON.EXPORT_ROLE, items: window.RGRAM_ICON.EXPORTS }));
    for (const [key, dir] of Object.entries(dirs)) {
        fs.mkdirSync(path.join(OUT, dir), { recursive: true });
        for (const item of items) {
            const svg = await source.evaluate(([k, detail, shape]) => window.RGRAM_ICON.standalone(k, detail, shape), [key, item.detail, item.shape]);
            const target = path.join(OUT, dir, item.file);
            if (item.file.endsWith('.svg')) fs.writeFileSync(target, `${svg}\n`);
            else await renderPng(context, svg, item.px, target);
            console.log(`${dir}/${item.file}`);
        }
    }
    fs.writeFileSync(path.join(OUT, 'README.md'), readme(dirs, roles, items));
    await browser.close();
})();
