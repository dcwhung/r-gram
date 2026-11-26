/*
 * 弧線排列（純函數；Technical Spec「弧線排列」、設計稿第 18 版 listLayer()）：歌名沿住同碟同心嘅弧線排，
 * 揀中嗰行喺 180°（碟心正左面，框入面），第 k 行喺 180 − k × step（k 正 = 下面）。越遠越細、越淡。
 * `offset` 係捲動位置（以行計，可以有小數）：停喺整數時同設計稿第 18 版一樣；捲動中途字級同淡出按離中心幾近線性過渡
 *（設計稿 v16 drawList()）。
 * 第 20 版頭尾相接（LIST_LOOP、loopWindow()）：圈 = 全部歌 + 一格接駁位（位置 = 歌數，最後一首之後）；
 * 捲動位置喺圈上（任何數都摺返），每首歌同一時間只畫一次。
 */
import { mod } from '../utils/ring';
import { polar } from './geometry';
import type { ArcListLayout, Point, StageLayout } from './layouts';

const DEG_TO_RAD = Math.PI / 180;
/** 揀中嗰行嘅角度：碟心正左面 */
const FOCUS_DEG = 180;
/** 感應範圍上下邊：前後半行 */
const HALF_ROW = 0.5;

export interface ArcRowSpec {
    centre: Point;
    r: number;
    stepDeg: number;
    focusSize: number;
    restSize: number;
    visible: number;
    fade: ArcListLayout['fade'];
    /** 接駁位最淡幾多（佢淡出得比歌名慢） */
    seamMin: number;
}

export interface ArcRowPose {
    index: number;
    /** 行嘅起點（歌號左邊，文字垂直置中） */
    x: number;
    y: number;
    size: number;
    opacity: number;
    /** 離框幾近：1 = 喺框入面，0 = 一行或以上之外 */
    near: number;
    /** 感應範圍上下邊（前後半行嘅高度；相鄰兩行剛好接住） */
    top: number;
    bottom: number;
}

export interface ArcListRowPose extends ArcRowPose {
    /** 喺接駁位另一邊（框上面嘅尾幾首、框下面嘅頭幾首）：由歌單欄開嗰陣唔飄落，原地淡入 */
    wrapped: boolean;
}

/** 接駁位（點 + 短線）：位置、感應範圍上下邊、透明度 */
export type ArcSeamPose = Pick<ArcRowPose, 'x' | 'y' | 'top' | 'bottom' | 'opacity'>;

export interface ArcRing {
    /** 見到嘅歌（由上到下） */
    rows: ArcListRowPose[];
    /** 接駁位；太遠或者冇歌 = null */
    seam: ArcSeamPose | null;
}

export const arcRowSpec = ({ disc, arc, list }: StageLayout): ArcRowSpec => ({
    centre: disc,
    r: arc.r,
    stepDeg: arc.stepDeg,
    focusSize: list.focusSize,
    restSize: list.restSize,
    visible: list.visible,
    fade: list.fade,
    seamMin: list.seam.minOpacity,
});

/** 捲一行喺弧線上行幾遠（設計單位）：拖動、滾輪換算用 */
export const arcRowPitch = ({ r, stepDeg }: ArcRowSpec): number => r * stepDeg * DEG_TO_RAD;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const lerp = (from: number, to: number, k: number) => from + (to - from) * k;

/** 離框 k 行（可以有小數）嘅高度 */
const rowY = (spec: ArcRowSpec, k: number) =>
    polar(spec.centre, spec.r, FOCUS_DEG - k * spec.stepDeg).y;

const opacityAt = ({ fade, visible }: ArcRowSpec, k: number, near: number, off: boolean) => {
    const distance = clamp01(1 - Math.abs(k) / visible) ** fade.power;
    const value = distance * lerp(fade.rest, 1, near) * (off ? fade.off : 1);
    return Math.max(fade.min, value);
};

const poseAt = (spec: ArcRowSpec, index: number, k: number, off: boolean): ArcRowPose => {
    const near = clamp01(1 - Math.abs(k));
    const { x, y } = polar(spec.centre, spec.r, FOCUS_DEG - k * spec.stepDeg);
    return {
        index,
        x,
        y,
        size: lerp(spec.restSize, spec.focusSize, near),
        opacity: opacityAt(spec, k, near, off),
        near,
        top: rowY(spec, k - HALF_ROW),
        bottom: rowY(spec, k + HALF_ROW),
    };
};

/**
 * 框上面同下面各畫幾多行（設計稿 loopWindow()）：每首歌同一時間只出現一次，歌少嘅碟上面少幾行。
 * `side` = 一邊最多幾行（floor(visible)）
 */
export const loopWindow = (count: number, side: number) => {
    const above = Math.min(side, Math.floor(count / 2));
    return { above, below: Math.min(side, count - above) };
};

/** 接駁位離框 k 行：同歌一樣喺弧線上，透明度 lerp(seamMin, 1, 1 − |k| ÷ visible) */
const seamAt = (spec: ArcRowSpec, k: number): ArcSeamPose => {
    const { x, y } = polar(spec.centre, spec.r, FOCUS_DEG - k * spec.stepDeg);
    const opacity = lerp(spec.seamMin, 1, clamp01(1 - Math.abs(k) / spec.visible));
    return { x, y, opacity, top: rowY(spec, k - HALF_ROW), bottom: rowY(spec, k + HALF_ROW) };
};

/**
 * 見到嘅歌（|k| ≤ visible，由上到下）同接駁位（設計稿第 20 版 listLayer()）。`isOff(index)` = 未有音檔（再淡一半）。
 * 由最近框嗰格（base）向上下數 loopWindow 行；過咗圈頭尾嘅行 = wrapped
 */
export const arcRing = (
    count: number,
    offset: number,
    spec: ArcRowSpec,
    isOff: (index: number) => boolean,
): ArcRing => {
    const ring = count + 1;
    const at = mod(offset, ring);
    const base = Math.round(at);
    const { above, below } = loopWindow(count, Math.floor(spec.visible));
    const result: ArcRing = { rows: [], seam: null };
    for (let j = -above; count > 0 && j <= below; j += 1) {
        const k = j - (at - base);
        const slot = base + j;
        const index = mod(slot, ring);
        if (Math.abs(k) > spec.visible) continue;
        if (index === count) result.seam = seamAt(spec, k);
        else result.rows.push({ ...poseAt(spec, index, k, isOff(index)), wrapped: slot !== index });
    }
    return result;
};
