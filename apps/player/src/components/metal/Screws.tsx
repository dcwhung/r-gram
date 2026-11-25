import type { Point } from '../../stage/layouts';
import { px } from '../svgNumber';
import { Metal } from './Metal';

const SCREW_RADIUS = 11;
const SLOT_HALF_LENGTH = 0.55;
const SLOT_ANGLE_DEG = 35;

/** 一字螺絲 */
export const Screw = ({ x, y }: Point) => (
    <>
        <Metal cx={x} cy={y} r={SCREW_RADIUS} rot={70} bevel={0.2} shadow={false} />
        <path
            d={`M${px(x - SCREW_RADIUS * SLOT_HALF_LENGTH)} ${px(y)}H${px(x + SCREW_RADIUS * SLOT_HALF_LENGTH)}`}
            stroke="#555"
            strokeWidth="2.4"
            strokeLinecap="round"
            transform={`rotate(${SLOT_ANGLE_DEG} ${px(x)} ${px(y)})`}
        />
    </>
);

export const Screws = ({ points }: { points: readonly Point[] }) => (
    <>
        {points.map((point) => (
            <Screw key={`${point.x}:${point.y}`} {...point} />
        ))}
    </>
);
