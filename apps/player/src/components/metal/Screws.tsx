import type { Point } from '../../stage/layouts';
import { px } from '../svgNumber';
import { Metal } from './Metal';

/** 一字螺絲嘅形狀（設計稿 screw()）：半徑、車床紋角度、斜邊；坑嘅半長（以半徑做 1）、角度、線粗 */
const SCREW_SHAPE = {
    r: 11,
    rot: 70,
    bevel: 0.2,
    slot: { halfLength: 0.55, deg: 35, width: 2.4 },
} as const;

/** 一字螺絲 */
export const Screw = ({ x, y }: Point) => {
    const { slot, ...face } = SCREW_SHAPE;
    const half = face.r * slot.halfLength;
    return (
        <>
            <Metal cx={x} cy={y} {...face} shadow={false} />
            <path
                d={`M${px(x - half)} ${px(y)}H${px(x + half)}`}
                stroke="#555"
                strokeWidth={slot.width}
                strokeLinecap="round"
                transform={`rotate(${slot.deg} ${px(x)} ${px(y)})`}
            />
        </>
    );
};

export const Screws = ({ points }: { points: readonly Point[] }) => (
    <>
        {points.map((point) => (
            <Screw key={`${point.x}:${point.y}`} {...point} />
        ))}
    </>
);
