import { FULL_TURN_DEG, polar } from '../../stage/geometry';
import { DEF, ref } from '../metal/defIds';
import { px } from '../svgNumber';

/** 唱片夾嘅形狀（設計稿 clamp()：v16 drawClamp）。半徑、線粗都係「× r」= 以唱片夾半徑做 1 */
const CLAMP_SHAPE = {
    /** 兩圈坑紋：半徑、白線透明度 */
    grooves: [
        { r: 0.9, alpha: 0.16 },
        { r: 0.66, alpha: 0.1 },
    ],
    /** 坑紋線粗（最少 minWidth 個設計單位） */
    groove: { width: 0.022, minWidth: 1 },
    /** 鋼珠：幾多粒、第一粒喺幾多度；離中心幾遠、半徑 */
    balls: { count: 3, startDeg: 28.6, orbit: 0.42, r: 0.075 },
    /** 中軸帽嘅半徑 */
    cap: 0.13,
} as const;
const ORIGIN = { x: 0, y: 0 };

/** 唱片夾本體，以原點為中心：深色面、兩圈坑紋、三粒鋼珠、中軸帽 */
export const Clamp = ({ r }: { r: number }) => {
    const { grooves, groove, balls, cap } = CLAMP_SHAPE;
    return (
        <>
            <circle r={px(r)} fill={ref(DEF.clamp)} />
            {grooves.map(({ r: scale, alpha }) => (
                <circle
                    key={scale}
                    r={px(r * scale)}
                    fill="none"
                    stroke="#fff"
                    strokeOpacity={alpha}
                    strokeWidth={px(Math.max(groove.minWidth, r * groove.width))}
                />
            ))}
            {Array.from({ length: balls.count }, (_, index) => {
                const deg = (index * FULL_TURN_DEG) / balls.count + balls.startDeg;
                const ball = polar(ORIGIN, r * balls.orbit, deg);
                return (
                    <circle
                        key={index}
                        cx={px(ball.x)}
                        cy={px(ball.y)}
                        r={px(r * balls.r)}
                        fill={ref(DEF.ball)}
                    />
                );
            })}
            <circle r={px(r * cap)} fill="#a9acb2" />
        </>
    );
};
