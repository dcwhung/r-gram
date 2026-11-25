/*
 * 斷行（設計稿第 18 版 breakAt()；Functional Spec D51）：喺闊度之內斬開一行。
 * 優先喺空格位斷；中文字之間任何位都斷得；英文字、數字、括號（半形）唔喺中間斬，成個字搬去下一行。
 * 一個字本身已經闊過成行先喺字中間斬（唔係就永遠放唔落）。按 code point 計，唔會切開 emoji。
 */

/** 設計稿 isWordChar()：U+2E80 之前、唔係空格（半形或者全形）嘅字元連埋一齊係一個「字」 */
const CJK_FROM = 0x2e80;
const IDEOGRAPHIC_SPACE = '　';

const isWordChar = (char: string | undefined): boolean =>
    char !== undefined &&
    char !== ' ' &&
    char !== IDEOGRAPHIC_SPACE &&
    (char.codePointAt(0) ?? CJK_FROM) < CJK_FROM;

/** 由頭計起，放得落幾多個字元 */
const fittingCount = (
    chars: readonly string[],
    width: number,
    measure: (text: string) => number,
) => {
    let count = 0;
    while (count < chars.length && measure(chars.slice(0, count + 1).join('')) <= width) count += 1;
    return count;
};

/** 斷位唔可以喺一個字中間：向前退到字頭；成行都係同一個字就照原位斬 */
const wordStart = (chars: readonly string[], end: number): number => {
    let cut = end;
    while (cut > 0 && isWordChar(chars[cut]) && isWordChar(chars[cut - 1])) cut -= 1;
    return cut === 0 ? end : cut;
};

/** [呢行, 剩低]；斷位兩邊嘅空格唔要。全部放得落 = [text, ''] */
export const breakAt = (
    text: string,
    width: number,
    measure: (text: string) => number,
): [string, string] => {
    const chars = Array.from(text);
    const end = fittingCount(chars, width, measure);
    if (end === chars.length) return [text, ''];
    const cut = wordStart(chars, end);
    return [chars.slice(0, cut).join('').trimEnd(), chars.slice(cut).join('').trimStart()];
};
