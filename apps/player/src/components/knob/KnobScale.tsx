import { polar, scaleAngle } from '../../stage/geometry';
import type { StageLayout } from '../../stage/layouts';
import { px } from '../svgNumber';
import { KNOB_SHAPE } from './knobShape';

interface KnobScaleProps {
    layout: StageLayout;
    /** 格數（專輯數 + ♥） */
    positions: number;
    current: number;
    accent: string;
}

const { ticks } = KNOB_SHAPE;

/**
 * 刻度弧（設計稿 knobScale()）：每格一條刻度線（連 ♥ 嗰格），每 4 格一條長線；而家嗰格用專輯色、長兼粗。
 * 弧固定，專輯平均分佈（scaleAngle）。刻度線唔係感應目標（揀碟靠擰旋鈕）。
 */
export const KnobScale = ({ layout, positions, current, accent }: KnobScaleProps) => {
    const { knob, scale } = layout;
    return (
        <g data-part="knob-scale" aria-hidden="true">
            {Array.from({ length: positions }, (_, pos) => {
                const on = pos === current;
                const long = pos % ticks.longEvery === 0;
                const deg = scaleAngle(layout, pos, positions);
                const from = polar(knob, scale.inner, deg);
                const to = polar(knob, on || long ? scale.long : scale.outer, deg);
                return (
                    <path
                        key={pos}
                        data-part="scale-tick"
                        data-on={on}
                        data-long={long}
                        d={`M${px(from.x)} ${px(from.y)}L${px(to.x)} ${px(to.y)}`}
                        stroke={on ? accent : ticks.color}
                        strokeWidth={on ? ticks.onWidth : long ? ticks.longWidth : ticks.shortWidth}
                        strokeLinecap="round"
                    />
                );
            })}
        </g>
    );
};
