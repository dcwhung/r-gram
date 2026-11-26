/*
 * 拎住另一隻碟（純函數；Functional Spec FR-043、D52；Technical Spec「補充：播放端設計稿第 18 版確認嘅技術設計」）。
 * 載入嘅碟 = 播放狀態嘅 albumId（播緊或者暫停緊）；顯示嘅碟 = 場景狀態嘅 viewAlbumId。
 * 兩個唔同，而且喺主頁（或者旋鈕開住）= 手上拎住另一隻碟。衍生值，唔另外存（D58 ③：重開 app 唔記低）。
 */
import type { PlaybackState } from './playbackState';
import type { StageState } from './stageReducer';

/** 唱片機入面嘅碟：播放狀態唔係 idle 先有 */
export const loadedAlbumOf = (playback: PlaybackState): string | null =>
    playback.status === 'idle' ? null : playback.albumId;

export const isHolding = (stage: StageState, loadedAlbumId: string | null): boolean =>
    loadedAlbumId !== null &&
    (stage.scene === 'home' || stage.scene === 'discChange') &&
    stage.viewAlbumId !== loadedAlbumId;
