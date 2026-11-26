// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CSS = readFileSync(fileURLToPath(new URL('./updatePrompt.css', import.meta.url)), 'utf8');

/** `.update-prompt { … }` 嘅宣告 */
const promptRule = (): string => {
    const at = CSS.indexOf('.update-prompt {');
    return CSS.slice(CSS.indexOf('{', at) + 1, CSS.indexOf('}', at));
};

/*
 * S-197：提示而家喺用緊 app 時隨時出（播緊、停咗都一樣），唔可以蓋住控件。舞台底部右邊係碟面（㩒 = 開歌單），
 * 所以提示放喺頂部右邊（版本號同螺絲嘅位，唔係控件），避開瀏海（safe-area-inset-top）
 */
describe('updatePrompt.css', () => {
    it('should pin the prompt to the top right, clear of the notch', () => {
        const rule = promptRule();
        expect(rule).toMatch(/\btop:\s*calc\(env\(safe-area-inset-top/);
        expect(rule).toMatch(/\bright:\s*calc\(env\(safe-area-inset-right/);
        expect(rule).not.toMatch(/\bbottom:/);
    });
});
