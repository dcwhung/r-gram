/*
 * 弧線歌單嘅捲動（純函數）：捲動位置以行計（可以有小數，拖動中途）。停低時吸附去最近一行播得嘅歌，
 * 框入面永遠係揀中嗰行（Technical Spec「歌單：拖動 / 滾輪捲動 + 吸附」）；灰色行（未有音檔）唔停喺框入面。
 */

/** 捲動位置限喺第一行同最後一行之間 */
export const clampOffset = (offset: number, count: number): number =>
    Math.min(Math.max(0, count - 1), Math.max(0, offset));

/** 停低嗰行：最近嗰行播得嘅歌；全部都播唔到就最近一行 */
export const snapIndex = (offset: number, pressable: readonly number[], count: number): number => {
    if (pressable.length === 0) return Math.round(clampOffset(offset, count));
    return pressable.reduce((best, index) =>
        Math.abs(index - offset) < Math.abs(best - offset) ? index : best,
    );
};

/** 滾輪：儲夠一行（pitch）先移一行，餘數留到下次（觸控板每次只係幾個單位） */
export const wheelSteps = (units: number, pitch: number): { steps: number; rest: number } => {
    const steps = Math.trunc(units / pitch);
    return { steps, rest: units - steps * pitch };
};
