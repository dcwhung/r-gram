/*
 * 歌詞當前行（純函數；Technical Spec 實現注意事項 8）：對 `lines[].t`（毫秒、已排序）做 binary search，
 * 回傳最後一行 `t ≤ ms` 嘅 index；第一行之前 = −1。空白嗰行（間奏）都照計：由畫面決定唔 highlight。
 */
import type { LyricLine } from '@r-gram/catalog';

export const BEFORE_FIRST_LINE = -1;

export const activeLine = (lines: readonly Pick<LyricLine, 't'>[], ms: number): number => {
    let low = 0;
    let high = lines.length - 1;
    let found = BEFORE_FIRST_LINE;
    while (low <= high) {
        const middle = (low + high) >> 1;
        if ((lines[middle]?.t ?? Infinity) <= ms) {
            found = middle;
            low = middle + 1;
        } else {
            high = middle - 1;
        }
    }
    return found;
};
