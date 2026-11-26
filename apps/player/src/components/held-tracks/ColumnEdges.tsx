import { DESIGN_WIDTH } from '../../stage/fitStage';
import type { ColumnMetrics } from './columnLayout';
import { px, ratio } from '../svgNumber';

/** mask 嘅值：白 = 見到、黑 = 睇唔到（唔係畫面顏色） */
const MASK_SHOW = '#fff';
const MASK_HIDE = '#000';

interface ColumnEdgesProps {
    /** clipPath 同 mask 嘅 id 開頭 */
    id: string;
    top: number;
    room: number;
    /** 頂底淡出高度 */
    fade: number;
    metrics: ColumnMetrics;
}

export const clipRef = (id: string) => `url(#${id}-clip)`;
export const fadeRef = (id: string) => `url(#${id}-mask)`;

/**
 * 欄嘅邊（設計稿第 18 版 trackPanel()）：clipPath 剪走欄外嘅行（連感應範圍，唔會㩒到字母盤上面睇唔到嘅行）；
 * mask 做頂（捲咗先有）同底（下面仲有先有）淡出
 */
export const ColumnEdges = ({ id, top, room, fade, metrics }: ColumnEdgesProps) => {
    const edge = ratio(fade / room);
    return (
        <>
            <clipPath id={`${id}-clip`} data-part="held-clip">
                <rect x={0} y={top} width={DESIGN_WIDTH} height={px(room)} />
            </clipPath>
            <linearGradient
                id={`${id}-fade`}
                gradientUnits="userSpaceOnUse"
                x1={0}
                y1={top}
                x2={0}
                y2={px(top + room)}
            >
                <stop offset={0} stopColor={metrics.fadeTop ? MASK_HIDE : MASK_SHOW} />
                <stop offset={edge} stopColor={MASK_SHOW} />
                <stop offset={ratio(1 - edge)} stopColor={MASK_SHOW} />
                <stop offset={1} stopColor={metrics.fadeBottom ? MASK_HIDE : MASK_SHOW} />
            </linearGradient>
            <mask
                id={`${id}-mask`}
                maskUnits="userSpaceOnUse"
                x={0}
                y={top}
                width={DESIGN_WIDTH}
                height={px(room)}
            >
                <rect
                    x={0}
                    y={top}
                    width={DESIGN_WIDTH}
                    height={px(room)}
                    fill={`url(#${id}-fade)`}
                />
            </mask>
        </>
    );
};
