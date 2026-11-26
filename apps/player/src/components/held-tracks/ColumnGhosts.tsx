import type { TrackColumnView } from '../../app/heldTracksView';
import type { StageLayout } from '../../stage/layouts';
import { RowBody } from './HeldTrackRow';

interface ColumnGhostsProps {
    layout: StageLayout;
    held: TrackColumnView;
    /** 讓出嚟嘅行（columnLayout.releasedRows） */
    rows: readonly number[];
    /** 鬆手嗰陣嘅捲動 */
    scroll: number;
    shown: readonly string[];
}

/**
 * 鬆手時欄底縮短（設計稿第 19 版 trackPanel() 嘅 panelShrink；backlog B-086 ⑤）：讓出嚟嗰幾行喺原位淡出
 *（同三粒細掣淡入一樣用 chromeFade token），淡出完就拆走（useColumnMotion）。淨係畫面：唔接受 pointer、讀屏唔讀。
 * 喺欄嘅 clipPath 同 mask 外面，所以唔會即刻被新欄底剪走。減少動態效果時根本唔會 render（useColumnMotion）
 */
export const ColumnGhosts = ({ layout, held, rows, scroll, shown }: ColumnGhostsProps) => {
    const { top, pitch } = layout.heldTracks;
    return (
        <g data-part="held-ghosts" className="held-ghosts" aria-hidden="true" pointerEvents="none">
            {rows.map((index) => {
                const row = held.rows[index];
                if (!row) return null;
                return (
                    <g
                        key={row.id}
                        className={row.playable ? 'held-row' : 'held-row held-row--off'}
                    >
                        <RowBody
                            layout={layout}
                            row={row}
                            y={top + pitch * (index + 0.5) - scroll}
                            accent={held.accent}
                            shown={shown[index] ?? row.title}
                        />
                    </g>
                );
            })}
        </g>
    );
};
