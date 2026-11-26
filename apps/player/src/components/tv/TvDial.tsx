import { polar } from '../../stage/geometry';
import type { TvLayout } from '../../stage/layouts';
import { DEF, ref } from '../metal/defIds';
import { Metal } from '../metal/Metal';
import { px } from '../svgNumber';
import { TV_DEF, tvRef } from './tvDefIds';

/* 設計稿 tvDial()（v16 drawTvDial）：黑色底盤 + 刻度 + 金屬旋鈕 + 凸起嘅把手 */
const BASE_FILL = '#0b0b0d';
const RING = { gap: 2, colour: '#4a4c52', width: 3.5 } as const;
const TICK = { inset: 5, long: 12, short: 7, every: 6, width: 2.4 } as const;
const TICK_OPACITY = { long: 0.9, short: 0.42 } as const;
const KNOB = { rot: 30, bevel: 0.1 } as const;
/** 把手：落影、圓柱、頂部指示坑（尺寸係設計稿寫死嘅數） */
const GRIP = {
    w: 18,
    rx: 8,
    top: 4,
    shorter: 8,
    shadowDx: 2,
    shadowDy: 5,
    notchW: 4,
    notchH: 16,
    notchTop: 9,
} as const;
const GRIP_SHADOW_OPACITY = 0.4;
const GRIP_STROKE = '#5f5f5f';
const NOTCH_FILL = '#2e3035';
const FULL_TURN = 360;

const Ticks = ({ x, y, tv }: { x: number; y: number; tv: TvLayout }) => {
    const { dialR, ticks } = tv.knobs;
    const step = FULL_TURN / ticks;
    return Array.from({ length: ticks }, (_, i) => {
        const long = i % TICK.every === 0;
        const from = polar({ x, y }, dialR - TICK.inset, i * step);
        const to = polar({ x, y }, dialR - TICK.inset - (long ? TICK.long : TICK.short), i * step);
        return (
            <path
                key={i}
                d={`M${px(from.x)} ${px(from.y)}L${px(to.x)} ${px(to.y)}`}
                stroke="#fff"
                strokeOpacity={long ? TICK_OPACITY.long : TICK_OPACITY.short}
                strokeWidth={TICK.width}
            />
        );
    });
};

/** 把手（跟住旋鈕轉） */
const Grip = ({ r }: { r: number }) => {
    const height = r * 2 - GRIP.shorter;
    return (
        <>
            <rect
                x={-GRIP.w / 2 + GRIP.shadowDx}
                y={-r + GRIP.top + GRIP.shadowDy}
                width={GRIP.w}
                height={height}
                rx={GRIP.rx}
                fill="#000"
                opacity={GRIP_SHADOW_OPACITY}
                filter={ref(DEF.shadow)}
            />
            <rect
                x={-GRIP.w / 2}
                y={-r + GRIP.top}
                width={GRIP.w}
                height={height}
                rx={GRIP.rx}
                fill={tvRef(TV_DEF.cylinderH)}
                stroke={GRIP_STROKE}
            />
            <rect
                x={-GRIP.notchW / 2}
                y={-r + GRIP.notchTop}
                width={GRIP.notchW}
                height={GRIP.notchH}
                fill={NOTCH_FILL}
            />
        </>
    );
};

interface TvDialFaceProps {
    tv: TvLayout;
    y: number;
    /** 把手轉咗幾多度（0 = 向上） */
    turn: number;
}

/** 一粒大旋鈕嘅樣（底盤、刻度、旋鈕、把手） */
export const TvDialFace = ({ tv, y, turn }: TvDialFaceProps) => {
    const { x, r, dialR, rim } = tv.knobs;
    return (
        <>
            <circle cx={x} cy={y} r={dialR + rim} fill={BASE_FILL} />
            <circle
                cx={x}
                cy={y}
                r={dialR + RING.gap}
                fill="none"
                stroke={RING.colour}
                strokeWidth={RING.width}
            />
            <Ticks x={x} y={y} tv={tv} />
            <Metal cx={x} cy={y} r={r} rot={KNOB.rot} bevel={KNOB.bevel} />
            <g data-part="tv-dial-grip" transform={`translate(${x} ${y}) rotate(${px(turn)})`}>
                <Grip r={r} />
            </g>
        </>
    );
};
