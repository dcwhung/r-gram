import { polar } from '../../stage/geometry';
import { DEF, ref } from '../metal/defIds';
import { px } from '../svgNumber';

/** 坑紋：[半徑比例, 白線透明度] */
const GROOVES = [
    [0.9, 0.16],
    [0.66, 0.1],
] as const;
const BALL_COUNT = 3;
const BALL_ORBIT = 0.42;
const BALL_RADIUS = 0.075;
const BALL_START_DEG = 28.6;
const CAP_RADIUS = 0.13;
const ORIGIN = { x: 0, y: 0 };

/** 唱片夾本體，以原點為中心（設計稿 clamp()：v16 drawClamp）：深色面、兩圈坑紋、三粒鋼珠、中軸帽 */
export const Clamp = ({ r }: { r: number }) => (
    <>
        <circle r={px(r)} fill={ref(DEF.clamp)} />
        {GROOVES.map(([scale, alpha]) => (
            <circle
                key={scale}
                r={px(r * scale)}
                fill="none"
                stroke="#fff"
                strokeOpacity={alpha}
                strokeWidth={px(Math.max(1, r * 0.022))}
            />
        ))}
        {Array.from({ length: BALL_COUNT }, (_, index) => {
            const ball = polar(ORIGIN, r * BALL_ORBIT, (index * 360) / BALL_COUNT + BALL_START_DEG);
            return (
                <circle
                    key={index}
                    cx={px(ball.x)}
                    cy={px(ball.y)}
                    r={px(r * BALL_RADIUS)}
                    fill={ref(DEF.ball)}
                />
            );
        })}
        <circle r={px(r * CAP_RADIUS)} fill="#a9acb2" />
    </>
);
