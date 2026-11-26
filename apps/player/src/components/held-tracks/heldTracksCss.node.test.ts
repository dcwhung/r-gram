// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CSS = readFileSync(fileURLToPath(new URL('./heldTracks.css', import.meta.url)), 'utf8');

/** 包含呢個 selector 嘅規則嘅宣告（selector 可以同其他 selector 一齊寫） */
const declarationsOf = (selector: string): string => {
    const at = CSS.indexOf(selector);
    if (at < 0) return '';
    return CSS.slice(CSS.indexOf('{', at) + 1, CSS.indexOf('}', at)).trim();
};

/* S-179：欄本身（長歌單）攞到鍵盤 focus：喺欄外圍畫同行一樣嘅虛線框 */
describe('heldTracks.css', () => {
    it('should draw the same dashed frame around the focused column as around a focused row', () => {
        const row = declarationsOf(".held-button:focus-visible [data-part='held-hit']");
        const column = declarationsOf(".held-list:focus-visible ~ [data-part='held-frame']");
        expect(row).toContain('stroke-dasharray');
        expect(column).toBe(row);
    });
});
