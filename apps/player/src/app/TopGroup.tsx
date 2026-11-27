import { ArcTrackList } from '../components/arc-list/ArcTrackList';
import { HeldTrackList } from '../components/held-tracks/HeldTrackList';
import { VersionText } from '../components/info-block/VersionText';
import { Screws } from '../components/metal/Screws';
import { MiniTurntable } from '../components/mini-turntable/MiniTurntable';
import { UpdateButton } from '../components/update-button/UpdateButton';
import type { StageLayout } from '../stage/layouts';
import type { TextMeasure } from '../utils/textMeasure';
import { BookletLayer } from './BookletLayer';
import type { HomeView } from './homeView';
import { TopInfo as Info } from './TopInfo';
import { type HomeHandlers, isLowerHalf } from './Turntable';
import type { BookletClosing } from './useBookletClosing';
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
    /** 㩒左上歌名後面嘅心形（T-070） */
    onFavourite: () => void;
    /** 有新版本等緊（T-109）：版本號變成掣，㩒 = 即刻更新；冇 = 照舊顯示版本號 */
    update?: UpdateAction | null;
    /** 三粒細掣嘅 MV、播放模式（i 掣經 `booklet.press`） */
    chrome: Pick<HomeHandlers, 'onMv' | 'onMode'>;
    /** 歌書開收（T-072：收返有過場） */
    booklet: BookletClosing;
}

export interface UpdateAction {
    onApply: () => void;
}

type PartProps = Pick<TopGroupProps, 'layout' | 'view' | 'measure'>;

/** 弧線歌單（T-037）：以碟做 key（換碟 = 新嘅捲動位置）；由歌單欄開就飄落（B-086 ②） */
const ArcList = ({
    layout,
    view,
    measure,
    listHandlers,
    floating,
}: Pick<TopGroupProps, 'layout' | 'view' | 'measure' | 'listHandlers'> & { floating: boolean }) =>
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

/** 左上資訊嘅過場 class：由歌單欄開弧線歌單（飄落）淡入；歌書開住淡入、收返緊淡出（白字；黑字墊喺暗層下面） */
const infoMotion = (view: HomeView, floating: boolean, closing: boolean) => {
    if (floating) return 'list-info-in';
    if (!view.booklet) return undefined;
    return closing ? 'booklet-info booklet-info--out' : 'booklet-info booklet-info--in';
};

/**
 * 主頁貼頂組（FR-039；設計稿第 18–20 版 scene() 次序）：頂部螺絲 →（有新版本：版本掣，T-109）→
 * 右上角細唱片機（T-048）→（飄落期間：暗層下面一份黑字左上資訊）→
 * 歌書（T-072：暗層蓋住唱片機、螺絲同版本掣）→ 三粒細掣（喺歌書上面）→
 * 弧線歌單（T-037：暗層蓋住唱片機、細唱片機、螺絲同細掣）→ 碟名下面嘅歌單欄（B-086；喺泊位嘅唱臂上面）→
 * 左上資訊同右上版本號（歌單、歌書開住係白字；有新版本時版本號變咗版本掣，喺暗層下面）
 */
export const TopGroup = (props: TopGroupProps) => {
    const { layout, view, measure, onReturnToLoaded, update, booklet } = props;
    const floating = useListFloating(view.list, layout);
    const parts = { layout, view, measure, onFavourite: props.onFavourite };
    const dark = view.listOpen || view.booklet !== null;
    return (
        <>
            <g data-part="screws">
                <Screws points={layout.screws.points.filter((point) => !isLowerHalf(point))} />
            </g>
            {update && (
                <UpdateButton
                    layout={layout}
                    measure={measure}
                    onPress={update.onApply}
                    covered={view.listOpen || view.bookletOpen || view.mvOpen}
                />
            )}
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
                    <Info {...parts} listOpen={false} onFavourite={undefined} />
                </g>
            )}
            <BookletLayer
                layout={layout}
                view={view}
                measure={measure}
                handlers={props.chrome}
                booklet={booklet}
            />
            <ArcList {...parts} listHandlers={props.listHandlers} floating={floating} />
            <TrackColumn {...parts} />
            <g className={infoMotion(view, floating, booklet.closing)}>
                <Info {...parts} listOpen={view.listOpen} dark={view.booklet !== null} />
                {update ? null : <VersionText version={layout.info.version} dark={dark} />}
            </g>
        </>
    );
};
