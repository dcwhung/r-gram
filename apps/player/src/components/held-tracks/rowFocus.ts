/*
 * 歌單欄：focus 喺一行時嘅鍵盤（review W-042；Technical Spec「補充：第 18 版」捲動：「焦點喺行時上下鍵」）。
 * 唔係淨係捲欄（focus 會留喺捲咗出欄嘅行，㩒 Enter 播一首睇唔到嘅歌），而係將 focus 移去另一行：
 * 上下鍵一行、Page Up／Down 隔一版、Home／End 頭尾；灰色行唔係掣，跳過（scroll/rowStep.ts，同弧線歌單共用）。
 * 行攞到 focus 會叫欄捲到見到佢（showRow），所以呢度唔使理捲動。
 */
import { nextRowIndex } from '../scroll/rowStep';
import type { ScrollSpec } from './useColumnScroll';

/** 行嘅掣（HeldTrackRow）：`data-index` = 第幾行（由 0 起） */
export const ROW_BUTTON = '[data-part="held-button"]';

/** 一版有幾多行：同欄捲一版（欄高減一行）一樣，最少一行 */
export const rowsPerPage = ({ pitch, room }: Pick<ScrollSpec, 'pitch' | 'room'>): number =>
    Math.max(1, Math.floor((room - pitch) / pitch));

/** 事件喺邊一行（行嘅掣）；喺欄本身 = null */
export const rowIndexOf = (target: EventTarget): number | null =>
    target instanceof Element && target.matches(ROW_BUTTON)
        ? Number(target.getAttribute('data-index'))
        : null;

/** 按鍵將 focus 移去另一行；處理咗就 true（呼叫者 preventDefault） */
export const moveRowFocus = (
    list: Element | null,
    key: string,
    current: number,
    spec: Pick<ScrollSpec, 'pitch' | 'room'>,
): boolean => {
    const buttons = list ? [...list.querySelectorAll<SVGGElement>(ROW_BUTTON)] : [];
    const indexes = buttons.map((button) => Number(button.getAttribute('data-index')));
    const next = nextRowIndex(key, current, indexes, rowsPerPage(spec));
    if (next === null) return false;
    buttons[indexes.indexOf(next)]?.focus();
    return true;
};
