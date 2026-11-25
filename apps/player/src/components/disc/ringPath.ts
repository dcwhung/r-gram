import { px } from '../svgNumber';

const circlePath = (radius: number): string => {
    const r = px(radius);
    return `M${-r} 0a${r} ${r} 0 1 0 ${px(r * 2)} 0a${r} ${r} 0 1 0 ${px(-r * 2)} 0z`;
};

/** 環形路徑（以原點為中心）：外圈加內圈，配 `fill-rule` / `clip-rule` = evenodd 用 */
export const ringPath = (outer: number, inner: number): string =>
    circlePath(outer) + circlePath(inner);
