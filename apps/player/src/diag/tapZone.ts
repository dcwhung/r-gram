/** 開關診斷：右上版本號 3 秒內㩒 5 下 */
export const DIAG_TAP_COUNT = 5;
export const DIAG_TAP_WINDOW_MS = 3000;
/** 版本號字好細：感應範圍最少 44 × 44 CSS px（iOS 最細掣） */
export const MIN_TAP_SIZE = 44;

export interface Point {
    x: number;
    y: number;
}

export interface Rect {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

/** 每㩒一下叫一次（傳入時間 ms）；夠數就回 true 兼重新計 */
export type TapCounter = (now: number) => boolean;

export const createTapCounter = (
    count = DIAG_TAP_COUNT,
    windowMs = DIAG_TAP_WINDOW_MS,
): TapCounter => {
    let taps: number[] = [];
    return (now) => {
        taps = [...taps.filter((time) => now - time <= windowMs), now];
        if (taps.length < count) return false;
        taps = [];
        return true;
    };
};

/** 版本號嘅範圍：上下撐到最少 MIN_TAP_SIZE（以字做中心），右邊伸到畫面邊，最少 MIN_TAP_SIZE 闊 */
export const tapZone = (label: Rect, viewportWidth: number, min = MIN_TAP_SIZE): Rect => {
    const middle = (label.top + label.bottom) / 2;
    const half = Math.max(label.bottom - label.top, min) / 2;
    return {
        left: Math.min(label.left, viewportWidth - min),
        top: middle - half,
        right: viewportWidth,
        bottom: middle + half,
    };
};

export const isInside = ({ x, y }: Point, zone: Rect): boolean =>
    x >= zone.left && x <= zone.right && y >= zone.top && y <= zone.bottom;
