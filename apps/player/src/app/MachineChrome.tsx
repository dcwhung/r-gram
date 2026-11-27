import { ChromeFade } from '../components/chrome-fade/ChromeFade';
import type { ArmLeadIn } from '../components/tonearm/armPose';
import { Tonearm } from '../components/tonearm/Tonearm';
import type { StageLayout } from '../stage/layouts';
import type { HomeView } from './homeView';

interface MachineChromeProps {
    layout: StageLayout;
    view: HomeView;
    leadIn: ArmLeadIn;
    /** 唱臂即時到位（淡出咗，或者啱啱換咗碟） */
    instant: boolean;
}

/**
 * 唱臂（設計稿第 19 版 armFade；B-086 ⑤）：字母盤開住、拎住另一隻碟（有細唱片機）時淡出；淡出咗就唔接受 pointer；
 * 淡出期間姿勢變咗就即時到位（淡入返嗰陣已經喺新位，唔行開場）。
 * 三粒細掣（同樣喺字母盤開住時淡出）喺貼頂組 BookletLayer：要喺歌書嘅暗層上面（T-072；設計稿 scene() 次序）。
 */
export const MachineChrome = ({ layout, view, leadIn, instant }: MachineChromeProps) => (
    <ChromeFade part="chrome-arm" hidden={view.armHidden}>
        <Tonearm
            arm={layout.arm}
            pose={view.armPose}
            leadIn={leadIn}
            instant={instant}
            glow={view.glow}
        />
    </ChromeFade>
);
