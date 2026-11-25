/*
 * 幾何資料表嘅型別。版面數字係資料唔係 code：每種裝置一份表，元件只讀表。
 * 所有長度係設計單位（1080 × 1920 基準）；角度係度，0° 向右、順時針為正（y 向下）。
 */
export type LayoutId = 'phone';

export interface Point {
    x: number;
    y: number;
}

export type ButtonId = 'booklet' | 'mv' | 'mode';

export interface StageLayout {
    id: LayoutId;
    /** 主頁嘅碟（圓心、半徑） */
    disc: Point & { r: number };
    /** 轉盤：淺色車床鋁面，碟放上去只見到外面一圈 */
    platter: { r: number };
    /** 碟芯（以碟半徑做 1）：透明膠圈外徑、碟孔（= 唱片夾）、銀邊內徑 */
    hub: { clear: number; clamp: number; rim: number };
    /** 唱臂：軸心、長度、底座半徑、泊位同落針角度；`bend` = 針頭殼向邊一邊彎（−1：臂向右伸時向上，即係向碟心） */
    arm: Point & {
        length: number;
        base: number;
        parkDeg: number;
        playDeg: number;
        bend: 1 | -1;
    };
    /** 轉碟時其他碟沿弧線排 */
    orbit: {
        r: number;
        startDeg: number;
        stepDeg: number;
        scale: number;
        veil: number;
        spread: number;
    };
    /** 三粒細掣：半徑、光圈、icon 大細同位置 */
    buttons: {
        r: number;
        ringGap: number;
        ringWidth: number;
        iconSize: number;
        items: readonly (Point & { id: ButtonId })[];
    };
    /** 轉碟旋鈕；`heartHitGap` = ♥ 嘅感應方格離旋鈕邊幾遠（方格由旋鈕邊向外伸，唔同旋鈕重疊） */
    knob: Point & { r: number; heartHitGap: number };
    /** 刻度弧：固定由 fromDeg 去到 toDeg；每張專輯一格平均分佈，最尾一格（toDeg）係 ♥ */
    scale: {
        fromDeg: number;
        toDeg: number;
        inner: number;
        outer: number;
        long: number;
        heart: number;
        heartGap: number;
    };
    /** 轉碟時環繞旋鈕嘅字母盤 */
    dial: { inner: number; outer: number; letters: number; current: number; other: number };
    /** 螺絲；`zoneIndex` 嗰粒（左下）周圍唔放控件 */
    screws: { points: readonly Point[]; zoneIndex: number };
    /** 歌單同歌書：沿住同碟同心嘅弧線排 */
    arc: { r: number; stepDeg: number };
    /** 淨空同感應範圍規則（Functional Spec CR-002） */
    clearance: {
        /** 掣（連光圈）同 CD */
        cd: number;
        /** 任何控件同轉盤邊 */
        platter: number;
        /** 細掣（連光圈）同旋鈕刻度 */
        controlGap: number;
        /** 左下螺絲周圍 */
        screwZone: number;
        /** 最細感應範圍（pt）同呢個版面嘅參考闊度（pt）：用嚟將 pt 換算做設計單位 */
        hitPt: number;
        viewportPt: number;
    };
}
