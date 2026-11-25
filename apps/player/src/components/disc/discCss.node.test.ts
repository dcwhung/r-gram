// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CSS = readFileSync(fileURLToPath(new URL('./disc.css', import.meta.url)), 'utf8');

const MOTION_QUERY = /@media \(prefers-reduced-motion: no-preference\) \{\n([\s\S]*?)\n\}/;
/** 只喺「冇要求減少動態」時先生效嘅規則 */
const MOTION_RULES = MOTION_QUERY.exec(CSS)?.[1] ?? '';
const OTHER_RULES = CSS.replace(MOTION_QUERY, '');

/** `selector { … }` 入面嘅宣告（冇呢條規則就係空字串） */
const declarations = (css: string, selector: string): string => {
    const start = css.indexOf(`${selector} {`);
    if (start < 0) return '';
    return css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start)).trim();
};

/* W-011：暫停時隻碟停喺原位（Technical Spec「轉動用 CSS animation，animation-play-state 控制」；US-004） */
describe('disc.css', () => {
    it('should keep the spin animation on the cover, paused, for one turn of the motion token', () => {
        expect(declarations(MOTION_RULES, '.disc-cover')).toBe(
            'animation: disc-spin var(--motion-scene-disc-rotation) linear infinite paused;',
        );
    });

    it('should only switch the play state while the disc is turning', () => {
        expect(declarations(MOTION_RULES, ".disc-cover[data-spinning='true']")).toBe(
            'animation-play-state: running;',
        );
    });

    // 減少動態效果：隻碟完全唔轉，所以動畫只可以喺 no-preference 入面
    it('should not animate outside the no-preference query', () => {
        expect(MOTION_RULES).not.toBe('');
        expect(OTHER_RULES).not.toMatch(/animation(-[a-z-]+)?\s*:/);
    });
});
