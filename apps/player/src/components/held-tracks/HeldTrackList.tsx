import { memo } from 'react';
import type { HeldTracksView } from '../../app/heldTracksView';
import { t } from '../../i18n/t';
import { heldRowHitRight } from '../../stage/geometry';
import type { StageLayout } from '../../stage/layouts';
import type { TextMeasure } from '../../utils/textMeasure';
import { useSvgId } from '../svgId';
import { px } from '../svgNumber';
import { clipRef, ColumnEdges, fadeRef } from './ColumnEdges';
import { rowCentre } from './columnLayout';
import { HeldTrackRow } from './HeldTrackRow';
import './heldTracks.css';
import { ScrollBar } from './ScrollBar';
import { useHeldScroll } from './useHeldScroll';
import { useShownTitles } from './useShownTitles';

interface HeldTrackListProps {
    layout: StageLayout;
    held: HeldTracksView;
    /** 拎住嘅碟嘅碟名（成欄嘅無障礙名） */
    albumTitle: string;
    measure: TextMeasure;
    /** 㩒一行：將拎住嘅碟放入唱片機播嗰首 */
    onPlay: (trackId: string) => void;
}

/** 冇歌嘅碟：欄入面第一行嘅位置寫一行灰字（D39；Favourites 碟冇收藏有自己一句） */
const EmptyText = ({ layout, text }: { layout: StageLayout; text: string }) => {
    const column = layout.heldTracks;
    return (
        <text
            data-part="held-empty"
            className="held-empty"
            dominantBaseline="central"
            x={column.x}
            y={px(column.top + column.pitch / 2)}
            fontSize={column.size}
        >
            {text}
        </text>
    );
};

/**
 * 欄本身攞到鍵盤 focus 時嘅虛線框（review S-179；CSS 同行嘅框共用一條規則）：同行嘅感應範圍一樣闊、同欄一樣高。
 * 喺欄（role="list"）後面嘅兄弟元素，唔受欄嘅 clipPath 剪；淨係畫面
 */
const ColumnFrame = ({ layout, room }: { layout: StageLayout; room: number }) => (
    <rect
        data-part="held-frame"
        aria-hidden="true"
        pointerEvents="none"
        x={0}
        y={layout.heldTracks.top}
        width={heldRowHitRight(layout)}
        height={px(room)}
        fill="none"
    />
);

/**
 * 拎住嘅碟嘅歌單欄（設計稿第 18 版 TRACKLIST、trackPanel()；Functional Spec FR-044、D57）：碟名下面一欄黑字，
 * 冇黑色層。旋鈕開住時欄較短、行未㩒得；歌多就喺欄入面捲（拖動、滾輪、鍵盤），頂底淡出、左邊位置條。
 * 以碟做 key render（換碟捲動歸零）。欄底跟貼底組：高身手機向下伸。
 */
type RowsProps = Pick<HeldTrackListProps, 'layout' | 'held' | 'onPlay'> & {
    shown: readonly string[];
    onFocusRow: (index: number) => void;
};

/**
 * 全部行（欄外嘅都 render：Tab 到嗰陣捲入欄），以未捲嘅位置畫；捲動係外面一層 transform。
 * memo：捲動唔使 render 任何一行，亦唔使重新截短歌名（review W-043）
 */
const Rows = memo(function Rows({ layout, held, shown, onPlay, onFocusRow }: RowsProps) {
    const { top, pitch } = layout.heldTracks;
    return held.rows.map((row, index) => (
        <HeldTrackRow
            key={row.id}
            layout={layout}
            row={row}
            index={index}
            y={top + rowCentre(index, pitch, 0)}
            accent={held.accent}
            shown={shown[index] ?? row.title}
            canPress={held.pressable}
            onPlay={onPlay}
            onFocusRow={onFocusRow}
        />
    ));
});

export const HeldTrackList = (props: HeldTrackListProps) => {
    const { layout, held, albumTitle, measure, onPlay } = props;
    const { top, fade } = layout.heldTracks;
    const { room, metrics, listRef, handlers, showRow } = useHeldScroll(layout, held);
    const shown = useShownTitles(held.rows, layout, measure);
    // 歌多過欄高先有嘢捲：欄先入 Tab 次序（S-177）、先有 focus 外框（S-179）
    const focusable = metrics.maxScroll > 0;
    const id = useSvgId('held-tracks');
    if (held.rows.length === 0) return <EmptyText layout={layout} text={held.emptyText} />;
    return (
        <g data-part="held-tracks" className="held-tracks">
            <ColumnEdges id={id} top={top} room={room} fade={fade} metrics={metrics} />
            <g
                ref={listRef}
                role="list"
                className="held-list"
                aria-label={t('heldTracks.label', { album: albumTitle })}
                tabIndex={focusable ? 0 : undefined}
                data-fade-top={metrics.fadeTop}
                data-fade-bottom={metrics.fadeBottom}
                clipPath={clipRef(id)}
                {...handlers}
            >
                <g mask={fadeRef(id)}>
                    <g data-part="held-scroll" transform={`translate(0 ${px(-metrics.scroll)})`}>
                        <Rows
                            layout={layout}
                            held={held}
                            shown={shown}
                            onPlay={onPlay}
                            onFocusRow={showRow}
                        />
                    </g>
                </g>
            </g>
            {focusable && <ColumnFrame layout={layout} room={room} />}
            {metrics.bar && (
                <ScrollBar
                    layout={layout}
                    top={top}
                    room={room}
                    bar={metrics.bar}
                    accent={held.accent}
                />
            )}
        </g>
    );
};
