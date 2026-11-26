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
import { DiscFace } from './DiscFace';
import type { HomeView } from './homeView';
import { MachineChrome } from './MachineChrome';

export interface HomeHandlers extends DialHandlers {
    /** 㩒唱片夾：播第一首（未揀歌）｜播框入面嗰首（歌單）｜暫停 / 繼續 */
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
    /** 歌單入面 Enter／Space：播框入面嗰首（行唔㩒得，W-051；唱片夾經 onSpindle） */
    onPlayListTrack: (trackId: string) => void;
    /** 㩒右上角細唱片機：放低拎住嘅碟，返去載入嘅碟（T-048） */
    onReturnToLoaded: () => void;
}

/** 螺絲分兩組：上半嘅貼頂，下半嘅（左下）跟唱片機貼底（FR-039） */
export const isLowerHalf = ({ y }: Point) => y > DESIGN_HEIGHT / 2;

interface TurntableProps {
    layout: StageLayout;
    view: HomeView;
    handlers: HomeHandlers;
    /** 唱片夾（`useSpindleFocus`）：收返歌單（S-074）之後 focus 交返佢 */
    spindleRef: RefObject<SVGGElement | null>;
    /** 碟面（`useListOpener`）：由碟面打開嘅歌單收返之後 focus 交返佢（T-037） */
    faceRef: RefObject<SVGPathElement | null>;
}

/**
 * 緊接喺而家隻碟後面：唱片夾，再上面係碟面嘅感應範圍（中間留返唱片夾嘅位；T-037，只喺開得歌單時先有）
 */
const Hub = ({ layout, view, handlers, spindleRef, faceRef }: TurntableProps) => (
    <>
        <Spindle
            ref={spindleRef}
            layout={layout}
            mode={view.spindle}
            progress={view.progress}
            accent={view.accent}
            // 電視開住時唱片夾喺電視後面（T-060）、字母盤開住時（B-086 ④），useHome 唔理；停用令讀屏用戶知（S-073）
            disabled={view.mvOpen || view.dial.open}
            onPress={handlers.onSpindle}
        />
        {view.canOpenList && (
            <DiscFace ref={faceRef} layout={layout} onPress={handlers.onOpenList} />
        )}
    </>
);

/**
 * 唱片機（貼底組，FR-039；設計稿第 18 版 scene()）：左下螺絲 → 轉盤 → 碟（唱片夾緊接喺而家隻碟後面）→
 * 半透明層（有歌單欄時，B-086）→ 唱臂 → 三粒細掣 → 字母盤、旋鈕、♥。揀碟時唱臂同細掣淡出，淡出期間姿勢變就即時到位（T-036）。
 * 拎住另一隻碟時（T-048）轉盤都淡出；返去載入嘅碟（顯示嘅碟換咗）唱臂即時到位，唔行開場。
 * 主頁碟面（T-037）喺唱片夾後面：㩒碟面開弧線歌單；歌單本身（暗層、框、歌名）喺貼頂組（TopGroup）。
 */
export const Turntable = ({ layout, view, handlers, spindleRef, faceRef }: TurntableProps) => {
    const instant = useSwapInstant(view.album?.id ?? null) || view.armHidden;
    const leadIn = useArmLeadIn(view.armPose, instant);
    const lowerScrews = layout.screws.points.filter(isLowerHalf);
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
                <Hub
                    layout={layout}
                    view={view}
                    handlers={handlers}
                    spindleRef={spindleRef}
                    faceRef={faceRef}
                />
            </DiscStack>
            <HeldScrim layout={layout} shown={view.trackColumn !== null} screws={lowerScrews} />
            <MachineChrome
                layout={layout}
                view={view}
                handlers={handlers}
                leadIn={leadIn}
                instant={instant}
            />
            <DialControls layout={layout} view={view} handlers={handlers} />
        </>
    );
};
