import { px } from '../svgNumber';
import { SPINDLE_SHAPE } from './spindleShape';

/** play 三角（以原點為中心）：左邊上下兩點，右邊一個尖 */
export const PlayGlyph = ({ size }: { size: number }) => {
    const { back, halfHeight, tip } = SPINDLE_SHAPE.play;
    const left = px(-size * back);
    const top = px(-size * halfHeight);
    const bottom = px(size * halfHeight);
    const d = `M${left} ${top}L${px(size * tip)} 0L${left} ${bottom}z`;
    return <path data-part="play" d={d} fill="#fff" />;
};

/** pause 兩條直條 */
export const PauseGlyph = ({ r }: { r: number }) => {
    const { pause } = SPINDLE_SHAPE;
    const width = r * pause.width;
    const height = r * pause.height;
    const bar = (x: number) => (
        <rect
            x={px(x)}
            y={px(-height / 2)}
            width={px(width)}
            height={px(height)}
            rx={px(width * pause.corner)}
            fill="#fff"
        />
    );
    return (
        <g data-part="pause">
            {bar(width * pause.leftX)}
            {bar(width * pause.rightX)}
        </g>
    );
};

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
    const { ring } = SPINDLE_SHAPE;
    const ringRadius = r * ring.r;
    const circumference = 2 * Math.PI * ringRadius;
    const share = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
    const width = px(Math.max(ring.minWidth, r * ring.width));
    return (
        <>
            <circle r={px(r * ring.backdrop)} fill="#0b0b0c" opacity=".78" />
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
                transform={`rotate(${ring.startDeg})`}
            />
        </>
    );
};
