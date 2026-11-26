import type { TrackRow } from '../../app/heldTracksView';
import type { StageLayout } from '../../stage/layouts';
import type { TextMeasure } from '../../utils/textMeasure';
import { RowBody } from '../held-tracks/HeldTrackRow';
import '../held-tracks/heldTracks.css';
import { useShownTitles } from '../held-tracks/useShownTitles';

interface ArcColumnGhostsProps {
    layout: StageLayout;
    rows: readonly TrackRow[];
    /** 要淡出嘅行（歌單欄入面、飄唔到弧線上嗰啲） */
    indexes: readonly number[];
    accent: string;
    measure: TextMeasure;
}

/**
 * 由歌單欄開弧線歌單時，歌單欄其餘嘅行喺原位淡出（設計稿第 19 版 list-ghost-out）。同歌單欄一樣嘅黑字，
 * 喺貼頂組嘅座標；淨係畫面：唔接受 pointer、讀屏唔讀
 */
export const ArcColumnGhosts = ({
    layout,
    rows,
    indexes,
    accent,
    measure,
}: ArcColumnGhostsProps) => {
    const shown = useShownTitles(rows, layout, measure);
    const { top, pitch } = layout.heldTracks;
    return (
        <g data-part="arc-ghosts" className="arc-ghosts" aria-hidden="true" pointerEvents="none">
            {indexes.map((index) => {
                const row = rows[index];
                if (!row) return null;
                return (
                    <g
                        key={row.id}
                        className={row.playable ? 'held-row' : 'held-row held-row--off'}
                    >
                        <RowBody
                            layout={layout}
                            row={row}
                            y={top + pitch * (index + 0.5)}
                            accent={accent}
                            shown={shown[index] ?? row.title}
                        />
                    </g>
                );
            })}
        </g>
    );
};
