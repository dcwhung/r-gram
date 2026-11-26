import { PHONE_LAYOUT, type StageLayout } from '../stage/layouts';
import { StageSvg } from '../stage/StageSvg';
import type { TextMeasure } from '../utils/textMeasure';
import type { HomeView } from './homeView';
import { TopGroup, type UpdateAction } from './TopGroup';
import { type HomeHandlers, Turntable } from './Turntable';
import { useListOpener } from './useListOpener';
import { useSpindleFocus } from './useSpindleFocus';

export type { HomeHandlers } from './Turntable';

interface HomeSceneProps {
    view: HomeView;
    handlers: HomeHandlers;
    /** 量文字闊度（左上資訊縮字用） */
    measure: TextMeasure;
    layout?: StageLayout;
    /** 有新版本等緊（T-109）：右上版本號變成掣 */
    update?: UpdateAction | null;
}

/**
 * 主頁（設計稿「未揀歌」「播緊」「暫停」「MV 收返之後」；Functional Spec US-002、FR-039）。
 * 貼頂組：頂部螺絲、右上角細唱片機（拎住另一隻碟時，T-048）、碟名下面嘅歌單欄（T-049）、左上資訊、
 * 右上版本號（有新版本時變成掣，T-109）；貼底組：唱片機。
 * 高身手機多出嚟嘅高度喺兩組中間。
 * 弧線歌單（T-037）喺貼頂組；歌書（T-072）、MV 電視（T-060）未有畫面，只改場景狀態。
 */
export const HomeScene = ({
    view,
    handlers,
    measure,
    layout = PHONE_LAYOUT,
    update = null,
}: HomeSceneProps) => {
    const { spindleRef, focusSpindleAfter } = useSpindleFocus();
    const { faceRef, closeList } = useListOpener(spindleRef);
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
                    update={update}
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
