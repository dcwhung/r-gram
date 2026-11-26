import { memo } from 'react';
import type { HeldTrackRow as Row } from '../../app/heldTracksView';
import { t } from '../../i18n/t';
import { heldRowHitRight } from '../../stage/geometry';
import type { StageLayout } from '../../stage/layouts';
import { px } from '../svgNumber';
import { heldTitleX } from './useShownTitles';

interface HeldTrackRowProps {
    layout: StageLayout;
    row: Row;
    /** 呢行中線嘅 y（未捲；捲動喺成欄嘅 transform） */
    y: number;
    accent: string;
    /** 顯示嘅歌名（已經截短，useShownTitles） */
    shown: string;
}

/**
 * 透明範圍（由畫面左邊到 right + rowReach）、歌號（專輯色）、歌名（放唔落用「…」）。
 * 範圍唔係掣：只係蓋住下面嘅碟面，㩒落歌單欄唔會開弧線歌單（B-086 ①）；喺度拖照捲
 */
const RowBody = ({ layout, row, y, accent, shown }: HeldTrackRowProps) => {
    const column = layout.heldTracks;
    return (
        <>
            <rect
                data-part="held-hit"
                x={0}
                y={px(y - column.pitch / 2)}
                width={heldRowHitRight(layout)}
                height={column.pitch}
                fill="transparent"
            />
            <text
                data-part="held-number"
                className="held-number"
                dominantBaseline="central"
                x={column.x}
                y={px(y)}
                fontSize={px(column.size * column.number.scale)}
                fill={row.playable ? accent : undefined}
            >
                {row.number}
            </text>
            <text
                data-part="held-title"
                className="held-title"
                dominantBaseline="central"
                x={heldTitleX(layout)}
                y={px(y)}
                fontSize={column.size}
            >
                {shown}
            </text>
        </>
    );
};

/**
 * 歌單欄一行（設計稿第 19 版 trackPanel()；backlog B-086 ①）：純睇，唔係掣、唔入 Tab 次序。
 * 讀屏讀歌號同全名；未有音檔 = 灰色，讀「未有音檔」（D11、D70）。memo：props 冇變（例如捲動）就唔再 render（W-043）
 */
export const HeldTrackRow = memo(function HeldTrackRow(props: HeldTrackRowProps) {
    const { row } = props;
    const names = { no: row.no, title: row.title };
    return (
        <g
            role="listitem"
            className={row.playable ? 'held-row' : 'held-row held-row--off'}
            data-playable={row.playable}
            aria-label={t(row.playable ? 'list.track' : 'list.unavailable', names)}
        >
            <g aria-hidden="true">
                <RowBody {...props} />
            </g>
        </g>
    );
});
