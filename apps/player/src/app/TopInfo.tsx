import { InfoBlock } from '../components/info-block/InfoBlock';
import { hitSizeUnits } from '../stage/geometry';
import type { StageLayout } from '../stage/layouts';
import type { TextMeasure } from '../utils/textMeasure';
import type { HomeView } from './homeView';

interface TopInfoProps {
    layout: StageLayout;
    view: HomeView;
    measure: TextMeasure;
    /** 歌單開住（飄落期間暗層下面墊一份黑字時係 false） */
    listOpen: boolean;
    /** 心形掣（T-070）；冇畀 = 心形只係圖案（例如飄落期間墊喺下面嗰份） */
    onFavourite?: () => void;
}

/** 左上資訊（主頁貼頂組）：由主頁衍生值砌 InfoBlock 嘅 props */
export const TopInfo = ({ layout, view, measure, listOpen, onFavourite }: TopInfoProps) => (
    <InfoBlock
        info={layout.info}
        album={view.album}
        track={view.track}
        timeText={view.timeText}
        accent={view.accent}
        glow={view.glow}
        measure={measure}
        hitSize={hitSizeUnits(layout)}
        sub={view.albumSub}
        songHidden={view.songHidden}
        held={view.holding}
        listOpen={listOpen}
        listTrack={listOpen ? view.listTrack : null}
        favourite={view.favourite}
        onFavourite={onFavourite}
        origin={view.origin}
    />
);
