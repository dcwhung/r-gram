// @vitest-environment node
/*
 * 介面文字要經 `t()`（Functional Spec FR-037）：src 入面（語言檔同測試除外）嘅字串、template、JSX 文字唔可以有中文字。
 * 用 TypeScript parser 行語法樹，註解唔計
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url));
const HAN_RUN = /[\p{Script=Han}、-〿！-￯]+/gu;
const SOURCE = /\.tsx?$/;
const SKIPPED = /(^i18n\/)|(\.test\.tsx?$)/;

const isTextNode = (node: ts.Node): boolean =>
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateHead(node) ||
    ts.isTemplateMiddle(node) ||
    ts.isTemplateTail(node) ||
    ts.isJsxText(node);

const hanIn = (path: string): string[] => {
    const kind = path.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.TSX;
    const source = readFileSync(`${SRC_DIR}${path}`, 'utf8');
    const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, kind);
    const hits: string[] = [];
    const visit = (node: ts.Node): void => {
        if (isTextNode(node)) hits.push(...(node.getText(file).match(HAN_RUN) ?? []));
        ts.forEachChild(node, visit);
    };
    visit(file);
    return hits.map((text) => `${path}: ${text}`);
};

describe('hard-coded text', () => {
    it('should keep every Chinese UI string in the language file', () => {
        const files = readdirSync(SRC_DIR, { recursive: true, encoding: 'utf8' })
            .map((path) => path.replaceAll('\\', '/'))
            .filter((path) => SOURCE.test(path) && !SKIPPED.test(path));
        expect(files.length).toBeGreaterThan(0);
        expect(files.flatMap(hanIn)).toEqual([]);
    });
});
