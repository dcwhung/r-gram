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
import { useSettledColumn } from './useSettledColumn';

interface TopGroupProps {
    layout: StageLayout;
    view: HomeView;
    measure: TextMeasure;
    /** 㩒細唱片機（已經包好 focus 交接） */
    onReturnToLoaded: () => void;
    /** 弧線歌單（T-037）：收返、捲到停低、㩒一行（收返同播已經包好 focus 交接） */
    listHandlers: Pick<HomeHandlers, 'onCloseList' | 'onFocusListTrack' | 'onPlayListTrack'>;
}

/** 弧線歌單（T-037）：以碟做 key（換碟 = 新嘅捲動位置） */
const ArcList = ({
    layout,
    view,
    measure,
    listHandlers,
}: Omit<TopGroupProps, 'onReturnToLoaded'>) =>
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
        />
    );

/**
 * 碟名下面嘅歌單欄（B-086）：快擰途中唔 render，停定先出（useSettledColumn）；以碟做 key（換碟 = 新嘅捲動、
 * 新嘅飄落）
 */
const TrackColumn = ({
    layout,
    view,
    measure,
}: Pick<TopGroupProps, 'layout' | 'view' | 'measure'>) => {
    const disc = view.dial.entries[view.dial.current];
    const column = useSettledColumn(view.trackColumn, disc?.albumId ?? null);
    return (
        column && (
            <HeldTrackList
                key={column.albumId}
                layout={layout}
                held={column}
                albumTitle={disc?.title ?? ''}
                measure={measure}
            />
        )
    );
};

/**
 * 主頁貼頂組（FR-039；設計稿第 19 版 scene() 次序）：頂部螺絲 → 弧線歌單（T-037：暗層蓋住唱片機同螺絲）→
 * 右上角細唱片機（T-048）→ 碟名下面嘅歌單欄（B-086；喺泊位嘅唱臂上面）→ 左上資訊 → 右上版本號
 */
export const TopGroup = ({
    layout,
    view,
    measure,
    onReturnToLoaded,
    listHandlers,
}: TopGroupProps) => (
    <>
        <g data-part="screws">
            <Screws points={layout.screws.points.filter((point) => !isLowerHalf(point))} />
        </g>
        <ArcList layout={layout} view={view} measure={measure} listHandlers={listHandlers} />
        {view.mini && (
            <MiniTurntable
                layout={layout}
                mini={view.mini}
                measure={measure}
                onPress={onReturnToLoaded}
            />
        )}
        <TrackColumn layout={layout} view={view} measure={measure} />
        <InfoBlock
            info={layout.info}
            album={view.album}
            track={view.track}
            timeText={view.timeText}
            accent={view.accent}
            measure={measure}
            songHidden={view.songHidden}
            held={view.holding}
            listOpen={view.listOpen}
            listTrack={view.listTrack}
        />
        <VersionText version={layout.info.version} dark={view.listOpen} />
    </>
);
