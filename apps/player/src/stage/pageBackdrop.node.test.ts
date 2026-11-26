// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const readStyle = (name: string) =>
    readFileSync(fileURLToPath(new URL(`../styles/${name}`, import.meta.url)), 'utf8');

/** `html, body { … }` 嗰段規則嘅內容 */
const pageRule = (css: string): string => /html,\s*body\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';

/*
 * Safari 分頁嘅狀態列同工具列後面唔屬於舞台：瀏覽器用頁面（body）嘅底色填。
 * 所以頁面底色要跟場景（`--stage-backdrop`，見 useStageBackdrop），唔可以寫死 Preload 嘅黑色。
 */
describe('page background outside the stage', () => {
    it('should follow the scene backdrop', () => {
        expect(pageRule(readStyle('global.css'))).toContain('background: var(--stage-backdrop,');
    });

    it('should stay black until the app has set a backdrop (no light flash before Preload)', () => {
        expect(pageRule(readStyle('global.css'))).toContain(
            'background: var(--stage-backdrop, var(--color-flag-bg));',
        );
    });
});
