/*
 * 車床拉絲面：一圈細扇形，明暗沿角度變（設計稿 template.html buildLathe()）。
 * 喺單位圓上面畫一次，用 <use> 加 transform 放大去任何半徑。
 */
import { polar } from '../../stage/geometry';
import { ratio } from '../svgNumber';

export const LATHE_WEDGES = 96;

const FULL_TURN = 360;
const DEG_TO_RAD = Math.PI / 180;
const CHANNEL_MAX = 255;
/** 扇形之間重疊少少，唔好見到罅 */
const OVERLAP_DEG = 0.2;
const ORIGIN = { x: 0, y: 0 };

const cosDeg = (deg: number) => Math.cos(deg * DEG_TO_RAD);

/** 角度 a 嘅明度（0–1）：基調 + 兩邊對稱嘅大光帶 + 兩組細紋 */
const brightnessAt = (a: number): number =>
    0.76 + 0.15 * cosDeg(2 * a) + 0.045 * cosDeg(6 * a + 40) + 0.02 * cosDeg(14 * a);

export interface LatheWedge {
    d: string;
    fill: string;
}

export const latheWedges = (): LatheWedge[] => {
    const step = FULL_TURN / LATHE_WEDGES;
    return Array.from({ length: LATHE_WEDGES }, (_, index) => {
        const a = index * step;
        const level = Math.round(Math.max(0, Math.min(1, brightnessAt(a))) * CHANNEL_MAX);
        const from = polar(ORIGIN, 1, a - OVERLAP_DEG);
        const to = polar(ORIGIN, 1, a + step + OVERLAP_DEG);
        return {
            d: `M0 0L${ratio(from.x)} ${ratio(from.y)}A1 1 0 0 1 ${ratio(to.x)} ${ratio(to.y)}Z`,
            fill: `rgb(${level},${level},${level})`,
        };
    });
};
