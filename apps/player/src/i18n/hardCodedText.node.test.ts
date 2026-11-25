import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { findHardCodedText } from './hardCodedText';

/*
 * 元件唔可以寫死介面文字（Functional Spec FR-037）：`src/` 入面除咗語言檔同測試，
 * 所有 .ts / .tsx 嘅字串同 JSX 文字都唔可以有中文字（註解可以有）。
 */
const SRC = fileURLToPath(new URL('..', import.meta.url));
const SOURCE_FILE = /\.tsx?$/;
const EXEMPT = /\.test\.tsx?$|[\\/]i18n[\\/]zh-Hant\.ts$|\.d\.ts$/;

const sourceFiles = () =>
    readdirSync(SRC, { recursive: true, encoding: 'utf8' })
        .filter((path) => SOURCE_FILE.test(path) && !EXEMPT.test(path))
        .map((path) => `${SRC}/${path}`);

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

    it('should not treat // inside a string as a comment', () => {
        expect(findHardCodedText(`const url = 'https://example.com/歌';\n`)).toEqual([
            { line: 1, text: '歌' },
        ]);
    });
});

describe('player source', () => {
    it('should keep all UI text in the locale file', () => {
        const offenders = sourceFiles().flatMap((file) =>
            findHardCodedText(readFileSync(file, 'utf8')).map((hit) => ({ file, ...hit })),
        );
        expect(offenders).toEqual([]);
    });
});
