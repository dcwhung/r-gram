import { HeldTrackList } from '../components/held-tracks/HeldTrackList';
import { InfoBlock } from '../components/info-block/InfoBlock';
import { VersionText } from '../components/info-block/VersionText';
import { Screws } from '../components/metal/Screws';
import { MiniTurntable } from '../components/mini-turntable/MiniTurntable';
import type { StageLayout } from '../stage/layouts';
import type { TextMeasure } from '../utils/textMeasure';
import type { HomeView } from './homeView';
import { isLowerHalf } from './Turntable';

interface TopGroupProps {
    layout: StageLayout;
    view: HomeView;
    measure: TextMeasure;
    /** 㩒細唱片機（已經包好 focus 交接） */
    onReturnToLoaded: () => void;
    /** 㩒歌單欄一行（已經包好 focus 交接） */
    onPlayHeldTrack: (trackId: string) => void;
}

/**
 * 主頁貼頂組（FR-039；設計稿第 18 版 scene() 次序）：頂部螺絲 → 右上角細唱片機（T-048）→
 * 碟名下面拎住嘅碟嘅歌單欄（T-049）→ 左上資訊 → 右上版本號
 */
export const TopGroup = ({
    layout,
    view,
    measure,
    onReturnToLoaded,
    onPlayHeldTrack,
}: TopGroupProps) => (
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
            />
        )}
        {view.heldTracks && (
            <HeldTrackList
                key={view.heldTracks.albumId}
                layout={layout}
                held={view.heldTracks}
                albumTitle={view.dial.entries[view.dial.current]?.title ?? ''}
                measure={measure}
                onPlay={onPlayHeldTrack}
            />
        )}
        <InfoBlock
            info={layout.info}
            album={view.album}
            track={view.track}
            timeText={view.timeText}
            accent={view.accent}
            measure={measure}
            songHidden={view.songHidden}
            held={view.holding}
        />
        <VersionText version={layout.info.version} />
    </>
);
