// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findHanText, findHardCodedText } from './hardCodedText';
import { zhHant } from './zh-Hant';

/*
 * 元件唔可以寫死介面文字（Functional Spec FR-037）：`src/` 入面除咗語言檔同測試，
 * 所有 .ts / .tsx 嘅字串同 JSX 文字都唔可以有中文字（註解可以有）。
 */
const SRC = fileURLToPath(new URL('..', import.meta.url));
const SOURCE_FILE = /\.tsx?$/;
/** 路徑相對 `src/`：測試檔、語言檔、型別宣告唔使驗 */
const EXEMPT = /\.test\.tsx?$|^i18n[\\/]zh-Hant\.ts$|\.d\.ts$/;

const sourceFiles = () =>
    readdirSync(SRC, { recursive: true, encoding: 'utf8' })
        .filter((path) => SOURCE_FILE.test(path) && !EXEMPT.test(path))
        .map((path) => join(SRC, path));

describe('findHardCodedText', () => {
    it('should report CJK characters in string literals and JSX text', () => {
        const source = `const a = '播放';\nexport const B = () => <p>暫停</p>;\n`;
        expect(findHardCodedText(source)).toEqual([
            { line: 1, text: '播放' },
            { line: 2, text: '暫停' },
        ]);
    });

    it('should ignore comments', () => {
        const source = `// 註解\n/* 多行\n   註解 */\nconst a = 1; // 行尾註解\n/** 文件註解 */\n`;
        expect(findHardCodedText(source)).toEqual([]);
    });

    // S-016：以下幾個情況舊嘅 regex 做法會走漏或者誤報
    it('should report JSX text that contains comment-like characters', () => {
        const source =
            'export const A = () => <a>https://example.com/歌</a>;\nexport const B = () => <p>// 播放</p>;\n';
        expect(findHardCodedText(source)).toEqual([
            { line: 1, text: '歌' },
            { line: 2, text: '播放' },
        ]);
    });

    it('should not be confused by quotes inside a regex literal', () => {
        const source =
            'const QUOTE = /"/; // 引號 "x"\nconst TICK = /`/g; // 反引號\nconst n = 1;\n';
        expect(findHardCodedText(source)).toEqual([]);
    });

    it('should ignore a comment inside a template placeholder and report the text around it', () => {
        const source = 'const n = 1;\nconst a = `第 ${/* 註解 */ n} 首`;\n';
        expect(findHardCodedText(source)).toEqual([
            { line: 2, text: '第' },
            { line: 2, text: '首' },
        ]);
    });

    it('should report attribute values and multi-line JSX text with the right line', () => {
        const source =
            'export const A = () => (\n    <p aria-label="暫停">\n        播放\n    </p>\n);\n';
        expect(findHardCodedText(source)).toEqual([
            { line: 2, text: '暫停' },
            { line: 3, text: '播放' },
        ]);
    });

    // S-023：.ts 檔嘅 `<T>(x: T) => x` 唔係 JSX；當 TSX parse 會將後面嘅註解誤報
    it('should parse a .ts source as TypeScript, not TSX', () => {
        const source = 'const id = <T>(x: T): T => x;\n// 註解一\nexport const a = id(1);\n';
        expect(findHardCodedText(source, 'util.ts')).toEqual([]);
        expect(findHardCodedText("export const a = '播放';\n", 'util.ts')).toEqual([
            { line: 1, text: '播放' },
        ]);
    });

    it('should not treat // inside a string as a comment', () => {
        expect(findHardCodedText(`const url = 'https://example.com/歌';\n`)).toEqual([
            { line: 1, text: '歌' },
        ]);
    });
});

/** W-007：PWA 名稱同描述都係介面文字，要由語言檔嚟；`src/` 以外呢兩個檔都唔可以寫死中文 */
describe('player shell files', () => {
    const APP_ROOT = fileURLToPath(new URL('../..', import.meta.url));
    const HTML_COMMENT = /<!--[\s\S]*?-->/g;
    const read = (name: string) => readFileSync(join(APP_ROOT, name), 'utf8');

    it('should not hard-code UI text in vite.config.ts', () => {
        expect(findHardCodedText(read('vite.config.ts'), 'vite.config.ts')).toEqual([]);
    });

    it('should not hard-code UI text in index.html', () => {
        const html = read('index.html').replace(HTML_COMMENT, '');
        expect(findHanText(html)).toEqual([]);
    });

    it('should take the description from the locale file', () => {
        expect(zhHant.app.description).toBe('歌迷自製的 RubberBand 唱片機（非官方）');
        expect(read('index.html')).toContain('content="%APP_DESCRIPTION%"');
        expect(read('vite.config.ts')).toContain('zhHant.app.description');
    });
});

describe('player source', () => {
    it('should keep all UI text in the locale file', () => {
        // 路徑一錯就會掃唔到任何檔而空過：先確認真係掃到 source
        expect(sourceFiles().some((file) => file.endsWith(join('app', 'App.tsx')))).toBe(true);
        const offenders = sourceFiles().flatMap((file) =>
            findHardCodedText(readFileSync(file, 'utf8'), file).map((hit) => ({ file, ...hit })),
        );
        expect(offenders).toEqual([]);
    });
});
