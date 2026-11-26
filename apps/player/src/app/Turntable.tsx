import type { RefObject } from 'react';
import { ChromeFade } from '../components/chrome-fade/ChromeFade';
import { DiscStack } from '../components/disc-stack/DiscStack';
import { HeldScrim } from '../components/held-tracks/HeldScrim';
import { Screws } from '../components/metal/Screws';
import { Platter } from '../components/platter/Platter';
import { Spindle } from '../components/spindle/Spindle';
import { useArmLeadIn } from '../components/tonearm/useArmLeadIn';
import { useSwapInstant } from '../components/tonearm/useSwapInstant';
import { DESIGN_HEIGHT } from '../stage/fitStage';
import type { Point, StageLayout } from '../stage/layouts';
import { DialControls, type DialHandlers } from './DialControls';
import type { HomeView } from './homeView';
import { ListVeil } from './ListVeil';
import { MachineChrome } from './MachineChrome';

export interface HomeHandlers extends DialHandlers {
    /** 㩒唱片夾：開歌單｜播揀中嗰首｜暫停 / 繼續 */
    onSpindle: () => void;
    onBooklet: () => void;
    onMv: () => void;
    onMode: () => void;
    /** 㩒歌單嘅暗位（或者 Esc）收返 */
    onCloseList: () => void;
    /** 主頁㩒碟面：打開弧線歌單（T-037） */
    onOpenList: () => void;
    /** 歌單捲到停低：框入面換咗另一首 */
    onFocusListTrack: (trackId: string) => void;
    /** 歌單入面㩒一行（或者 Enter）：播嗰首 */
    onPlayListTrack: (trackId: string) => void;
    /** 㩒右上角細唱片機：放低拎住嘅碟，返去載入嘅碟（T-048） */
    onReturnToLoaded: () => void;
    /** 㩒拎住嘅碟嘅歌單欄一行：將隻碟放入唱片機播嗰首（T-049） */
    onPlayHeldTrack: (trackId: string) => void;
}

/** 螺絲分兩組：上半嘅貼頂，下半嘅（左下）跟唱片機貼底（FR-039） */
export const isLowerHalf = ({ y }: Point) => y > DESIGN_HEIGHT / 2;

interface TurntableProps {
    layout: StageLayout;
    view: HomeView;
    handlers: HomeHandlers;
    /** 唱片夾（`useSpindleFocus`）：收返歌單（S-074）之後 focus 交返佢；`onCloseList` 已經包好 */
    spindleRef: RefObject<SVGGElement | null>;
}

/**
 * 唱片機（貼底組，FR-039；設計稿第 18 版 scene()）：左下螺絲 → 轉盤 → 碟（唱片夾緊接喺而家隻碟後面）→
 * 半透明層（拎住另一隻碟，T-049）→ 唱臂 → 三粒細掣 → 字母盤、旋鈕、♥。揀碟時唱臂同細掣淡出，淡出期間姿勢變就即時到位（T-036）。
 * 拎住另一隻碟時（T-048）轉盤都淡出、唱片夾唔係掣；返去載入嘅碟（顯示嘅碟換咗）唱臂即時到位，唔行開場。
 * 歌單嘅暗層（暫時嘅佔位，T-037）蓋住全部，只有唱片夾喺佢上面。
 */
export const Turntable = ({ layout, view, handlers, spindleRef }: TurntableProps) => {
    const instant = useSwapInstant(view.album?.id ?? null) || view.chromeHidden;
    const leadIn = useArmLeadIn(view.armPose, instant);
    const lowerScrews = layout.screws.points.filter(isLowerHalf);
    const spindle = (
        <Spindle
            ref={spindleRef}
            layout={layout}
            mode={view.spindle}
            progress={view.progress}
            accent={view.accent}
            // 電視開住時唱片夾喺電視後面（T-060），useHome 唔理；停用令讀屏用戶知（S-073）
            disabled={view.mvOpen}
            inert={view.holding}
            onPress={handlers.onSpindle}
        />
    );
    return (
        <>
            <g data-part="screws">
                <Screws points={lowerScrews} />
            </g>
            <ChromeFade part="platter-fade" hidden={view.holding}>
                <Platter disc={layout.disc} platter={layout.platter} />
            </ChromeFade>
            {/* 碟等唱針放低之後先轉（leadIn） */}
            <DiscStack
                layout={layout}
                entries={view.dial.entries}
                current={view.dial.current}
                open={view.dial.open}
                spinning={view.spinning && leadIn === null}
            >
                {!view.listOpen && spindle}
            </DiscStack>
            <HeldScrim layout={layout} shown={view.holding} screws={lowerScrews} />
            <MachineChrome
                layout={layout}
                view={view}
                handlers={handlers}
                leadIn={leadIn}
                instant={instant}
            />
            <DialControls layout={layout} view={view} handlers={handlers} />
            {view.listOpen && <ListVeil onClose={handlers.onCloseList} />}
            {view.listOpen && spindle}
        </>
    );
};
