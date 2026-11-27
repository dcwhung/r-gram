/*
 * 歌書要顯示乜（純函數；Functional Spec CR-002「歌書」、D24；Technical Spec「場景狀態機」overlay）：
 * 只喺歌書開住、而且有歌（左上嗰首：播緊、暫停緊或者播完未放低）先有。歌書開住時換咗歌（自動下一首）就跟新嗰首。
 */
import type { CatalogTrack, TrackCredits } from '@r-gram/catalog';
import type { StageState } from './stageReducer';

export interface BookletView {
    trackId: string;
    /** 歌名（歌書嘅無障礙名） */
    title: string;
    /** 曲詞編監；冇 = null（四項都冇） */
    credits: TrackCredits | null;
}

export const bookletView = (stage: StageState, track: CatalogTrack | null): BookletView | null =>
    stage.overlay === 'booklet' && track
        ? { trackId: track.id, title: track.title, credits: track.credits }
        : null;
