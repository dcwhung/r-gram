// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { withRemoteFont } from './fontSource';

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)));
const CSS = read('./fonts.css').toString('utf8');
const FONT_URL = 'https://media.example/fonts/slab.woff2';

/** 設計稿 fonts.css 嘅本機名（用戶有裝 ITC Lubalin Graph 就用佢；檔案永遠唔入 repo） */
const LOCAL_NAMES = ['ITC Lubalin Graph Std Book', 'LubalinGraphStd-Book', 'ITC Lubalin Graph Std'];
const WOFF2_SIGNATURE = 'wOF2';

/** `@font-face { … }` 逐個拎出嚟：family → 宣告 */
const faces = (css: string): Map<string, string> =>
    new Map(
        [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body = '']) => [
            /font-family:\s*'([^']+)'/.exec(body)?.[1] ?? '',
            body,
        ]),
    );

/** `src:` 嘅每一項（頂層逗號分隔，註解已經拎走） */
const sources = (body: string): string[] =>
    (/src:([^;]*);/.exec(body)?.[1] ?? '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split(/,(?![^(]*\))/)
        .map((item) => item.trim());

const bundledPath = (body: string) => /url\('(\.\.\/assets\/fonts\/[^']+)'\)/.exec(body)?.[1] ?? '';

/* T-044：slab 字體跟設計稿：本機 Lubalin → 媒體 bucket（VITE_FONT_URL）→ 隨 app 嘅 Rokkitt */
describe('fonts.css', () => {
    const families = faces(CSS);

    it('should define the two slab families the tokens use', () => {
        expect([...families.keys()].sort()).toEqual(['RB Slab', 'RB Slab Light']);
    });

    it.each(['RB Slab', 'RB Slab Light'])('should swap %s in once it has loaded', (family) => {
        const body = families.get(family) ?? '';
        expect(body).toMatch(/font-display:\s*swap;/);
        expect(body).toMatch(/font-weight:\s*100 900;/);
    });

    it.each(['RB Slab', 'RB Slab Light'])(
        'should try %s from the local names, then the remote file, then the bundled file',
        (family) => {
            const body = families.get(family) ?? '';
            const bundled = `url('${bundledPath(body)}') format('woff2')`;
            const local = LOCAL_NAMES.map((name) => `local('${name}')`);
            expect(sources(withRemoteFont(body, undefined))).toEqual([...local, bundled]);
            expect(sources(withRemoteFont(body, FONT_URL))).toEqual([
                ...local,
                `url("${FONT_URL}") format("woff2")`,
                bundled,
            ]);
        },
    );

    // 冇設定 VITE_FONT_URL：唔可以有空嘅 url()、兩個逗號或者逗號收尾
    it('should leave no empty or dangling source without a remote font', () => {
        const built = withRemoteFont(CSS, undefined);
        expect(built).not.toMatch(/url\(\s*(['"]?)\s*\1\s*\)/);
        expect(built).not.toMatch(/,\s*,/);
        expect(built).not.toMatch(/,\s*;/);
    });

    it('should bundle two different WOFF2 files with the OFL next to them', () => {
        const paths = [...families.values()].map(bundledPath);
        expect(new Set(paths).size).toBe(2);
        paths.forEach((path) => {
            expect(read(path).subarray(0, WOFF2_SIGNATURE.length).toString('latin1')).toBe(
                WOFF2_SIGNATURE,
            );
        });
        const licence = read('../assets/fonts/OFL.txt').toString('utf8');
        expect(licence).toMatch(/^Copyright 2016 The Rokkit Project Authors/);
        expect(licence).toContain('SIL OPEN FONT LICENSE Version 1.1');
    });

    // 用戶嘅商業字體永遠唔入 repo：字體資料夾淨係得 Rokkitt 同佢嘅授權
    it('should bundle nothing but the two Rokkitt files and their licence', () => {
        expect(CSS).not.toMatch(/url\([^)]*lubalin/i);
        expect(
            readdirSync(fileURLToPath(new URL('../assets/fonts', import.meta.url))).sort(),
        ).toEqual(['OFL.txt', 'rokkitt-extrabold-latin1.woff2', 'rokkitt-light-latin1.woff2']);
    });

    // 設計稿：版本號用 SLAB_LIGHT，碟名用 SLAB
    it('should draw the version in the light face and the Latin album title in the regular one', () => {
        const info = read('../components/info-block/infoBlock.css').toString('utf8');
        const rule = (selector: string) =>
            new RegExp(`\\${selector} \\{([^}]*)\\}`).exec(info)?.[1];
        expect(rule('.info-version')).toContain('font-family: var(--font-slab-light);');
        expect(rule('.info-title--latin')).toContain('font-family: var(--font-slab);');
    });
});
