import type { StageLayout } from '../../stage/layouts';
import type { ScrollBarMetrics } from './columnLayout';
import { px } from '../svgNumber';

interface ScrollBarProps {
    layout: StageLayout;
    top: number;
    room: number;
    bar: ScrollBarMetrics;
    accent: string;
}

/**
 * 歌單欄**左邊**嘅幼位置條（設計稿第 18 版 trackPanel()：喺歌號左邊；底條淡黑、位置專輯色）。
 * 只係顯示：唔接受 pointer（下面嘅行照㩒得、照拖得）
 */
export const ScrollBar = ({ layout, top, room, bar, accent }: ScrollBarProps) => {
    const { width, x } = layout.heldTracks.bar;
    return (
        <g data-part="held-bar" aria-hidden="true" pointerEvents="none">
            <rect
                className="held-bar-track"
                x={x}
                y={top}
                width={width}
                height={px(room)}
                rx={width / 2}
            />
            <rect
                data-part="held-bar-thumb"
                x={x}
                y={px(top + bar.offset)}
                width={width}
                height={px(bar.length)}
                rx={width / 2}
                fill={accent}
            />
        </g>
    );
};
