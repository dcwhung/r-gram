/*
 * 幾何計算（純函數）：由幾何表計位置同量度淨空。元件同 clearance.test.ts 共用，
 * 量度方法同設計稿嘅量度表一致（_mockups_/home-turntable/src/template.html「量度」一節）。
 */
import { DESIGN_WIDTH } from './fitStage';
import type { Point, StageLayout } from './layouts/types';

const DEG_TO_RAD = Math.PI / 180;

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const lerp = (from: number, to: number, k: number) => from + (to - from) * k;

/** 極座標 → 舞台座標：0° 向右，順時針為正（y 向下） */
export const polar = (centre: Point, radius: number, deg: number): Point => ({
    x: centre.x + radius * Math.cos(deg * DEG_TO_RAD),
    y: centre.y + radius * Math.sin(deg * DEG_TO_RAD),
});

/** 圓喺高度 y 嘅左邊緣（x 座標） */
export const circleLeftAt = (centre: Point, radius: number, y: number): number =>
    centre.x - Math.sqrt(radius ** 2 - (y - centre.y) ** 2);

/** 轉盤喺高度 y 嘅左邊緣（x 座標） */
export const platterLeftAt = ({ disc, platter }: StageLayout, y: number): number =>
    circleLeftAt(disc, platter.r, y);

/** 第 pos 格刻度（由 0 開始）嘅角度 */
export const scaleAngle = ({ scale }: StageLayout, pos: number): number =>
    scale.fromDeg + pos * scale.stepDeg;

/** 細掣連光圈嘅外半徑 */
export const buttonOuterRadius = ({ buttons }: StageLayout): number =>
    buttons.r + buttons.ringGap + buttons.ringWidth;

/** 最細感應範圍嘅邊長（設計單位） */
export const hitSizeUnits = ({ clearance }: StageLayout): number =>
    clearance.hitPt / (clearance.viewportPt / DESIGN_WIDTH);

/**
 * ♥ = 刻度最後一格（positions − 1）。平時喺嗰格刻度線外面；轉碟時（open 0 → 1）沿同一個角度滑出去字母盤。
 */
export const heartPoint = (layout: StageLayout, positions: number, open = 0): Point => {
    const { knob, scale, dial } = layout;
    const radius = lerp(scale.long + scale.heartGap, dial.letters, open);
    return polar(knob, radius, scaleAngle(layout, positions - 1));
};

/** ♥ 細，所以感應方格由旋鈕邊向外伸（唔同旋鈕重疊）；轉碟時跟住心形 */
export const heartHitPoint = (layout: StageLayout, positions: number, open = 0): Point => {
    const { knob, dial } = layout;
    const closed = knob.r + knob.heartHitGap + hitSizeUnits(layout) / 2;
    return polar(knob, lerp(closed, dial.letters, open), scaleAngle(layout, positions - 1));
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

/** 左下螺絲同最近控件（旋鈕身、刻度線尖、細掣）嘅距離。♥ 嗰格唔計（佢喺另一邊） */
export const screwGap = (layout: StageLayout, positions: number): number => {
    const { knob, scale, screws, buttons } = layout;
    const screw = screws.points[screws.zoneIndex];
    if (!screw) return Number.POSITIVE_INFINITY;
    const tips = Array.from({ length: positions - 1 }, (_, pos) =>
        polar(knob, scale.long, scaleAngle(layout, pos)),
    );
    return Math.min(
        distance(knob, screw) - knob.r,
        ...tips.map((tip) => distance(tip, screw)),
        ...buttons.items.map((button) => distance(button, screw) - buttonOuterRadius(layout)),
    );
};

/** 感應範圍：`round` 係圓形（half = 半徑），`square` 係正方形（half = 半邊長） */
export interface HitArea extends Point {
    shape: 'round' | 'square';
    half: number;
}

/** 主頁所有可以㩒嘅嘢：三粒細掣、唱片夾、旋鈕（用本身大細）、♥ */
export const hitAreas = (layout: StageLayout, positions: number): HitArea[] => {
    const half = hitSizeUnits(layout) / 2;
    const { buttons, disc, knob } = layout;
    return [
        ...buttons.items.map(({ x, y }): HitArea => ({ x, y, shape: 'round', half })),
        { x: disc.x, y: disc.y, shape: 'round', half },
        { x: knob.x, y: knob.y, shape: 'round', half: Math.max(knob.r, half) },
        { ...heartHitPoint(layout, positions), shape: 'square', half },
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
export const minHitGap = (layout: StageLayout, positions: number): number => {
    const areas = hitAreas(layout, positions);
    return Math.min(
        ...areas.flatMap((a, index) => areas.slice(index + 1).map((b) => hitGap(a, b))),
    );
};
