import { Tv, type TvHandlers } from '../components/tv/Tv';
import { PHONE_LAYOUT, type StageLayout } from '../stage/layouts';
import { StageSvg } from '../stage/StageSvg';
import type { TextMeasure } from '../utils/textMeasure';
import type { HomeView } from './homeView';
import { TopGroup, type UpdateAction } from './TopGroup';
import { type HomeHandlers, Turntable } from './Turntable';
import { useBookletClosing } from './useBookletClosing';
import { useListOpener } from './useListOpener';
import { useSpindleFocus } from './useSpindleFocus';
import type { TvView } from './tvView';
import { useTvFocusReturn } from './useTvFocusReturn';
import './homeScene.css';

export type { HomeHandlers } from './Turntable';

interface HomeSceneProps {
    view: HomeView;
    handlers: HomeHandlers;
    /** 量文字闊度（左上資訊縮字用） */
    measure: TextMeasure;
    layout?: StageLayout;
    /** 有新版本等緊（T-109）：右上版本號變成掣 */
    update?: UpdateAction | null;
    /** MV 電視（T-060）；收埋咗 = null */
    tv?: TvView | null;
    tvHandlers?: TvHandlers | null;
}

type MachineProps = Pick<HomeSceneProps, 'view' | 'handlers' | 'measure' | 'update'> & {
    layout: StageLayout;
};

/** 唱片機：貼頂組 + 貼底組（同一個 SVG 畫布） */
const Machine = ({ view, handlers, measure, layout, update }: MachineProps) => {
    const { spindleRef, focusSpindleAfter } = useSpindleFocus();
    const { faceRef, closeList } = useListOpener(spindleRef);
    const booklet = useBookletClosing(view.bookletOpen, handlers.onBooklet);
    // 收返歌單（S-074、T-037）：focus 交返碟面；揀咗歌播：交畀唱片夾（播放／暫停）
    const listHandlers = {
        onCloseList: closeList(handlers.onCloseList),
        onFocusListTrack: handlers.onFocusListTrack,
        onPlayListTrack: (trackId: string) =>
            focusSpindleAfter(() => handlers.onPlayListTrack(trackId))(),
    };
    return (
        <StageSvg
            top={
                <TopGroup
                    layout={layout}
                    view={view}
                    measure={measure}
                    onReturnToLoaded={focusSpindleAfter(handlers.onReturnToLoaded)}
                    listHandlers={listHandlers}
                    onFavourite={handlers.onFavourite}
                    update={update}
                    chrome={handlers}
                    booklet={booklet}
                />
            }
            bottom={
                <Turntable
                    layout={layout}
                    view={view}
                    handlers={handlers}
                    spindleRef={spindleRef}
                    faceRef={faceRef}
                />
            }
        />
    );
};

/**
 * 主頁（設計稿「未揀歌」「播緊」「暫停」「MV 收返之後」；Functional Spec US-002、FR-039）。
 * 貼頂組：頂部螺絲、右上角細唱片機（拎住另一隻碟時，T-048）、碟名下面嘅歌單欄（T-049）、左上資訊、
 * 右上版本號（有新版本時變成掣，T-109）；貼底組：唱片機。
 * 高身手機多出嚟嘅高度喺兩組中間。
 * 弧線歌單（T-037）同歌書（T-072；連三粒細掣，佢哋喺歌書上面）喺貼頂組；歌書收返有過場（useBookletClosing）。
 * MV 電視（T-060）喺成個唱片機上面：開住時背後嗰層 inert（唔入 Tab 次序、㩒唔到、讀屏唔讀；D95 暗層規則），
 * 收埋之後 focus 交返 MV 掣。
 */
export const HomeScene = ({
    layout = PHONE_LAYOUT,
    tv = null,
    tvHandlers = null,
    ...machine
}: HomeSceneProps) => {
    const layer = useTvFocusReturn(tv !== null);
    return (
        <>
            <div ref={layer} className="home-layer" data-part="home-layer" inert={tv !== null}>
                <Machine layout={layout} {...machine} />
            </div>
            {tv && tvHandlers && (
                <Tv layout={layout} tv={tv} handlers={tvHandlers} measure={machine.measure} />
            )}
        </>
    );
};
