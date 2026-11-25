// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MOTION } from '../config/motion';

const CSS = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf8');

/** `--name: value;` → value（冇就 undefined） */
const token = (name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(CSS)?.[1]?.trim();

/** 將 `var(--x)` 換成佢嘅值（可以一層套一層），等測試睇到真正嘅字體次序 */
const resolved = (value: string): string =>
    value.replace(/var\((--[\w-]+)\)/g, (_, name: string) => resolved(token(name) ?? ''));

const GENERIC_FAMILY = /(^|,\s*)(serif|sans-serif|monospace|system-ui)\s*(,|$)/;

describe('tokens.css', () => {
    // W-004：generic family 排喺中文字體前面，瀏覽器會用平台嘅 serif 畫漢字（變明體），輪唔到 Noto Sans HK
    it('should not put a generic family before the CJK families in the mixed stack', () => {
        const mixed = token('--font-mixed') ?? '';
        const cjkAt = mixed.indexOf('var(--font-cjk)');
        expect(cjkAt).toBeGreaterThan(0);
        // 連 var() 入面嘅值都展開先驗（之前 `var(--font-slab)` 入面收埋咗 `serif`）
        const beforeCjk = resolved(mixed.slice(0, cjkAt)).replace(/,\s*$/, '');
        expect(beforeCjk).toMatch(/^'RB Slab Light'/);
        expect(GENERIC_FAMILY.test(beforeCjk)).toBe(false);
        expect(mixed.trim().endsWith('var(--font-cjk)')).toBe(true);
    });

    // T-044：slab 字體跟設計稿：「RB Slab」畫碟名同歌號，「RB Slab Light」畫版本號同混排（fonts.css）
    it.each([
        ['--font-slab', 'RB Slab'],
        ['--font-slab-light', 'RB Slab Light'],
        ['--font-mixed', 'RB Slab Light'],
    ])('should start %s with the %s face from fonts.css', (name, family) => {
        expect(token(name)?.split(',')[0]?.trim()).toBe(`'${family}'`);
    });

    it('should end the CJK stack with a generic family', () => {
        expect(token('--font-cjk')).toMatch(/sans-serif$/);
    });

    // config/motion.ts 同 tokens.css 係同一組時長嘅兩份：JS 用前者，CSS 用後者
    it.each([
        ['--motion-feedback-toggle', MOTION.feedback.toggleMs],
        ['--motion-feedback-fade', MOTION.feedback.fadeMs],
        ['--motion-feedback-swap', MOTION.feedback.swapMs],
        ['--motion-scene-disc-change', MOTION.scene.discChangeMs],
        ['--motion-scene-dial-key', MOTION.scene.dialKeyMs],
        ['--motion-scene-disc-rotation', MOTION.scene.discRotationMs],
        ['--motion-scene-tonearm', MOTION.scene.tonearmMs],
        ['--motion-scene-needle-drop', MOTION.scene.needleDropMs],
        ['--motion-scene-booklet-open', MOTION.scene.bookletOpenMs],
        ['--motion-scene-booklet-close', MOTION.scene.bookletCloseMs],
        ['--motion-scene-tv-rise', MOTION.scene.tvRiseMs],
        ['--motion-scene-crt-on', MOTION.scene.crtOnMs],
        ['--motion-scene-crt-off', MOTION.scene.crtOffMs],
        ['--motion-scene-tv-drop', MOTION.scene.tvDropMs],
        ['--motion-scene-flag-fade', MOTION.scene.flagFadeMs],
        ['--motion-scene-preload-step', MOTION.scene.preloadStepMs],
        ['--motion-scene-preload-bar-delay', MOTION.scene.preloadBarDelayMs],
        ['--motion-scene-preload-bar-in', MOTION.scene.preloadBarInMs],
    ])('should define %s with the same duration as config/motion.ts', (name, ms) => {
        expect(token(name)).toBe(`${ms}ms`);
    });
});
