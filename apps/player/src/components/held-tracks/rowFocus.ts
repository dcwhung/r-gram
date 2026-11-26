/*
 * 歌單欄：focus 喺一行時嘅鍵盤（review W-042；Technical Spec「補充：第 18 版」捲動：「焦點喺行時上下鍵」）。
 * 唔係淨係捲欄（focus 會留喺捲咗出欄嘅行，㩒 Enter 播一首睇唔到嘅歌），而係將 focus 移去另一行：
 * 上下鍵一行、Page Up／Down 隔一版、Home／End 頭尾；灰色行唔係掣，跳過。
 * 行攞到 focus 會叫欄捲到見到佢（showRow），所以呢度唔使理捲動。
 */
import type { ScrollSpec } from './useColumnScroll';

/** 行嘅掣（HeldTrackRow）：`data-index` = 第幾行（由 0 起） */
export const ROW_BUTTON = '[data-part="held-button"]';

const STEPS: Readonly<Record<string, (perPage: number) => number>> = {
    ArrowDown: () => 1,
    ArrowUp: () => -1,
    PageDown: (perPage) => perPage,
    PageUp: (perPage) => -perPage,
};

/** 一版有幾多行：同欄捲一版（欄高減一行）一樣，最少一行 */
export const rowsPerPage = ({ pitch, room }: Pick<ScrollSpec, 'pitch' | 'room'>): number =>
    Math.max(1, Math.floor((room - pitch) / pitch));

/**
 * 下一個 focus 嘅行（純函數）。`pressable` = 播得嘅行（由細到大）。目標行係灰色就向同一方向搵最近播得嗰行，
 * 去到盡頭就停喺最後（最前）播得嗰行。唔係呢幾個鍵 = null（Enter／空白鍵留畀行）
 */
export const nextRowIndex = (
    key: string,
    current: number,
    pressable: readonly number[],
    perPage: number,
): number | null => {
    if (key === 'Home') return pressable[0] ?? null;
    if (key === 'End') return pressable.at(-1) ?? null;
    const step = Object.hasOwn(STEPS, key) ? STEPS[key]?.(perPage) : undefined;
    if (step === undefined) return null;
    const target = current + step;
    if (step > 0) return pressable.find((index) => index >= target) ?? pressable.at(-1) ?? null;
    return pressable.findLast((index) => index <= target) ?? pressable[0] ?? null;
};

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
