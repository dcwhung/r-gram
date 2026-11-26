import { ChromeFade } from '../components/chrome-fade/ChromeFade';
import { SmallButtons } from '../components/small-buttons/SmallButtons';
import type { ArmLeadIn } from '../components/tonearm/armPose';
import { Tonearm } from '../components/tonearm/Tonearm';
import type { StageLayout } from '../stage/layouts';
import type { HomeView } from './homeView';
import type { HomeHandlers } from './Turntable';

interface MachineChromeProps {
    layout: StageLayout;
    view: HomeView;
    handlers: Pick<HomeHandlers, 'onBooklet' | 'onMv' | 'onMode'>;
    leadIn: ArmLeadIn;
    /** 唱臂即時到位（淡出咗，或者啱啱換咗碟） */
    instant: boolean;
}

/**
 * 唱臂同三粒細掣（設計稿第 19 版 armFade、buttonsFade；B-086 ⑤）：字母盤開住兩樣都淡出；拎住另一隻碟時
 * 淨係唱臂淡出（有細唱片機），細掣照出（歌書、MV 灰色，因為顯示緊嘅碟未揀歌）。淡出咗就唔接受 pointer、
 * 細掣離開 Tab 次序；唱臂喺淡出期間姿勢變咗就即時到位（淡入返嗰陣已經喺新位，唔行開場）。
 */
export const MachineChrome = ({ layout, view, handlers, leadIn, instant }: MachineChromeProps) => (
    <>
        <ChromeFade part="chrome-arm" hidden={view.armHidden}>
            <Tonearm
                arm={layout.arm}
                pose={view.armPose}
                leadIn={leadIn}
                instant={instant}
                glow={view.glow}
            />
        </ChromeFade>
        <ChromeFade part="chrome-buttons" hidden={view.buttonsHidden}>
            <SmallButtons
                layout={layout}
                glow={view.glow}
                hasSong={view.hasSong}
                hasMv={view.hasMv}
                bookletOpen={view.bookletOpen}
                mvOpen={view.mvOpen}
                playing={view.playing}
                mode={view.mode}
                covered={view.listOpen || view.buttonsHidden}
                onBooklet={handlers.onBooklet}
                onMv={handlers.onMv}
                onMode={handlers.onMode}
            />
        </ChromeFade>
    </>
);
