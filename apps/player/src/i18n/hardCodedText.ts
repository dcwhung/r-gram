/* 搵 source 入面寫死嘅中文字（註解唔計）。畀 hardCodedText.node.test.ts 用：介面文字要經 `t()`。 */
export interface HardCodedHit {
    /** 由 1 開始 */
    line: number;
    text: string;
}

/** 漢字，同全形標點（唔計全形空格） */
const CJK_RUN = /[\p{Script=Han}\u3001-\u303f\uff01-\uffef]+/gu;
/**
 * 一次過認字串同註解：字串原樣保留（入面嘅 `//` 唔係註解），註解換成空白（保留換行，行號先唔會走位）。
 * 次序重要：字串排先。
 */
const STRING_OR_COMMENT =
    /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`|\/\/[^\n]*|\/\*[\s\S]*?\*\//g;

const isComment = (token: string) => token.startsWith('//') || token.startsWith('/*');

const stripComments = (source: string): string =>
    source.replace(STRING_OR_COMMENT, (token) =>
        isComment(token) ? token.replace(/[^\n]/g, ' ') : token,
    );

export const findHardCodedText = (source: string): HardCodedHit[] =>
    stripComments(source)
        .split('\n')
        .flatMap((text, index) =>
            [...text.matchAll(CJK_RUN)].map((match) => ({ line: index + 1, text: match[0] })),
        );
