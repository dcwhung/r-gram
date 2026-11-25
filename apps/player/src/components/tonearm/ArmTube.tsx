import type { ReactNode } from 'react';
import { DEF, ref } from '../metal/defIds';
import { px } from '../svgNumber';

const MIN_TUBE_WIDTH = 16;
/** 針頭殼離臂尾幾遠、向碟心彎入幾多（設計稿 ARM.bend = −1：headY = −30，針頭殼轉 −24°） */
const HEAD_INSET = 58;
const HEAD_DROP = -30;
const HEAD_TURN_DEG = -24;

/** 配重同佢連去軸心嗰一截 */
const Counterweight = ({ base, tube }: { base: number; tube: number }) => (
    <>
        <rect
            x={px(-base * 1.62)}
            y={px(-base * 0.4)}
            width={px(base * 1.05)}
            height={px(base * 0.8)}
            rx="7"
            fill={ref(DEF.cylinder)}
            stroke="#5c5c5c"
            strokeWidth="1.5"
        />
        <rect
            x={px(-base * 0.62)}
            y={px(-tube * 0.45)}
            width={px(base * 0.62)}
            height={px(tube * 0.9)}
            fill={ref(DEF.cylinder)}
        />
    </>
);

/** 臂管：落影、暗邊、管身、頂部反光，同一條路徑畫四次 */
const Tube = ({ d, width }: { d: string; width: number }) => {
    const stroke = { d, fill: 'none', strokeLinecap: 'round' } as const;
    return (
        <>
            <path
                {...stroke}
                stroke="#000"
                strokeOpacity=".22"
                strokeWidth={px(width)}
                transform="translate(5 9)"
                filter={ref(DEF.shadow)}
            />
            <path {...stroke} stroke="#6d6d6d" strokeWidth={px(width)} />
            <path {...stroke} stroke="#d2d2d2" strokeWidth={px(width * 0.74)} />
            <path
                {...stroke}
                stroke="#fff"
                strokeOpacity=".85"
                strokeWidth={px(width * 0.22)}
                transform={`translate(0 ${px(-width * 0.16)})`}
            />
        </>
    );
};

interface ArmTubeProps {
    length: number;
    base: number;
    /** 針頭殼（畫喺臂尾嘅座標入面） */
    children: ReactNode;
}

/** 配重 + 臂管（直身，近針頭先順滑彎入）+ 針頭殼位置。以軸心為原點，向右伸出 */
export const ArmTube = ({ length, base, children }: ArmTubeProps) => {
    const tube = Math.max(MIN_TUBE_WIDTH, base * 0.2);
    const headX = length - HEAD_INSET;
    const path = `M0 0H${px(length * 0.76)}Q${px(headX - 20)} 0 ${px(headX)} ${HEAD_DROP}`;
    return (
        <>
            <Counterweight base={base} tube={tube} />
            <Tube d={path} width={tube} />
            <rect
                x={px(length * 0.42)}
                y={px(-tube * 0.62)}
                width="14"
                height={px(tube * 1.24)}
                rx="3"
                fill="#4d4d4d"
            />
            <g transform={`translate(${px(headX)} ${HEAD_DROP}) rotate(${HEAD_TURN_DEG})`}>
                {children}
            </g>
        </>
    );
};
