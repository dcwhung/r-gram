/*
 * 弧線排列（純函數；Technical Spec「弧線排列」、設計稿第 18 版 listLayer()）：歌名沿住同碟同心嘅弧線排，
 * 揀中嗰行喺 180°（碟心正左面，框入面），第 k 行喺 180 − k × step（k 正 = 下面）。越遠越細、越淡。
 * `offset` 係捲動位置（以行計，可以有小數）：停喺整數時同設計稿第 18 版一樣；捲動中途字級同淡出按離中心幾近線性過渡
 *（設計稿 v16 drawList()）。歌書有時間標記嘅歌詞日後可以用同一個函數（T-082）。
 */
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

export const arcRowSpec = ({ disc, arc, list }: StageLayout): ArcRowSpec => ({
    centre: disc,
    r: arc.r,
    stepDeg: arc.stepDeg,
    focusSize: list.focusSize,
    restSize: list.restSize,
    visible: list.visible,
    fade: list.fade,
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

/** 見到嘅行（|k| ≤ visible），由上到下。`isOff(index)` = 未有音檔（再淡一半） */
export const arcRows = (
    count: number,
    offset: number,
    spec: ArcRowSpec,
    isOff: (index: number) => boolean,
): ArcRowPose[] => {
    const first = Math.max(0, Math.ceil(offset - spec.visible));
    const last = Math.min(count - 1, Math.floor(offset + spec.visible));
    const rows: ArcRowPose[] = [];
    for (let index = first; index <= last; index += 1) {
        rows.push(poseAt(spec, index, index - offset, isOff(index)));
    }
    return rows;
};
