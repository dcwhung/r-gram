import { PHONE_LAYOUT, type StageLayout } from '../stage/layouts';
import { StageSvg } from '../stage/StageSvg';
import type { TextMeasure } from '../utils/textMeasure';
import type { HomeView } from './homeView';
import { TopGroup } from './TopGroup';
import { type HomeHandlers, Turntable } from './Turntable';
import { useSpindleFocus } from './useSpindleFocus';

export type { HomeHandlers } from './Turntable';

interface HomeSceneProps {
    view: HomeView;
    handlers: HomeHandlers;
    /** 量文字闊度（左上資訊縮字用） */
    measure: TextMeasure;
    layout?: StageLayout;
}

/**
 * 主頁（設計稿「未揀歌」「播緊」「暫停」「MV 收返之後」；Functional Spec US-002、FR-039）。
 * 貼頂組：頂部螺絲、右上角細唱片機（拎住另一隻碟時，T-048）、碟名下面嘅歌單欄（T-049）、左上資訊、右上版本號；貼底組：唱片機。
 * 高身手機多出嚟嘅高度喺兩組中間。
 * 歌單（T-037）只有暫時嘅暗層；歌書（T-072）、MV 電視（T-060）、轉碟（T-036）未有畫面，只改場景狀態。
 */
export const HomeScene = ({ view, handlers, measure, layout = PHONE_LAYOUT }: HomeSceneProps) => {
    const { spindleRef, focusSpindleAfter } = useSpindleFocus();
    // 收返歌單（S-074）、㩒細唱片機（隨即淡出、離開 Tab 次序，T-048）：focus 交畀唱片夾
    const onCloseList = focusSpindleAfter(handlers.onCloseList);
    return (
        <StageSvg
            top={
                <TopGroup
                    layout={layout}
                    view={view}
                    measure={measure}
                    onReturnToLoaded={focusSpindleAfter(handlers.onReturnToLoaded)}
                    // 㩒完一行歌單欄就冇咗（隻碟落咗轉盤）：focus 交畀唱片夾
                    onPlayHeldTrack={(trackId) =>
                        focusSpindleAfter(() => handlers.onPlayHeldTrack(trackId))()
                    }
                />
            }
            bottom={
                <Turntable
                    layout={layout}
                    view={view}
                    handlers={{ ...handlers, onCloseList }}
                    spindleRef={spindleRef}
                />
            }
        />
    );
};
