/*
 * 斷行（設計稿第 18 版 breakAt()；Functional Spec D51；backlog B-070）：喺闊度之內斬開一行。
 * 由頭放到放唔落為止，就喺嗰個位斷；但斷位唔可以喺兩個「字元」中間（U+2E80 之前、唔係空格嘅字元：
 * 英文字母、數字、半形括號同標點），遇到就向前退到嗰串字元嘅開頭，成串搬去下一行。
 * 所以英文字、數字、括號連住嘅字唔會被斬開；中文字之間同空格前後任何位都斷得，有空格嘅括號片語可以喺空格斷。
 * 唔係「先揀空格」：放得落嘅中文字照放。成行都係同一串字元（本身已經闊過成行）先喺中間斬，唔係就永遠放唔落。
 * 斷位兩邊嘅空格唔要。按 code point 計，唔會切開 emoji。
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
