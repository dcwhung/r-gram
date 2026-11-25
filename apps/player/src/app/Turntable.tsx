import { Disc } from '../components/disc/Disc';
import { Screws } from '../components/metal/Screws';
import { Platter } from '../components/platter/Platter';
import { SmallButtons } from '../components/small-buttons/SmallButtons';
import { Spindle } from '../components/spindle/Spindle';
import { Tonearm } from '../components/tonearm/Tonearm';
import { useArmLeadIn } from '../components/tonearm/useArmLeadIn';
import { DESIGN_HEIGHT } from '../stage/fitStage';
import type { Point, StageLayout } from '../stage/layouts';
import type { HomeView } from './homeView';
import { ListVeil } from './ListVeil';

export interface HomeHandlers {
    /** 㩒唱片夾：開歌單｜播揀中嗰首｜暫停 / 繼續 */
    onSpindle: () => void;
    onBooklet: () => void;
    onMv: () => void;
    onMode: () => void;
    /** 㩒歌單嘅暗位收返 */
    onCloseList: () => void;
}

/** 螺絲分兩組：上半嘅貼頂，下半嘅（左下）跟唱片機貼底（FR-039） */
export const isLowerHalf = ({ y }: Point) => y > DESIGN_HEIGHT / 2;

interface TurntableProps {
    layout: StageLayout;
    view: HomeView;
    handlers: HomeHandlers;
}

/**
 * 唱片機（貼底組，FR-039）：左下螺絲、轉盤、碟、唱臂、三粒細掣、唱片夾。旋鈕同刻度係 T-036。
 * 唱片夾畫喺最後：歌單嘅暗層（暫時嘅佔位，T-037）要喺佢下面、其他嘢上面。
 */
export const Turntable = ({ layout, view, handlers }: TurntableProps) => {
    const leadIn = useArmLeadIn(view.armPose);
    const { disc, hub } = layout;
    return (
        <>
            <g data-part="screws">
                <Screws points={layout.screws.points.filter(isLowerHalf)} />
            </g>
            <Platter disc={disc} platter={layout.platter} />
            <g transform={`translate(${disc.x} ${disc.y})`}>
                {/* B-033：以專輯 id 做 key，換碟時新封面由 0° 開始；碟等唱針放低之後先轉 */}
                <Disc
                    key={view.album?.id ?? ''}
                    r={disc.r}
                    hub={hub}
                    coverUrl={view.coverUrl}
                    accent={view.accent}
                    spinning={view.armPose === 'playing' && leadIn === null}
                />
            </g>
            <Tonearm arm={layout.arm} pose={view.armPose} leadIn={leadIn} glow={view.glow} />
            <SmallButtons
                layout={layout}
                glow={view.glow}
                hasSong={view.hasSong}
                hasMv={view.hasMv}
                bookletOpen={view.bookletOpen}
                mvOpen={view.mvOpen}
                playing={view.playing}
                onBooklet={handlers.onBooklet}
                onMv={handlers.onMv}
                onMode={handlers.onMode}
            />
            {view.listOpen && <ListVeil onClose={handlers.onCloseList} />}
            <Spindle
                layout={layout}
                mode={view.spindle}
                progress={view.progress}
                accent={view.accent}
                onPress={handlers.onSpindle}
            />
        </>
    );
};
