import type { CSSProperties } from 'react';
import type { Point } from '../../stage/layouts';
import { useSvgId } from '../svgId';
import { px } from '../svgNumber';

/** mask 嘅值：白 = 見到、黑 = 睇唔到（唔係畫面顏色） */
const MASK_SHOW = '#fff';
const MASK_HIDE = '#000';

/** 一行歌詞（框入面嗰行可以有幾列）：位置、字級同透明度由 timedLayout() 計 */
export interface LyricLineModel {
    index: number;
    rows: string[];
    x: number;
    /** 第一列嘅垂直中線 */
    y: number;
    pitch: number;
    size: number;
    opacity: number;
    focus: boolean;
    /** 右邊界；`cut` = 最後一列放唔落，右邊淡出 */
    limit: number;
    cut: boolean;
    /** 打開過場：由而家嗰行嘅位置沿弧線轉出嚟幾多度 */
    spread: number;
}

/** 最後一列嘅右邊淡出（設計稿 longLyrics() 嘅 linearGradient + clipPath；用 mask 做，喺行自己嘅座標） */
const CutMask = ({ id, line, fade }: { id: string; line: LyricLineModel; fade: number }) => {
    const right = px(line.limit - line.x);
    const y = (line.rows.length - 1) * line.pitch - line.size;
    return (
        <mask
            id={id}
            maskUnits="userSpaceOnUse"
            x={-line.size}
            y={px(y)}
            width={right + line.size}
            height={line.size * 2}
        >
            <linearGradient
                id={`${id}-g`}
                gradientUnits="userSpaceOnUse"
                x1={px(right - fade)}
                y1={0}
                x2={right}
                y2={0}
            >
                <stop offset={0} stopColor={MASK_SHOW} />
                <stop offset={1} stopColor={MASK_HIDE} />
            </linearGradient>
            <rect
                x={-line.size}
                y={px(y)}
                width={right + line.size}
                height={line.size * 2}
                fill={`url(#${id}-g)`}
            />
        </mask>
    );
};

/**
 * 一行（設計稿 booklet() 嘅 book-line）：外層係打開／收返過場（以碟心做原點轉 `--spread`），內層係位置、透明度、
 * 字級，換行時 CSS transition 移過去（成組沿弧線移動；減少動態效果 = 即時）。座標以碟心做 0, 0（`centre`）
 */
export const LyricLineView = ({
    line,
    centre,
    fade,
}: {
    line: LyricLineModel;
    centre: Point;
    fade: number;
}) => {
    const id = useSvgId('lyric-cut');
    const last = line.rows.length - 1;
    const place = {
        transform: `translate(${px(line.x - centre.x)}px, ${px(line.y - centre.y)}px)`,
        opacity: line.opacity,
    };
    return (
        <g
            className="booklet-line"
            style={{ '--spread': `${px(line.spread)}deg` } as CSSProperties}
        >
            <g
                className="lyric-line"
                style={place}
                aria-current={line.focus || undefined}
                data-index={line.index}
            >
                {line.cut ? <CutMask id={id} line={line} fade={fade} /> : null}
                {line.rows.map((row, at) => (
                    <text
                        key={at}
                        className={line.focus ? 'lyric-text lyric-text--focus' : 'lyric-text'}
                        y={px(at * line.pitch)}
                        dominantBaseline="central"
                        style={{ fontSize: line.size }}
                        mask={line.cut && at === last ? `url(#${id})` : undefined}
                    >
                        {row}
                    </text>
                ))}
            </g>
        </g>
    );
};
