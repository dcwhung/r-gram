import type { ReactNode } from 'react';
import type { StageLayout } from '../../stage/layouts';
import { DEF, ref } from '../metal/defIds';
import { px } from '../svgNumber';
import { ARM_SHAPE } from './armShape';

/** 配重同佢連去軸心嗰一截 */
const Counterweight = ({ base, tube }: { base: number; tube: number }) => {
    const { counterweight: weight, stub, outline } = ARM_SHAPE;
    return (
        <>
            <rect
                x={px(base * weight.x)}
                y={px(base * weight.y)}
                width={px(base * weight.width)}
                height={px(base * weight.height)}
                rx={weight.corner}
                fill={ref(DEF.cylinder)}
                stroke="#5c5c5c"
                strokeWidth={outline}
            />
            <rect
                x={px(-base * stub.length)}
                y={px(tube * stub.y)}
                width={px(base * stub.length)}
                height={px(tube * stub.height)}
                fill={ref(DEF.cylinder)}
            />
        </>
    );
};

/** 臂管落影：升針時移遠。位移寫喺 style 嘅 transform，等 CSS 做過場 */
const TubeShadow = ({ d, width, lifted }: { d: string; width: number; lifted: boolean }) => {
    const { dx, dy } = lifted ? ARM_SHAPE.lift.shadow : ARM_SHAPE.tube.shadow;
    return (
        <g
            data-part="arm-shadow"
            className="tonearm-shadow"
            style={{ transform: `translate(${dx}px, ${dy}px)` }}
        >
            <path
                d={d}
                fill="none"
                strokeLinecap="round"
                stroke="#000"
                strokeOpacity=".22"
                strokeWidth={px(width)}
                filter={ref(DEF.shadow)}
            />
        </g>
    );
};

/** 臂管：落影、暗邊、管身、頂部反光，同一條路徑畫四次 */
const Tube = ({ d, width, lifted }: { d: string; width: number; lifted: boolean }) => {
    const { body, highlight, highlightLift } = ARM_SHAPE.tube;
    const stroke = { d, fill: 'none', strokeLinecap: 'round' } as const;
    return (
        <>
            <TubeShadow d={d} width={width} lifted={lifted} />
            <path {...stroke} stroke="#6d6d6d" strokeWidth={px(width)} />
            <path {...stroke} stroke="#d2d2d2" strokeWidth={px(width * body)} />
            <path
                {...stroke}
                stroke="#fff"
                strokeOpacity=".85"
                strokeWidth={px(width * highlight)}
                transform={`translate(0 ${px(-width * highlightLift)})`}
            />
        </>
    );
};

interface ArmTubeProps extends Pick<StageLayout['arm'], 'length' | 'base' | 'bend'> {
    /** 唱針升起：落影移遠 */
    lifted: boolean;
    /** 針頭殼（畫喺臂尾嘅座標入面） */
    children: ReactNode;
}

/** 配重 + 臂管（直身，近針頭先順滑彎入）+ 針頭殼位置。以軸心為原點，向右伸出 */
export const ArmTube = ({ length, base, bend, lifted, children }: ArmTubeProps) => {
    const { tube, path, collar, head } = ARM_SHAPE;
    const width = Math.max(tube.minWidth, base * tube.width);
    const headX = length - head.inset;
    const headY = bend * head.drop;
    const control = `${px(headX - path.curveLead)} 0`;
    const d = `M0 0H${px(length * path.straight)}Q${control} ${px(headX)} ${px(headY)}`;
    return (
        <>
            <Counterweight base={base} tube={width} />
            <Tube d={d} width={width} lifted={lifted} />
            <rect
                x={px(length * collar.at)}
                y={px(width * collar.y)}
                width={collar.width}
                height={px(width * collar.height)}
                rx={collar.corner}
                fill="#4d4d4d"
            />
            <g transform={`translate(${px(headX)} ${px(headY)}) rotate(${bend * head.turnDeg})`}>
                {children}
            </g>
        </>
    );
};
