/*
 * 電視旋鈕嘅鍵盤（T-061；Functional Spec US-007「鍵盤可以操作（方向鍵）」；WAI-ARIA slider）：
 * 方向鍵上／右 = 加、下／左 = 減；Home／End = 最細／最大。
 */
import { SEEK_STEP_S, VOLUME_KEY_STEP } from '../../mv/mvConfig';

const UP = new Set(['ArrowUp', 'ArrowRight']);
const DOWN = new Set(['ArrowDown', 'ArrowLeft']);
/** 百分比兩位小數就夠（0.5 + 0.05 唔好變成 0.55000000000000004） */
const PERCENT = 100;

const tidy = (level: number) => Math.round(Math.min(1, Math.max(0, level)) * PERCENT) / PERCENT;

/** 音量旋鈕：新音量；唔關事嘅鍵 = null */
export const volumeForKey = (key: string, volume: number): number | null => {
    if (UP.has(key)) return tidy(volume + VOLUME_KEY_STEP);
    if (DOWN.has(key)) return tidy(volume - VOLUME_KEY_STEP);
    if (key === 'Home') return 0;
    if (key === 'End') return 1;
    return null;
};

/** 㩒一下 = 靜音／開返聲 */
export const isMuteKey = (key: string): boolean => key === 'Enter' || key === ' ';

export type SeekMove = { by: number } | { to: number };

/**
 * 快轉／倒轉旋鈕：每下 SEEK_STEP_S 秒；Home = 由頭、End = 尾之前一格
 *（S-263：跳到最尾即刻播完，電視就收埋咗）
 */
export const seekForKey = (key: string, durationSec: number): SeekMove | null => {
    if (UP.has(key)) return { by: SEEK_STEP_S };
    if (DOWN.has(key)) return { by: -SEEK_STEP_S };
    if (key === 'Home') return { to: 0 };
    if (key === 'End') return { to: Math.max(0, durationSec - SEEK_STEP_S) };
    return null;
};
