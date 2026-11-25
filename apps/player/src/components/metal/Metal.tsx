import { px } from '../svgNumber';
import { DEF, ref } from './defIds';

interface ShadowProps {
    cx: number;
    cy: number;
    r: number;
    dx?: number;
    dy?: number;
    opacity?: number;
    large?: boolean;
}

/** 落影：一個模糊咗嘅黑圓，偏右下（光源喺左上） */
export const Shadow = ({
    cx,
    cy,
    r,
    dx = 5,
    dy = 9,
    opacity = 0.3,
    large = false,
}: ShadowProps) => (
    <circle
        cx={px(cx + dx)}
        cy={px(cy + dy)}
        r={px(r)}
        fill="#000"
        opacity={opacity}
        filter={ref(large ? DEF.shadowLarge : DEF.shadow)}
    />
);

interface MetalProps {
    cx: number;
    cy: number;
    r: number;
    /** 車床紋轉幾多度（每件零件唔同，睇落先唔會一式一樣） */
    rot?: number;
    /** 斜邊闊度（以半徑做 1） */
    bevel?: number;
    shadow?: boolean;
}

/** 車床鋁圓面（設計稿 metal()）：落影 → 車床紋 → 圓拱光 → 斜邊 → 邊線 */
export const Metal = ({ cx, cy, r, rot = 24, bevel = 0.1, shadow = true }: MetalProps) => {
    const bevelWidth = r * bevel;
    return (
        <>
            {shadow && <Shadow cx={cx} cy={cy} r={r} />}
            <use
                href={`#${DEF.lathe}`}
                transform={`translate(${px(cx)} ${px(cy)}) rotate(${rot}) scale(${px(r)})`}
            />
            <circle cx={px(cx)} cy={px(cy)} r={px(r)} fill={ref(DEF.dome)} />
            <circle
                cx={px(cx)}
                cy={px(cy)}
                r={px(r - bevelWidth / 2)}
                fill="none"
                stroke={ref(DEF.bevel)}
                strokeWidth={px(bevelWidth)}
            />
            <circle
                cx={px(cx)}
                cy={px(cy)}
                r={px(r)}
                fill="none"
                stroke="#5f5f5f"
                strokeOpacity=".5"
                strokeWidth="1.5"
            />
        </>
    );
};
