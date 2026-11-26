// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CSS = readFileSync(fileURLToPath(new URL('./updateButton.css', import.meta.url)), 'utf8');

/** `selector {` 之後嘅宣告（由 `from` 開始搵第一個） */
const rule = (selector: string, from = 0): string => {
    const at = CSS.indexOf(`${selector} {`, from);
    expect(at).toBeGreaterThanOrEqual(0);
    return CSS.slice(CSS.indexOf('{', at) + 1, CSS.indexOf('}', at));
};

/* T-109：設計稿第 20 版 versionGlow：成粒掣（框線 + 字）一明一暗 1 ↔ 0.2，1.4 秒，ease-in-out，不停 */
describe('updateButton.css', () => {
    it('should blink the button with the motion token, easing in and out, forever', () => {
        expect(rule('.update-blink')).toMatch(
            /animation:\s*update-blink\s+var\(--motion-loop-update-blink\)\s+ease-in-out\s+infinite/,
        );
    });

    it('should go from full opacity down to 0.2 and back', () => {
        expect(CSS).toMatch(/--update-blink-dim:\s*0\.2;/);
        const keyframes = CSS.indexOf('@keyframes update-blink');
        expect(keyframes).toBeGreaterThanOrEqual(0);
        expect(rule('100%', keyframes)).toMatch(/opacity:\s*1;/);
        expect(rule('50%', keyframes)).toMatch(/opacity:\s*var\(--update-blink-dim\);/);
    });

    it('should draw the outline and the text in the flat amber token', () => {
        expect(rule('.update-pill')).toMatch(/stroke:\s*var\(--color-update\);/);
        expect(rule('.update-text')).toMatch(/fill:\s*var\(--color-update\);/);
        expect(rule('.update-text')).toMatch(/font-family:\s*var\(--font-slab\);/);
    });

    it('should stay steady at full opacity when the user asks for reduced motion', () => {
        const media = CSS.indexOf('@media (prefers-reduced-motion: reduce)');
        expect(media).toBeGreaterThanOrEqual(0);
        expect(rule('.update-blink', media)).toMatch(/animation:\s*none;/);
    });
});
