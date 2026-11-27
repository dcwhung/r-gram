// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CSS = readFileSync(fileURLToPath(new URL('./booklet.css', import.meta.url)), 'utf8');

const REDUCED_OFF = '@media (prefers-reduced-motion: no-preference)';

/** 減少動態效果時唔行嘅部分（media query 入面，到檔尾 keyframes 之前） */
const motionBlock = () => {
    const start = CSS.indexOf(REDUCED_OFF);
    return start < 0 ? '' : CSS.slice(start, CSS.indexOf('@keyframes', start));
};

/* T-072：過場（設計稿 book-in／book-out）；Functional Spec FR-038：減少動態效果 = 即時 */
describe('booklet.css', () => {
    it('should only animate when the user has not asked for reduced motion', () => {
        const outside = CSS.replace(motionBlock(), '');
        expect(motionBlock()).toContain('animation:');
        expect(outside).not.toMatch(/animation:/);
    });

    // 時長全部用 token（tokens.css），唔寫死毫秒
    it('should take every duration from the motion tokens', () => {
        expect(motionBlock()).not.toMatch(/\d+m?s\b/);
        expect(motionBlock()).toContain('var(--motion-scene-booklet-veil-in)');
        expect(motionBlock()).toContain('var(--motion-scene-booklet-veil-out)');
    });

    // T-082：唱到下一行嘅過場同歌詞嘅開收都喺 media query 入面（減少動態效果 = 直接切換）
    it('should move the lyric lines and fan them out only with motion', () => {
        expect(motionBlock()).toContain('var(--motion-scene-lyric-advance)');
        expect(motionBlock()).toContain('var(--motion-scene-booklet-line-fan)');
        expect(CSS.replace(motionBlock(), '')).not.toMatch(/transition:/);
    });

    // 暗層攞到鍵盤 focus（=「關閉歌書」）：畫虛線（SVG outline 喺 Safari 唔可靠）
    it('should draw a dashed line around the focused veil', () => {
        expect(CSS).toMatch(/\.booklet-veil:focus-visible\s*\{[^}]*stroke-dasharray/);
    });
});
