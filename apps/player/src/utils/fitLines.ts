/*
 * 左上歌名（Functional Spec D51，修訂 D23；設計稿第 18 版 fitSong()）：純函數，量度由外面注入。
 * 1. 放得落：原樣
 * 2. 放唔落：縮字（每次 step），最細縮到 minSize
 * 3. 縮到最細都放唔落：喺 minSize 斷成兩行（breakAt()：英文字、數字、括號唔喺中間斬）；
 *    第二行有自己較窄嘅闊度（secondMaxWidth）
 * 4. 兩行都放唔落：第二行尾用「…」（唯一會截短嘅情況）
 */
import { breakAt } from './breakAt';
import { ELLIPSIS, type FitOptions, shrunkSize } from './fitText';

export interface FitLinesOptions extends FitOptions {
    /** 第二行嘅可用闊度（同 measure 同一個單位） */
    secondMaxWidth: number;
}

export interface FittedLines {
    /** 一行或者兩行 */
    lines: string[];
    size: number;
}

/** 第二行放唔落：留返「…」嘅位，喺字與字之間斬 */
const withEllipsis = (rest: string, width: number, measure: (text: string) => number): string => {
    const [kept] = breakAt(rest, width - measure(ELLIPSIS), measure);
    return kept + ELLIPSIS;
};

const twoLines = (text: string, options: FitLinesOptions): string[] => {
    const measure = (part: string) => options.measure(part, options.minSize);
    const [first, rest] = breakAt(text, options.maxWidth, measure);
    const [second, over] = breakAt(rest, options.secondMaxWidth, measure);
    return [first, over ? withEllipsis(rest, options.secondMaxWidth, measure) : second];
};

export const fitLines = (text: string, options: FitLinesOptions): FittedLines => {
    const size = shrunkSize(text, options);
    if (size !== null) return { lines: [text], size };
    return { lines: twoLines(text, options), size: options.minSize };
};
