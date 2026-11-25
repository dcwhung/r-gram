const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * 用戶有冇要求減少動態效果。每次叫都重新讀（唔 cache）：用戶可以喺 app 開住嘅時候改系統設定。
 * 動畫開始嗰刻先叫。
 */
export const prefersReducedMotion = (): boolean =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches;

/** 過場實際用幾耐：減少動態效果時係 0（狀態即時切換，唔等動畫） */
export const durationFor = (tokenMs: number): number => (prefersReducedMotion() ? 0 : tokenMs);
