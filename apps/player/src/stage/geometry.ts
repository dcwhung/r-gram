/*
 * 幾何計算（純函數）：由幾何表計位置同量度淨空。元件同 clearance.test.ts 共用，
 * 量度方法同設計稿嘅量度表一致（_mockups_/home-turntable/src/template.html「量度」一節）。
 */
import { DESIGN_WIDTH } from './fitStage';
import type { Point, StageLayout } from './layouts/types';

const DEG_TO_RAD = Math.PI / 180;
/** 一個圈（度）：將零件平均分佈喺一圈時用 */
export const FULL_TURN_DEG = 360;

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const lerp = (from: number, to: number, k: number) => from + (to - from) * k;

/** 極座標 → 舞台座標：0° 向右，順時針為正（y 向下） */
export const polar = (centre: Point, radius: number, deg: number): Point => ({
    x: centre.x + radius * Math.cos(deg * DEG_TO_RAD),
    y: centre.y + radius * Math.sin(deg * DEG_TO_RAD),
});

/** 唱臂中線（由軸心以 deg 伸出嘅直線）喺 x 嘅高度（y）：用嚟驗左上歌名同泊位嘅唱臂唔重疊 */
export const armCentreYAt = ({ arm }: StageLayout, deg: number, x: number): number =>
    arm.y + (x - arm.x) * Math.tan(deg * DEG_TO_RAD);

/** 圓喺高度 y 嘅左邊緣（x 座標） */
export const circleLeftAt = (centre: Point, radius: number, y: number): number =>
    centre.x - Math.sqrt(radius ** 2 - (y - centre.y) ** 2);

/** 轉盤喺高度 y 嘅左邊緣（x 座標） */
export const platterLeftAt = ({ disc, platter }: StageLayout, y: number): number =>
    circleLeftAt(disc, platter.r, y);

/** 刻度格數：每張專輯一格，最尾加 ♥ 一格（CR-003 決定 2） */
export const positionsFor = (albumCount: number): number => albumCount + 1;

/**
 * 第 pos 格刻度（由 0 開始）嘅角度。弧固定由 fromDeg 去到 toDeg，格數幾多都係平均分佈：
 * 第一格喺弧頭、最尾一格（♥）喺弧尾。得一格（冇專輯）就只有 ♥，喺弧尾。
 */
export const scaleAngle = ({ scale }: StageLayout, pos: number, positions: number): number =>
    positions > 1
        ? scale.fromDeg + (pos * (scale.toDeg - scale.fromDeg)) / (positions - 1)
        : scale.toDeg;

/** 細掣連光圈嘅外半徑 */
export const buttonOuterRadius = ({ buttons }: StageLayout): number =>
    buttons.r + buttons.ringGap + buttons.ringWidth;

/** 最細感應範圍嘅邊長（設計單位） */
export const hitSizeUnits = ({ clearance }: StageLayout): number =>
    clearance.hitPt / (clearance.viewportPt / DESIGN_WIDTH);

/**
 * ♥ = 刻度最後一格，永遠喺弧尾（toDeg），同專輯數無關。平時喺嗰格刻度線外面；
 * 轉碟時（open 0 → 1）沿同一個角度滑出去字母盤。
 */
export const heartPoint = (layout: StageLayout, open = 0): Point => {
    const { knob, scale, dial } = layout;
    const radius = lerp(scale.long + scale.heartGap, dial.letters, open);
    return polar(knob, radius, scale.toDeg);
};

/** ♥ 細，所以感應方格由旋鈕邊向外伸（唔同旋鈕重疊）；轉碟時跟住心形 */
export const heartHitPoint = (layout: StageLayout, open = 0): Point => {
    const { knob, dial, scale } = layout;
    const closed = knob.r + knob.heartHitGap + hitSizeUnits(layout) / 2;
    return polar(knob, lerp(closed, dial.letters, open), scale.toDeg);
};

/** 一隻碟喺轉碟時嘅位置同樣：圓心、半徑、透明度、白紗透明度 */
export interface DiscPose extends Point {
    r: number;
    opacity: number;
    veil: number;
}

/**
 * 離揀中嗰隻碟 offset 張嘅碟（設計稿 discPose()）：揀中嗰隻留喺轉盤；其他碟沿弧線排，細啲、蓋白紗。
 * 字母盤閂埋時其他碟散開兼睇唔到，打開時（CSS 過場）沿弧線滑入。只有 `orbit.shown` 範圍入面嘅碟見到。
 */
export const orbitPose = (
    { disc, orbit }: StageLayout,
    offset: number,
    open: boolean,
): DiscPose => {
    if (offset === 0) return { x: disc.x, y: disc.y, r: disc.r, opacity: 1, veil: 0 };
    const pivot = polar(disc, -orbit.r, orbit.startDeg);
    const spread = open ? 1 : 1 + orbit.spread;
    const at = polar(pivot, orbit.r, orbit.startDeg + offset * orbit.stepDeg * spread);
    const shown = open && offset >= orbit.shown.from && offset <= orbit.shown.to;
    return { ...at, r: disc.r * orbit.scale, opacity: shown ? 1 : 0, veil: orbit.veil };
};

/* ---------- 量度（淨空規則） ---------- */

const minButtonGapTo = (layout: StageLayout, radius: number): number =>
    Math.min(
        ...layout.buttons.items.map(
            (button) => distance(button, layout.disc) - radius - buttonOuterRadius(layout),
        ),
    );

