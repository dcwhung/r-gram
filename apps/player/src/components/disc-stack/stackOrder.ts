/*
 * 碟疊嘅次序（純函數；設計稿第 20 版 stackOffset()、STACK_LOOP、discs()）：頭尾相接，揀中嗰隻前面一隻、
 * 其餘喺後面（指住 ♥ 時下一隻係第一隻碟；指住第一隻碟時前面係 ♥）。按離揀中嗰隻幾遠由底畫到頂：
 * 下一隻永遠疊喺而家隻碟上面。
 */
import { mod } from '../../utils/ring';

/** 揀中嗰隻碟前面有幾多隻（其餘喺後面） */
const BEFORE = 1;
/** 見到嘅範圍外面再多畫一隻：入嚟同出去嘅碟都有過場 */
const EDGE = 1;

export interface StackSlot {
    /** 第幾隻碟（刻度次序） */
    index: number;
    /** 離揀中嗰隻幾遠（−EDGE − 1 至 shown.to + EDGE） */
    offset: number;
}

/** 第 index 隻碟離揀中嗰隻幾遠：−1 至 count − 2（揀中嗰隻 = 0，淨係一隻碟都係） */
export const stackOffset = (index: number, current: number, count: number): number =>
    index === current ? 0 : mod(index - current + BEFORE, count) - BEFORE;

/**
 * 畫邊幾隻碟、畫喺邊（由底到頂）：見到嘅範圍（shown）前後各加 EDGE 隻。前面嗰隻只得一個「前面」位，
 * 所以啱啱出咗去（前面第二隻）嘅碟用圈尾嗰個位當佢（碟多過範圍先有）。
 * 碟多過範圍時，轉一格留低嘅碟先後唔變（React 唔使搬佢哋喺 DOM 嘅位，CSS 過場唔會斷）。
 * 已接受嘅限制（S-217）：條目 ≤ 5 時範圍包住成個圈，前面嗰隻一步之後換去後面，React 要搬佢，佢嘅過場會斷；
 * ≥ 7 冇呢個問題（真 catalog 22 個）。DiscStack.test.tsx「small catalogues」鎖住呢條界線
 */
export const stackSlots = (
    count: number,
    current: number,
    shown: { from: number; to: number },
): StackSlot[] => {
    const slots: StackSlot[] = [];
    for (let index = 0; index < count; index += 1) {
        const ahead = stackOffset(index, current, count);
        const offset = ahead <= shown.to + EDGE ? ahead : ahead - count;
        if (offset >= shown.from - EDGE) slots.push({ index, offset });
    }
    return slots.sort((a, b) => a.offset - b.offset);
};
