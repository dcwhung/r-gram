import { useRef } from 'react';
import { flushSync } from 'react-dom';
import { DiscStack } from '../components/disc-stack/DiscStack';
import { Screws } from '../components/metal/Screws';
import { Platter } from '../components/platter/Platter';
import { Spindle } from '../components/spindle/Spindle';
import { useArmLeadIn } from '../components/tonearm/useArmLeadIn';
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
    /** 㩒歌單嘅暗位收返 */
    onCloseList: () => void;
    /** 㩒右上角細唱片機：放低拎住嘅碟，返去載入嘅碟（T-048） */
    onReturnToLoaded: () => void;
}

/** 螺絲分兩組：上半嘅貼頂，下半嘅（左下）跟唱片機貼底（FR-039） */
export const isLowerHalf = ({ y }: Point) => y > DESIGN_HEIGHT / 2;

/**
 * S-074：暗層係 focus 緊嘅掣，收返之後佢冇咗：focus 交返唱片夾，唔好跌去 body。
 * 收返之後唱片夾由暗層上面搬返去碟後面（重新 mount），所以先同步 render 完先 focus 新嗰個。
 */
const useCloseList = (onCloseList: () => void) => {
    const spindleRef = useRef<SVGGElement>(null);
    const closeList = () => {
        flushSync(onCloseList);
        spindleRef.current?.focus();
    };
    return { spindleRef, closeList };
};

interface TurntableProps {
    layout: StageLayout;
    view: HomeView;
    handlers: HomeHandlers;
}

/**
 * 唱片機（貼底組，FR-039；設計稿第 18 版 scene()）：左下螺絲 → 轉盤 → 碟（唱片夾緊接喺而家隻碟後面）→
 * 唱臂 → 三粒細掣 → 字母盤、旋鈕、♥。揀碟時唱臂同細掣淡出，淡出期間姿勢變就即時到位（T-036）。
 * 歌單嘅暗層（暫時嘅佔位，T-037）蓋住全部，只有唱片夾喺佢上面。
 */
export const Turntable = ({ layout, view, handlers }: TurntableProps) => {
    const leadIn = useArmLeadIn(view.armPose, view.chromeHidden);
    const { spindleRef, closeList } = useCloseList(handlers.onCloseList);
    const spindle = (
        <Spindle
            ref={spindleRef}
            layout={layout}
            mode={view.spindle}
            progress={view.progress}
            accent={view.accent}
            // 電視開住時唱片夾喺電視後面（T-060），useHome 唔理；停用令讀屏用戶知（S-073）
            disabled={view.mvOpen}
            onPress={handlers.onSpindle}
        />
    );
    return (
        <>
            <g data-part="screws">
                <Screws points={layout.screws.points.filter(isLowerHalf)} />
            </g>
            <Platter disc={layout.disc} platter={layout.platter} />
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
            <MachineChrome layout={layout} view={view} handlers={handlers} leadIn={leadIn} />
            <DialControls layout={layout} view={view} handlers={handlers} />
            {view.listOpen && <ListVeil onClose={closeList} />}
            {view.listOpen && spindle}
        </>
    );
};
