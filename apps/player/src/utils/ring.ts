/*
 * 頭尾相接嘅圈（純函數；設計稿第 20 版 mod()）：弧線歌單（歌 + 接駁位）同旋鈕（碟 + ♥）共用。
 */

/** 摺返入 0 至 size（唔包 size）；永遠唔會係 −0 */
export const mod = (value: number, size: number): number => ((value % size) + size) % size || 0;

/** 由 from 去 to 嘅最短路（正 = 向前，−size/2 至 size/2） */
export const ringDelta = (from: number, to: number, size: number): number => {
    const half = size / 2;
    return mod(to - from + half, size) - half;
};
