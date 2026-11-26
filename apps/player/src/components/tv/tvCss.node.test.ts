// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
const TV_CSS = read('./tv.css');
const TOKENS = read('../../styles/tokens.css');

/* S-261：電視嘅顏色係 token（tokens.css），tv.css 唔寫死顏色 */
describe('tv.css colours', () => {
    it('should not write colours into tv.css', () => {
        const withoutComments = TV_CSS.replace(/\/\*[\s\S]*?\*\//g, '');
        expect(withoutComments.match(/#[0-9a-f]{3,8}\b|rgba?\(/gi) ?? []).toEqual([]);
    });

    it('should define every colour token tv.css uses', () => {
        const used = new Set(TV_CSS.match(/--color-[\w-]+/g) ?? []);
        const missing = [...used].filter((name) => !new RegExp(`${name}:`).test(TOKENS));
        expect(used.size).toBeGreaterThan(0);
        expect(missing).toEqual([]);
    });
});
