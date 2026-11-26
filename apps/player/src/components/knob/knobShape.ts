/*
 * 旋鈕、刻度同 ♥ 嘅形狀數字（設計稿第 18 版 knob()、knobScale()、favHeart()）。
 * 位置同大細喺幾何表（layout.knob、layout.scale）；呢度係畫法（線粗、顏色、比例）。
 */
export const KNOB_SHAPE = {
    /** 旋鈕落影：向右下移、透明度 */
    shadow: { dx: 7, dy: 13, opacity: 0.36 },
    /** 旋鈕身嘅邊線 */
    outline: { color: '#5f5f5f', width: 1.2 },
    /** 滾花邊：由邊縮入幾多、線粗、虛線、顏色 */
    knurl: { inset: 5, width: 9, dash: '3 4.2', color: '#6b6b6b', opacity: 0.7 },
    /** 車床面：半徑 = r − inset */
    face: { inset: 11, rot: 24, bevel: 0.07 },
    /** 指針：由面半徑 × from 畫到面邊縮入 endInset */
    pointer: { from: 0.42, endInset: 9, width: 8 },
    /** 轉碟中外圈著燈：離旋鈕邊幾遠、線粗 */
    glow: { gap: 9, width: 5 },
    /** 刻度線：每幾格一條長線、各種線粗、平時嘅顏色 */
    ticks: { longEvery: 4, onWidth: 5, longWidth: 2.6, shortWidth: 1.6, color: '#77777a' },
    /** ♥：畫嘅大細（平時縮細到 scale.heart）、平時顏色、著燈光暈 */
    heart: {
        full: 38,
        color: '#3a3a3a',
        /** Favourites 碟嘅著燈色（設計稿 ALBUMS.favourites.glow；Favourites 碟嘅樣係 T-070） */
        lit: 'hsl(352 96% 60%)',
        haloExtra: 4,
        haloOpacity: 0.6,
    },
} as const;
