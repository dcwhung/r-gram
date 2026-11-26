import type { HeldTracksView } from '../../app/heldTracksView';
import { t } from '../../i18n/t';
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
 * 拎住嘅碟嘅歌單欄（設計稿第 18 版 TRACKLIST、trackPanel()；Functional Spec FR-044、D57）：碟名下面一欄黑字，
 * 冇黑色層。旋鈕開住時欄較短、行未㩒得；歌多就喺欄入面捲（拖動、滾輪、鍵盤），頂底淡出、左邊位置條。
 * 以碟做 key render（換碟捲動歸零）。欄底跟貼底組：高身手機向下伸。
 */
type RowsProps = Omit<HeldTrackListProps, 'albumTitle'> & {
    scroll: number;
    showRow: (index: number) => void;
};

/** 全部行（欄外嘅都 render：Tab 到嗰陣捲入欄）；位置由捲動計 */
const Rows = ({ layout, held, measure, onPlay, scroll, showRow }: RowsProps) => {
    const { top, pitch } = layout.heldTracks;
    return held.rows.map((row, index) => (
        <HeldTrackRow
            key={row.id}
            layout={layout}
            row={row}
            index={index}
            y={top + rowCentre(index, pitch, scroll)}
            accent={held.accent}
            measure={measure}
            canPress={held.pressable}
            onPlay={onPlay}
            onFocus={() => showRow(index)}
        />
    ));
};

export const HeldTrackList = (props: HeldTrackListProps) => {
    const { layout, held, albumTitle } = props;
    const { top, fade } = layout.heldTracks;
    const { room, metrics, listRef, handlers, showRow } = useHeldScroll(layout, held);
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
                tabIndex={metrics.maxScroll > 0 ? 0 : undefined}
                data-fade-top={metrics.fadeTop}
                data-fade-bottom={metrics.fadeBottom}
                clipPath={clipRef(id)}
                {...handlers}
            >
                <g mask={fadeRef(id)}>
                    <Rows {...props} scroll={metrics.scroll} showRow={showRow} />
                </g>
            </g>
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
