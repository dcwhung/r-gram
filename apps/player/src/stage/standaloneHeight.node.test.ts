// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const GLOBAL = readFileSync(
    fileURLToPath(new URL('../styles/global.css', import.meta.url)),
    'utf8',
);

/** 拎走註解同所有空白：唔理 Prettier 點斷行 */
const squash = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, '');

/** `@media (display-mode: standalone) { … }` 入面嘅內容（冇空白） */
const standaloneBlock = (css: string): string => {
    const start = css.indexOf('@media (display-mode: standalone)');
    if (start < 0) return '';
    const open = css.indexOf('{', start);
    const close = css.indexOf('}', css.indexOf('}', open) + 1);
    return squash(css.slice(open + 1, close));
};

/*
 * iOS 26+ 主畫面 app：innerHeight、100dvh 喺 793（螢幕 − 頂部安全區）同 852 之間跳，
 * 只有 100vh / 100lvh 一直係成個螢幕。主畫面 app 嘅頁面用 100lvh（舊瀏覽器 100vh），分頁照舊 100dvh。
 */
describe('page height', () => {
    it('should stay 100dvh in a browser tab', () => {
        expect(squash(GLOBAL)).toContain('html,body{height:100%;height:100dvh;');
    });

    it('should be the full screen (100lvh, 100vh fallback) in the home-screen app', () => {
        expect(standaloneBlock(GLOBAL)).toBe('html,body{height:100vh;height:100lvh;}');
    });
});
