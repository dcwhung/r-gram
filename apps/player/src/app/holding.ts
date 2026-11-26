/*
 * 拎住另一隻碟（純函數；Functional Spec FR-043、D52；Technical Spec「補充：播放端設計稿第 18 版確認嘅技術設計」）。
 * 載入嘅碟 = 播放狀態嘅 albumId（播緊或者暫停緊）；顯示嘅碟 = 場景狀態嘅 viewAlbumId。
 * 兩個唔同，而且喺主頁（或者旋鈕開住、或者開咗嗰隻碟嘅弧線歌單，設計稿第 19 版）= 手上拎住另一隻碟。衍生值，唔另外存（D58 ③：重開 app 唔記低）。
 */
import type { PlaybackState } from '../playback/playbackState';
import type { StageState } from './stageReducer';

/** 唱片機入面嘅碟：播放狀態唔係 idle 先有 */
export const loadedAlbumOf = (playback: PlaybackState): string | null =>
    playback.status === 'idle' ? null : playback.albumId;

/** 播放狀態入面有歌，而且係畫面上呢隻碟嘅（暫停期間轉去睇另一隻碟就唔係：D36 ④）= 顯示緊嘅碟揀咗歌 */
export const isLoadedHere = (stage: StageState, playback: PlaybackState): boolean =>
    playback.status !== 'idle' && playback.albumId === stage.viewAlbumId;

/**
 * 歌單欄幾時出（設計稿第 19 版 showsColumn()；backlog B-086，一條規則）：字母盤開住，或者主頁顯示緊嘅碟未揀歌
 *（冇歌載入、拎住另一隻碟）。揀咗歌而字母盤冇開 = 左上係歌名，冇歌單欄；弧線歌單、MV 開住時都冇
 */
export const showsColumn = (stage: StageState, playback: PlaybackState): boolean => {
    // 防守（review S-213）：MV 只喺顯示緊載入嘅碟、字母盤收埋時先開得，嗰陣歌單欄本身已經冇；
    // MV 開住又唔可以換碟或者開字母盤。保留呢條，唔靠其他守衛
    if (stage.overlay === 'mv') return false;
    if (stage.scene === 'discChange') return true;
    return stage.scene === 'home' && !isLoadedHere(stage, playback);
};

export const isHolding = (stage: StageState, loadedAlbumId: string | null): boolean =>
    loadedAlbumId !== null &&
    (stage.scene === 'home' || stage.scene === 'discChange' || stage.scene === 'list') &&
    stage.viewAlbumId !== loadedAlbumId;
