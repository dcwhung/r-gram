/*
 * 字母盤嘅畫法（設計稿第 18 版 dialRing()）：位置同大細喺幾何表（layout.dial），呢度係線粗同比例。
 * 顏色喺 dialRing.css（token）。
 */
export const DIAL_SHAPE = {
    /** 半透明底盤嘅白邊線粗 */
    plateEdge: 5,
    /** 底盤內外兩條灰線：離底盤邊幾遠、線粗 */
    rim: { gap: 3, width: 1.5 },
    /** 揀中嗰格嘅專輯色弧：離外圈幾遠、左右各幾多度、線粗 */
    mark: { inset: 12, halfDeg: 4.5, width: 7 },
    /** 中文字比英文字細（× 字級） */
    cjkScale: 0.82,
} as const;
