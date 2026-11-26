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

describe('heldTracks.css', () => {
    /* S-179：欄本身（長歌單）攞到鍵盤 focus：喺欄外圍畫虛線框 */
    it('should draw a dashed frame around the focused column', () => {
        const column = declarationsOf(".held-list:focus-visible ~ [data-part='held-frame']");
        expect(column).toContain('stroke-dasharray');
    });

    /* B-086 ①：行唔係掣，冇自己嘅 focus 樣式 */
    it('should have no focus style for rows', () => {
        expect(CSS).not.toContain('held-button');
    });
});
