/*
 * 字母盤字母逐個彈出嘅延遲（Technical Spec CR-003「字母盤過場」；設計稿 DIAL_MOTION）：
 * 打開由第一格順時針逐個出，總時間固定 = discChangeMs（最尾嗰個連自己嘅 dialKeyMs 都喺入面），每格最多遲
 * dialKeyOpenStepMs；收返由最尾一格先收，每格嘅延遲同打開按同一個比例縮。格數幾多都一樣咁快。
 */
import { MOTION } from '../../config/motion';

const { discChangeMs, dialKeyMs, dialKeyOpenStepMs, dialKeyCloseStepMs } = MOTION.scene;

/** 打開時每格遲幾耐 */
const openStepMs = (lastKey: number): number =>
    Math.min(dialKeyOpenStepMs, (discChangeMs - dialKeyMs) / lastKey);

/** 第 pos 格字母（或者細點）遲幾耐先郁；`positions` 連 ♥（♥ 唔喺字母盤，由旋鈕嘅 ♥ 負責） */
export const dialKeyDelayMs = (pos: number, positions: number, opening: boolean): number => {
    const lastKey = positions - 2;
    if (lastKey <= 0) return 0;
    const step = openStepMs(lastKey);
    if (opening) return pos * step;
    return (lastKey - pos) * dialKeyCloseStepMs * (step / dialKeyOpenStepMs);
};
