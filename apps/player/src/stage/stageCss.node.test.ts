// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 拎走所有空白：唔理 Prettier 點斷行 */
const squash = (text: string) => text.replace(/\s+/g, '');

/** 淨係呢個 selector（成行）嘅規則嘅宣告（冇空白） */
const ruleOf = (css: string, selector: string): string => {
    const start = css.search(new RegExp(`^${escape(selector)} \\{`, 'm'));
    if (start < 0) return '';
    return squash(css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start)));
};

/** 規則有冇呢句宣告（比較時唔理空白） */
const expectDeclaration = (rule: string, declaration: string) =>
    expect(rule).toContain(squash(declaration));

const STAGE = read('./stage.css');
const TV = read('../components/tv/tv.css');
const PRELOAD = read('../components/flag/preload.css');

/*
 * T-117（B-094）：底色同貼底嘅唱片機畫到螢幕最頂最底。外框由螢幕頂去到底、闊度同舞台一樣，
 * 喺螢幕邊剪；舞台本身唔再剪，入面蓋成個舞台嘅層向上下伸到外框邊。
 */
describe('stage.css bleed', () => {
    it('should clip at the frame: the whole screen height, the stage width', () => {
        const frame = ruleOf(STAGE, '.stage-frame');
        expectDeclaration(frame, 'top: 0;');
        expectDeclaration(frame, 'bottom: 0;');
        expectDeclaration(frame, 'left: var(--stage-offset-x, 0);');
        expectDeclaration(frame, 'width: calc(var(--u) * var(--stage-width-units));');
        expectDeclaration(frame, 'overflow: clip;');
    });

    // S-272：唔識 clip 嘅舊瀏覽器（Safari < 16）用 hidden：要寫喺 clip 前面，識 clip 嘅就用後面嗰句
    it('should fall back to overflow: hidden before overflow: clip', () => {
        const frame = ruleOf(STAGE, '.stage-frame');
        expect(frame.indexOf('overflow:hidden;')).toBeGreaterThanOrEqual(0);
        expect(frame.indexOf('overflow:hidden;')).toBeLessThan(frame.indexOf('overflow:clip;'));
    });

    it('should let the stage draw outside its own box (the frame clips)', () => {
        const stage = ruleOf(STAGE, '.stage');
        expect(stage).not.toMatch(/overflow\s*:/);
        expectDeclaration(stage, 'top: var(--stage-offset-y, 0);');
    });

    it('should share the bleed as an inset for layers that cover the whole screen', () => {
        expectDeclaration(
            ruleOf(STAGE, '.stage-frame'),
            '--stage-bleed-inset: calc(var(--u) * var(--stage-bleed-top) * -1) 0 calc(var(--u) * var(--stage-bleed-bottom) * -1);',
        );
    });

    it('should stretch the stage SVG over the bleed above and below', () => {
        const svg = ruleOf(STAGE, '.stage-svg');
        expectDeclaration(svg, 'top: calc(var(--u) * var(--stage-bleed-top, 0) * -1);');
        expectDeclaration(
            svg,
            'height: calc( 100% + var(--u) * (var(--stage-bleed-top, 0) + var(--stage-bleed-bottom, 0)) );',
        );
    });

    it('should guard the bleed bands above and below the stage', () => {
        expectDeclaration(ruleOf(STAGE, '.stage-guard--top'), 'height: var(--stage-offset-y, 0);');
        const bottom = ruleOf(STAGE, '.stage-guard--bottom');
        expectDeclaration(
            bottom,
            'top: calc(var(--stage-offset-y, 0px) + var(--u) * var(--stage-height-units));',
        );
        expectDeclaration(bottom, 'bottom: 0;');
    });

    /*
     * Review W-073（mutant T10）：擋板要接住㩒落去嘅手指，延伸部分先會「㩒唔到」：
     * stage.css 唔可以有 pointer-events（擋板、外框、舞台都唔得：外框設咗會傳落擋板）
     */
    it('should let the guards take pointer events', () => {
        const withoutComments = STAGE.replace(/\/\*[\s\S]*?\*\//g, '');
        expect(withoutComments).not.toMatch(/pointer-events/);
    });
});

/* 蓋成個舞台嘅 HTML 層：MV 電視嘅模糊淡白層（S-262）、Preload 嘅黑底 */
describe('covering layers follow the bleed', () => {
    it('should spread the MV veil (blur and white wash) over the bleed', () => {
        expectDeclaration(ruleOf(TV, '.tv-veil'), 'inset: var(--stage-bleed-inset, 0);');
    });

    it('should paint the Preload black over the bleed behind the flag', () => {
        const bleed = ruleOf(PRELOAD, '.preload::before');
        expectDeclaration(bleed, "content: '';");
        expectDeclaration(bleed, 'position: absolute;');
        expectDeclaration(bleed, 'inset: var(--stage-bleed-inset, 0);');
        expectDeclaration(bleed, 'background: inherit;');
    });
});
