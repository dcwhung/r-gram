import { ArcTrackList } from '../components/arc-list/ArcTrackList';
import { HeldTrackList } from '../components/held-tracks/HeldTrackList';
import { InfoBlock } from '../components/info-block/InfoBlock';
import { VersionText } from '../components/info-block/VersionText';
import { Screws } from '../components/metal/Screws';
import { MiniTurntable } from '../components/mini-turntable/MiniTurntable';
import type { StageLayout } from '../stage/layouts';
import type { TextMeasure } from '../utils/textMeasure';
import type { HomeView } from './homeView';
import { type HomeHandlers, isLowerHalf } from './Turntable';
import { useColumnEntrance } from './useColumnEntrance';
import { useListFloating } from './useListFloating';
import { useSettledColumn } from './useSettledColumn';

interface TopGroupProps {
    layout: StageLayout;
    view: HomeView;
    measure: TextMeasure;
    /** 㩒細唱片機（已經包好 focus 交接） */
    onReturnToLoaded: () => void;
    /**
     * 弧線歌單（T-037）：收返、捲到停低、Enter／Space 播框入面嗰首（行唔㩒得，W-051）；
     * 收返同播已經包好 focus 交接
     */
    listHandlers: Pick<HomeHandlers, 'onCloseList' | 'onFocusListTrack' | 'onPlayListTrack'>;
}

type PartProps = Pick<TopGroupProps, 'layout' | 'view' | 'measure'>;

/** 弧線歌單（T-037）：以碟做 key（換碟 = 新嘅捲動位置）；由歌單欄開就飄落（B-086 ②） */
const ArcList = ({
    layout,
    view,
    measure,
    listHandlers,
    floating,
}: Omit<TopGroupProps, 'onReturnToLoaded'> & { floating: boolean }) =>
    view.list && (
        <ArcTrackList
            key={view.list.albumId}
            layout={layout}
            list={view.list}
            albumTitle={view.album?.title ?? ''}
            measure={measure}
            onClose={listHandlers.onCloseList}
            onFocusTrack={listHandlers.onFocusListTrack}
            onPlay={listHandlers.onPlayListTrack}
            floating={floating}
        />
    );

/**
 * 碟名下面嘅歌單欄（B-086）：快擰途中唔 render，停定先出（useSettledColumn）；以碟同出現次數做 key（換碟、
 * 唔係拎住時打開字母盤 = 新嘅捲動、新嘅飄落，useColumnEntrance）
 */
const TrackColumn = ({ layout, view, measure }: PartProps) => {
    const disc = view.dial.entries[view.dial.current];
    const column = useSettledColumn(view.trackColumn, disc?.albumId ?? null);
    const entrance = useColumnEntrance(view.dial.open, view.holding);
    return (
        column && (
            <HeldTrackList
                key={`${column.albumId}:${entrance}`}
                layout={layout}
                held={column}
                albumTitle={disc?.title ?? ''}
                measure={measure}
            />
        )
    );
};

/** 左上資訊；`listOpen` 可以覆寫（飄落期間暗層下面墊一份黑字） */
const Info = ({ layout, view, measure, listOpen }: PartProps & { listOpen: boolean }) => (
    <InfoBlock
        info={layout.info}
        album={view.album}
        track={view.track}
        timeText={view.timeText}
        accent={view.accent}
        measure={measure}
        songHidden={view.songHidden}
        held={view.holding}
        listOpen={listOpen}
        listTrack={listOpen ? view.listTrack : null}
    />
);

/**
 * 主頁貼頂組（FR-039；設計稿第 19 版 scene() 次序）：頂部螺絲 → 右上角細唱片機（T-048）→
 *（飄落期間：暗層下面一份黑字左上資訊）→ 弧線歌單（T-037：暗層蓋住唱片機、細唱片機同螺絲）→
 * 碟名下面嘅歌單欄（B-086；喺泊位嘅唱臂上面）→
 * 左上資訊（飄落期間淡入）→ 右上版本號
 */
export const TopGroup = (props: TopGroupProps) => {
    const { layout, view, measure, onReturnToLoaded } = props;
    const floating = useListFloating(view.list, layout);
    const parts = { layout, view, measure };
    return (
        <>
            <g data-part="screws">
                <Screws points={layout.screws.points.filter((point) => !isLowerHalf(point))} />
            </g>
            {view.mini && (
                <MiniTurntable
                    layout={layout}
                    mini={view.mini}
                    measure={measure}
                    onPress={onReturnToLoaded}
                    covered={view.listOpen}
                />
            )}
            {floating && (
                <g data-part="list-info-ghost" className="list-info-ghost" aria-hidden="true">
                    <Info {...parts} listOpen={false} />
                </g>
            )}
            <ArcList {...parts} listHandlers={props.listHandlers} floating={floating} />
            <TrackColumn {...parts} />
            {floating ? (
                <g className="list-info-in">
                    <Info {...parts} listOpen={view.listOpen} />
                </g>
            ) : (
                <Info {...parts} listOpen={view.listOpen} />
            )}
            <VersionText version={layout.info.version} dark={view.listOpen} />
        </>
    );
};
