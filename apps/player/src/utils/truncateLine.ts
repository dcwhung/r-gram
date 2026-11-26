/*
 * 一行截短（設計稿第 18 版 trackPanel()：`breakAt(...)[0] + '…'`；Functional Spec FR-036、FR-044、D23）。
 * 字級唔變：放得落就原樣；放唔落就留「…」嘅位，用 breakAt() 揀斷位（英文字、數字、括號唔由中間斬），再加「…」。
 * 拎住嘅碟嘅歌單欄（T-049）同弧線歌單（T-037）共用。左上歌名同碟名會縮字，唔用呢個（見 fitText()、fitLines()）。
 */
import { breakAt } from './breakAt';
import { ELLIPSIS } from './fitText';

export const truncateLine = (
    text: string,
    maxWidth: number,
    measure: (text: string) => number,
): string => {
    if (measure(text) <= maxWidth) return text;
    const [head] = breakAt(text, maxWidth - measure(ELLIPSIS), measure);
    return head.trimEnd() + ELLIPSIS;
};
