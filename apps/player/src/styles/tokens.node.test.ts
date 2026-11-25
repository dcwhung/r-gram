// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MOTION } from '../config/motion';

const CSS = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf8');

/** `--name: value;` → value（冇就 undefined） */
const token = (name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(CSS)?.[1]?.trim();

const GENERIC_FAMILY = /(^|,\s*)(serif|sans-serif|monospace|system-ui)\s*(,|$)/;

describe('tokens.css', () => {
    // W-004：generic family 排喺中文字體前面，瀏覽器會用平台嘅 serif 畫漢字（變明體），輪唔到 Noto Sans HK
    it('should not put a generic family before the CJK families in the mixed stack', () => {
        const mixed = token('--font-mixed') ?? '';
        const beforeCjk = mixed.slice(0, mixed.indexOf('var(--font-cjk)'));
        expect(mixed).toContain('var(--font-cjk)');
        expect(GENERIC_FAMILY.test(beforeCjk.replace(/,\s*$/, ''))).toBe(false);
        expect(mixed.trim().endsWith('var(--font-cjk)')).toBe(true);
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
        ['--motion-scene-tonearm', MOTION.scene.tonearmMs],
        ['--motion-scene-booklet-open', MOTION.scene.bookletOpenMs],
        ['--motion-scene-booklet-close', MOTION.scene.bookletCloseMs],
        ['--motion-scene-tv-rise', MOTION.scene.tvRiseMs],
        ['--motion-scene-crt-on', MOTION.scene.crtOnMs],
        ['--motion-scene-crt-off', MOTION.scene.crtOffMs],
        ['--motion-scene-tv-drop', MOTION.scene.tvDropMs],
    ])('should define %s with the same duration as config/motion.ts', (name, ms) => {
        expect(token(name)).toBe(`${ms}ms`);
    });
});
