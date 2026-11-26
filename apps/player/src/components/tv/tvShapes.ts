/*
 * 電視嘅形狀（純函數；設計稿 crtPath()、tvLeg()、tvSet()）。座標係機身入面（機身左上 = 0, 0）。
 */
import type { TvBox, TvCurve, TvLayout } from '../../stage/layouts';
import { px } from '../svgNumber';

const DEG_TO_RAD = Math.PI / 180;
/** 16:9 嘅片 */
const PICTURE_ASPECT = 9 / 16;
/** 每段腳上下各疊 0.5，段與段之間唔會見到隙 */
const SLICE_OVERLAP = 0.5;

/** 螢幕形狀：上下左右邊向外拱（設計稿 crtPath）；`grow` = 向外擴幾多 */
export const crtPath = (
    { x, y, w, h, bulgeX: bx, bulgeY: by, corner }: TvCurve,
    grow = 0,
): string => {
    const [l, t, r, b, c] = [x - grow, y - grow, x + w + grow, y + h + grow, corner + grow];
    const mx = (l + r) / 2;
    const my = (t + b) / 2;
    return [
        `M${px(l + c)} ${px(t)}Q${px(mx)} ${px(t - by)} ${px(r - c)} ${px(t)}`,
        `Q${px(r)} ${px(t)} ${px(r)} ${px(t + c)}Q${px(r + bx)} ${px(my)} ${px(r)} ${px(b - c)}`,
        `Q${px(r)} ${px(b)} ${px(r - c)} ${px(b)}Q${px(mx)} ${px(b + by)} ${px(l + c)} ${px(b)}`,
        `Q${px(l)} ${px(b)} ${px(l)} ${px(b - c)}Q${px(l - bx)} ${px(my)} ${px(l)} ${px(t + c)}`,
        `Q${px(l)} ${px(t)} ${px(l + c)} ${px(t)}z`,
    ].join('');
};

/** 暖白斜邊框嘅第 n 層（設計稿 maskShape(inset)） */
export const maskCurve = ({ mask }: TvLayout, inset: number): TvCurve => ({
    x: mask.x + inset,
    y: mask.y + inset,
    w: mask.w - inset * 2,
    h: mask.h - inset * 2,
    bulgeX: mask.bulgeX,
    bulgeY: mask.bulgeY,
    corner: mask.corner - inset * mask.cornerShrink,
});

/** 16:9 嘅畫面：同玻璃一樣闊，上下置中（上下黑邊；US-007） */
export const tvPicture = ({ glass }: TvLayout): TvBox => {
    const h = glass.w * PICTURE_ASPECT;
    return { x: glass.x, y: glass.y + (glass.h - h) / 2, w: glass.w, h };
};

/** 腳沿住佢自己嘅方向有幾長（斜咗，所以比垂直高度長） */
const legLength = ({ leg }: TvLayout) =>
    (leg.length + leg.tuck) / Math.cos(leg.leanDeg * DEG_TO_RAD);

/** 隻腳落地嘅位（機身入面嘅 y） */
export const tvLegBottom = (tv: TvLayout): number =>
    tv.h - tv.leg.tuck + legLength(tv) * Math.cos(tv.leg.leanDeg * DEG_TO_RAD);

export interface LegSlice {
    d: string;
    /** 黑色膠腳嗰段 */
    tip: boolean;
}

/** 腳由上至下逐段上色：明暗跟住隻腳自己嘅闊度（設計稿 tvLeg） */
export const legSlices = (tv: TvLayout): LegSlice[] => {
    const { slices, topHalf, tipHalf, tipFrom } = tv.leg;
    const length = legLength(tv);
    const half = (k: number) => topHalf + (tipHalf - topHalf) * k;
    return Array.from({ length: slices }, (_, i) => {
        const [k0, k1] = [i / slices, (i + 1) / slices];
        const top = px(k0 * length - SLICE_OVERLAP);
        const bottom = px(k1 * length + SLICE_OVERLAP);
        const d = `M${px(-half(k0))} ${top}H${px(half(k0))}L${px(half(k1))} ${bottom}H${px(-half(k1))}z`;
        return { d, tip: k0 >= tipFrom };
    });
};

/** 機底投落隻腳度嘅陰影（成隻腳一塊） */
export const legShadePath = (tv: TvLayout): string => {
    const { topHalf, tipHalf } = tv.leg;
    return `M${-topHalf} 0H${topHalf}L${tipHalf} ${px(legLength(tv))}H${-tipHalf}z`;
};

/** 圓角長方形嘅屬性（設計稿 roundBox：每縮入 1，圓角都少 1） */
export const roundBox = ({ x, y, w, h }: TvBox, corner: number, inset = 0) => ({
    x: x + inset,
    y: y + inset,
    width: w - inset * 2,
    height: h - inset * 2,
    rx: corner - inset,
});