/** 細掣（連光圈）同 CD 嘅最近距離 */
export const buttonCdGap = (layout: StageLayout): number => minButtonGapTo(layout, layout.disc.r);

/** 細掣（連光圈）同轉盤邊嘅最近距離 */
export const buttonPlatterGap = (layout: StageLayout): number =>
    minButtonGapTo(layout, layout.platter.r);

/** 旋鈕（連刻度弧）同轉盤邊嘅最近距離 */
export const knobPlatterGap = ({ knob, disc, scale, platter }: StageLayout): number =>
    distance(knob, disc) - scale.long - platter.r;

/** 旋鈕（連刻度）左右兩邊嘅空白：[去畫面左邊, 去轉盤邊]，喺旋鈕圓心嘅高度量 */
export const knobMargins = (layout: StageLayout): [number, number] => {
    const { knob, scale } = layout;
    return [knob.x - scale.long, platterLeftAt(layout, knob.y) - knob.x - scale.long];
};

/** 細掣（連光圈）同旋鈕刻度之間嘅最近距離 */
export const buttonKnobGap = (layout: StageLayout): number =>
    Math.min(
        ...layout.buttons.items.map(
            (button) =>
                distance(button, layout.knob) - buttonOuterRadius(layout) - layout.scale.long,
        ),
    );

/** 左下螺絲同最近控件（旋鈕身、專輯刻度線尖、細掣）嘅距離。♥ 嗰格唔計（佢喺弧尾，另一邊） */
export const screwGap = (layout: StageLayout, positions: number): number => {
    const { knob, scale, screws, buttons } = layout;
    const screw = screws.points[screws.zoneIndex];
    if (!screw) return Number.POSITIVE_INFINITY;
    const tips = Array.from({ length: positions - 1 }, (_, pos) =>
        polar(knob, scale.long, scaleAngle(layout, pos, positions)),
    );
    return Math.min(
        distance(knob, screw) - knob.r,
        ...tips.map((tip) => distance(tip, screw)),
        ...buttons.items.map((button) => distance(button, screw) - buttonOuterRadius(layout)),
    );
};

/** 細唱片機成部唱片機嘅縮細比例（設計稿 MINI.r / PLATTER.r） */
export const miniScale = ({ miniTurntable, platter }: StageLayout): number =>
    miniTurntable.r / platter.r;

/** 細唱片機兩行字（靠右對齊）嘅右邊 */
export const miniLabelX = ({ miniTurntable: mini }: StageLayout): number =>
    mini.x - mini.r - mini.labelGap;

/** 細唱片機嘅感應範圍（設計稿 hitRect）：碟（2r × 2r）再向左伸 hitPad，連埋左邊兩行字 */
export const miniHitBox = ({ miniTurntable: mini }: StageLayout) => ({
    left: mini.x - mini.r - mini.hitPad,
    top: mini.y - mini.r,
    right: mini.x + mini.r,
    bottom: mini.y + mini.r,
});

/**
 * 拎住嘅碟嘅歌單欄欄底（T-049）：旋鈕開住時較高（避開字母盤），鬆手之後較低。
 * 欄底要避開嘅嘢貼底，所以高身手機加返 extraUnits（欄頂貼頂唔郁）
 */
export const heldColumnBottom = (
    { heldTracks }: StageLayout,
    dialOpen: boolean,
    extraUnits = 0,
): number => (dialOpen ? heldTracks.bottomOpen : heldTracks.bottomHeld) + extraUnits;

/** 歌單欄一行嘅感應範圍右邊（由畫面左邊起成行都㩒得，D57） */
export const heldRowHitRight = ({ heldTracks }: StageLayout): number =>
    heldTracks.right + heldTracks.rowReach;

/** 感應範圍：`round` 係圓形（half = 半徑），`square` 係正方形（half = 半邊長） */
export interface HitArea extends Point {
    shape: 'round' | 'square';
    half: number;
}

/**
 * 主頁所有可以㩒嘅嘢：三粒細掣、唱片夾、旋鈕（用本身大細）、♥。
 * 刻度線同字母盤唔係感應目標，♥ 又固定喺弧尾，所以同專輯數無關。
 */
export const hitAreas = (layout: StageLayout): HitArea[] => {
    const half = hitSizeUnits(layout) / 2;
    const { buttons, disc, knob } = layout;
    return [
        ...buttons.items.map(({ x, y }): HitArea => ({ x, y, shape: 'round', half })),
        { x: disc.x, y: disc.y, shape: 'round', half },
        { x: knob.x, y: knob.y, shape: 'round', half: Math.max(knob.r, half) },
        { ...heartHitPoint(layout), shape: 'square', half },
    ];
};

/** 兩個感應範圍之間嘅空隙（負數 = 重疊）。最多一個係正方形 */
const hitGap = (a: HitArea, b: HitArea): number => {
    const [round, other] = a.shape === 'round' ? [a, b] : [b, a];
    if (other.shape === 'round') return distance(round, other) - round.half - other.half;
    const dx = Math.max(Math.abs(round.x - other.x) - other.half, 0);
    const dy = Math.max(Math.abs(round.y - other.y) - other.half, 0);
    return Math.hypot(dx, dy) - round.half;
};

/** 最近兩個感應範圍之間嘅空隙 */
export const minHitGap = (layout: StageLayout): number => {
    const areas = hitAreas(layout);
    return Math.min(
        ...areas.flatMap((a, index) => areas.slice(index + 1).map((b) => hitGap(a, b))),
    );
};
