/*
 * 搵 source 入面寫死嘅中文字。畀 hardCodedText.node.test.ts 用：介面文字要經 `t()`（Functional Spec FR-037）。
 * 用 TypeScript parser 行語法樹，只睇字串、template 各段同 JSX 文字；註解同 regex literal 唔計。
 *（之前用 regex 分字串同註解：JSX 文字入面有 `//` 會走漏，regex literal 入面有引號會誤報。）
 */
import ts from 'typescript';

export interface HardCodedHit {
    /** 由 1 開始 */
    line: number;
    text: string;
}

/** 漢字，同全形標點（唔計全形空格） */
const HAN_RUN = /[\p{Script=Han}、-〿！-￯]+/gu;

/** 會變成畫面文字或者屬性值嘅節點 */
const isTextNode = (node: ts.Node): boolean =>
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateHead(node) ||
    ts.isTemplateMiddle(node) ||
    ts.isTemplateTail(node) ||
    ts.isJsxText(node);

const hitsIn = (node: ts.Node, file: ts.SourceFile): HardCodedHit[] => {
    const start = node.getStart(file);
    return [...node.getText(file).matchAll(HAN_RUN)].map((match) => ({
        line: file.getLineAndCharacterOfPosition(start + match.index).line + 1,
        text: match[0],
    }));
};

/** TypeScript / TSX source 入面寫死嘅中文字（按出現次序） */
export const findHardCodedText = (source: string): HardCodedHit[] => {
    const file = ts.createSourceFile(
        'source.tsx',
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
    );
    const hits: HardCodedHit[] = [];
    const visit = (node: ts.Node): void => {
        if (isTextNode(node)) hits.push(...hitsIn(node, file));
        ts.forEachChild(node, visit);
    };
    visit(file);
    return hits;
};

/** 純文字（例如拎走咗註解嘅 HTML）入面嘅中文字 */
export const findHanText = (text: string): HardCodedHit[] =>
    text
        .split('\n')
        .flatMap((line, index) =>
            [...line.matchAll(HAN_RUN)].map((match) => ({ line: index + 1, text: match[0] })),
        );
