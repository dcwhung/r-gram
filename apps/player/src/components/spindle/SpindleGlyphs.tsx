import { px } from '../svgNumber';

/** play 三角（以原點為中心） */
export const PlayGlyph = ({ size }: { size: number }) => (
    <path
        data-part="play"
        d={`M${px(-size * 0.42)} ${px(-size * 0.56)}L${px(size * 0.62)} 0L${px(-size * 0.42)} ${px(size * 0.56)}z`}
        fill="#fff"
    />
);

/** pause 兩條直條 */
export const PauseGlyph = ({ r }: { r: number }) => {
    const width = r * 0.17;
    const height = r * 0.56;
    const bar = (x: number) => (
        <rect
            x={px(x)}
            y={px(-height / 2)}
            width={px(width)}
            height={px(height)}
            rx={px(width * 0.25)}
            fill="#fff"
        />
    );
    return (
        <g data-part="pause">
            {bar(-width * 1.45)}
            {bar(width * 0.45)}
        </g>
    );
};

const RING_RADIUS = 0.84;
const QUARTER_TURN_BACK = -90;

/** 進度圈：底圈 + 專輯色弧（由 12 點鐘開始，順時針） */
export const ProgressRing = ({
    r,
    progress,
    accent,
}: {
    r: number;
    progress: number;
    accent: string;
}) => {
    const ringRadius = r * RING_RADIUS;
    const circumference = 2 * Math.PI * ringRadius;
    const share = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
    const width = px(Math.max(5, r * 0.1));
    return (
        <>
            <circle r={px(r * 0.74)} fill="#0b0b0c" opacity=".78" />
            <circle
                r={px(ringRadius)}
                fill="none"
                stroke="#fff"
                strokeOpacity=".22"
                strokeWidth={width}
            />
            <circle
                data-part="progress"
                r={px(ringRadius)}
                fill="none"
                stroke={accent}
                strokeWidth={width}
                strokeLinecap="round"
                strokeDasharray={`${px(circumference * share)} ${px(circumference)}`}
                transform={`rotate(${QUARTER_TURN_BACK})`}
            />
        </>
    );
};
