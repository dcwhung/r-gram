/**
 * 設計稿 ART：每隻碟以原點為中心、半徑 500 畫一次，位置同大細由外層 transform 決定。
 * 碟面上嘅絕對數值（線粗、落影下移、濾鏡模糊）都係以呢個半徑做準，跟住外層 scale 縮放。
 */
export const DISC_ART_RADIUS = 500;

/** 設計稿 discArt() 嘅絕對數值：以半徑 DISC_ART_RADIUS 畫，跟外層 scale 縮放（唔係跟碟半徑 r 計） */
export const DISC_ART = {
    /** 落影向下移幾多 */
    shadowDrop: 8,
    /** 碟邊嗰條線 */
    edgeWidth: 1.2,
    /** 透明膠圈外緣白線：由膠圈邊縮入幾多、線粗 */
    clearEdge: { inset: 1.5, width: 2.5 },
    /** 透明膠圈內側暗線：由膠圈邊縮入幾多（以碟半徑做 1）、線粗 */
    clearInner: { inset: 0.014, width: 2.5 },
    /** 碟孔嗰條線 */
    holeWidth: 1.5,
} as const;
