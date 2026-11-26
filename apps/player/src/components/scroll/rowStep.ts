/*
 * 鍵盤喺一列行之間移（純函數；歌單欄 T-049 review W-042、弧線歌單 T-037 共用）：
 * 上下鍵一行、Page Up／Down 隔一版、Home／End 頭尾；灰色行（未有音檔）唔停，跳過。
 */

const STEPS: Readonly<Record<string, (perPage: number) => number>> = {
    ArrowDown: () => 1,
    ArrowUp: () => -1,
    PageDown: (perPage) => perPage,
    PageUp: (perPage) => -perPage,
};

/**
 * 由 current 行移 step 行（正 = 向下），`pressable` = 停得嘅行（由細到大）。目標行停唔到就向同一方向搵最近停得嗰行，
 * 去到盡頭就停喺最後（最前）停得嗰行；冇行停得 = null
 */
export const stepRowIndex = (
    current: number,
    step: number,
    pressable: readonly number[],
): number | null => {
    const target = current + step;
    if (step > 0) return pressable.find((index) => index >= target) ?? pressable.at(-1) ?? null;
    return pressable.findLast((index) => index <= target) ?? pressable[0] ?? null;
};

/** 按鍵之後嘅行；唔係呢幾個鍵 = null（Enter／空白鍵留畀行） */
export const nextRowIndex = (
    key: string,
    current: number,
    pressable: readonly number[],
    perPage: number,
): number | null => {
    if (key === 'Home') return pressable[0] ?? null;
    if (key === 'End') return pressable.at(-1) ?? null;
    const step = Object.hasOwn(STEPS, key) ? STEPS[key]?.(perPage) : undefined;
    return step === undefined ? null : stepRowIndex(current, step, pressable);
};
