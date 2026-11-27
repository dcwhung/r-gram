import { memo } from 'react';
import { DESIGN_WIDTH } from '../../stage/fitStage';

/** 設計稿 template.html 嘅舞台漸層（gStage）：以舞台做 0–1 嘅中心、半徑 */
const CENTRE_X = 0.3;
const CENTRE_Y = 0.12;
const RADIUS = 1.1;

interface StageGradientProps {
    id: string;
    /** 舞台頂喺呢個座標系統嘅 y（舞台座標 = 0；貼底組 = −extraUnits） */
    top?: number;
    /** 舞台高度（單位） */
    height: number;
}

/**
 * 舞台底色（徑向漸層），排喺舞台個框上面（userSpaceOnUse + 縮放 = 以前 objectBoundingBox 喺舞台上嘅樣）。
 * T-117：底色畫埋上下延伸，漸層唔可以跟住畫嘅範圍拉長，否則安全區入面嘅顏色會變；延伸部分自然接落去
 */
export const StageGradient = memo(({ id, top = 0, height }: StageGradientProps) => (
    <radialGradient
        id={id}
        gradientUnits="userSpaceOnUse"
        cx={CENTRE_X}
        cy={CENTRE_Y}
        r={RADIUS}
        gradientTransform={`translate(0 ${top}) scale(${DESIGN_WIDTH} ${height})`}
    >
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#eeefec" />
    </radialGradient>
));
StageGradient.displayName = 'StageGradient';
