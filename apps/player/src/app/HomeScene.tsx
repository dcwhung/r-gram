import { InfoBlock } from '../components/info-block/InfoBlock';
import { VersionText } from '../components/info-block/VersionText';
import { Screws } from '../components/metal/Screws';
import { PHONE_LAYOUT, type StageLayout } from '../stage/layouts';
import { StageSvg } from '../stage/StageSvg';
import type { TextMeasure } from '../utils/textMeasure';
import type { HomeView } from './homeView';
import { type HomeHandlers, isLowerHalf, Turntable } from './Turntable';

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
 * 貼頂組：頂部螺絲、左上資訊、右上版本號；貼底組：唱片機。高身手機多出嚟嘅高度喺兩組中間。
 * 歌單（T-037）只有暫時嘅暗層；歌書（T-072）、MV 電視（T-060）、轉碟（T-036）未有畫面，只改場景狀態。
 */
export const HomeScene = ({ view, handlers, measure, layout = PHONE_LAYOUT }: HomeSceneProps) => (
    <StageSvg
        top={
            <>
                <g data-part="screws">
                    <Screws points={layout.screws.points.filter((point) => !isLowerHalf(point))} />
                </g>
                <InfoBlock
                    info={layout.info}
                    album={view.album}
                    track={view.track}
                    timeText={view.timeText}
                    accent={view.accent}
                    measure={measure}
                    songHidden={view.songHidden}
                />
                <VersionText version={layout.info.version} />
            </>
        }
        bottom={<Turntable layout={layout} view={view} handlers={handlers} />}
    />
);
