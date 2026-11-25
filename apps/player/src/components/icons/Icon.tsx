import { px, ratio } from '../svgNumber';
import { ICON_PATHS } from './paths';

export type IconName = keyof typeof ICON_PATHS;
export const ICON_NAMES = Object.keys(ICON_PATHS) as IconName[];

const ICON_GRID = 48;

interface IconProps {
    name: IconName;
    /** icon 中心（設計單位） */
    cx: number;
    cy: number;
    size: number;
    color: string;
}

/** 置中喺 (cx, cy)、邊長 size 嘅 icon */
export const Icon = ({ name, cx, cy, size, color }: IconProps) => (
    <g
        data-part="icon"
        transform={`translate(${px(cx)} ${px(cy)}) translate(${px(-size / 2)} ${px(-size / 2)}) scale(${ratio(size / ICON_GRID)})`}
        fill={color}
        color={color}
    >
        {ICON_PATHS[name]}
    </g>
);
