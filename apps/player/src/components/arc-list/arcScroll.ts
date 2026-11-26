/*
 * 弧線歌單嘅捲動（純函數）：捲動位置以行計（可以有小數，拖動中途）。停低時吸附去最近一行播得嘅歌，
 * 框入面永遠係揀中嗰行（Technical Spec「歌單：拖動 / 滾輪捲動 + 吸附」）；灰色行（未有音檔）唔停喺框入面。
 * 第 20 版頭尾相接（設計稿 LIST_LOOP、listRowOf()）：圈 = N 首歌 + 一格接駁位（位置 N）。捲動位置喺圈上；
 * 接駁位唔會停喺框入面，由最後一首去第一首（反方向一樣）係一步。
 */
import { mod, ringDelta } from '../../utils/ring';

/** 上下鍵、Page Up／Down 移幾多行（Home／End 另外處理） */
const STEPS: Readonly<Record<string, (perPage: number) => number>> = {
    ArrowDown: () => 1,
    ArrowUp: () => -1,
    PageDown: (perPage) => perPage,
    PageUp: (perPage) => -perPage,
};

/** 捲動位置摺返入圈（0 至 N + 1，唔包 N + 1）：位置唔會無限咁大 */
export const wrapOffset = (offset: number, count: number): number => mod(offset, count + 1);

/** 框入面（最近）嗰首；接駁位最近時當最後一首（設計稿 listRowOf()）；冇歌 = 0 */
export const framedRow = (offset: number, count: number): number =>
    count > 0 ? Math.min(count - 1, Math.round(wrapOffset(offset, count)) % (count + 1)) : 0;

/** 停低嗰行：圈上最近嗰行播得嘅歌（啱啱喺中間就停 `pressable` 入面排先嗰行）；冇行停得就框入面嗰首 */
export const snapIndex = (offset: number, pressable: readonly number[], count: number): number => {
    const first = pressable[0];
    if (first === undefined) return framedRow(offset, count);
    const away = (index: number) => Math.abs(ringDelta(offset, index, count + 1));
    return pressable.reduce((best, index) => (away(index) < away(best) ? index : best), first);
};

/**
 * 由 current 行移 step 行（正 = 向下），喺 N 首歌嘅圈上（跳過接駁位）。目標行停唔到就向同一方向搵最近停得嗰行；
 * 冇行停得 = null
 */
export const stepRing = (
    current: number,
    step: number,
    pressable: readonly number[],
    count: number,
): number | null => {
    const first = pressable[0];
    if (first === undefined || count === 0) return null;
    const target = mod(current + step, count);
    const direction = step < 0 ? -1 : 1;
    const ahead = (index: number) => mod((index - target) * direction, count);
    return pressable.reduce((best, index) => (ahead(index) < ahead(best) ? index : best), first);
};

/** 按鍵之後嘅行（頭尾相接）；Home／End = 第一首／最後一首停得嘅行；唔係呢幾個鍵 = null */
export const nextRingIndex = (
    key: string,
    current: number,
    pressable: readonly number[],
    count: number,
    perPage: number,
): number | null => {
    if (key === 'Home') return pressable[0] ?? null;
    if (key === 'End') return pressable.at(-1) ?? null;
    const step = Object.hasOwn(STEPS, key) ? STEPS[key]?.(perPage) : undefined;
    return step === undefined ? null : stepRing(current, step, pressable, count);
};

/** 滾輪：儲夠一行（pitch）先移一行，餘數留到下次（觸控板每次只係幾個單位） */
export const wheelSteps = (units: number, pitch: number): { steps: number; rest: number } => {
    const steps = Math.trunc(units / pitch);
    return { steps, rest: units - steps * pitch };
};
