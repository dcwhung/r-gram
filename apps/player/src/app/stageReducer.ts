/*
 * 場景狀態機（純函數）。Functional Spec CR-002；Technical Spec「CR-002 對技術設計嘅影響」。
 *
 *   preload → home ⇄ discChange
 *             home ⇄ list          （discChange 亦可以直接入 list：D27）
 *   overlay（只喺 home）：booklet ｜ mv，兩個唔會同時出現
 *
 * 唔合規嘅動作原樣回傳同一個 state（reference 相同），元件唔使自己再判斷。
 * 呢度冇「過場中」嘅狀態：過場係畫面嘅事，所以每個轉換本身就係「冇動畫」嘅路徑（減少動態效果時直接用）。
 * 播放狀態喺另一個 store；動作要用到嘅播放事實（有冇歌、有冇 MV）由發出動作嗰邊帶入嚟。
 */
import { FAVOURITES_ALBUM_ID } from '@r-gram/catalog';

export type Scene = 'preload' | 'home' | 'discChange' | 'list';
export type Overlay = 'booklet' | 'mv' | null;

export interface StageState {
    scene: Scene;
    /** 只喺 `scene === 'home'` 先可以唔係 null */
    overlay: Overlay;
    /** 畫面顯示緊嘅碟（可以同播緊嘅碟唔同）；Favourites 碟係 `favourites` */
    viewAlbumId: string | null;
    /** 去 Favourites 碟之前嗰隻碟：再㩒 ♥ 返去 */
    previousAlbumId: string | null;
    /** 歌單揀中 / 左上顯示嘅歌 */
    selectedTrackId: string | null;
}

export type StageAction =
    | { type: 'preloadDone'; albumId: string; trackId?: string }
    | { type: 'openDiscChange' }
    | { type: 'selectAlbum'; albumId: string }
    | { type: 'closeDiscChange' }
    | { type: 'openList' }
    | { type: 'focusTrack'; trackId: string }
    | { type: 'playSelected' }
    | { type: 'closeList' }
    | { type: 'toggleFavourites' }
    | { type: 'toggleBooklet'; hasSong: boolean }
    | { type: 'openMv'; hasMv: boolean }
    | { type: 'closeMv' };

export const INITIAL_STAGE: StageState = {
    scene: 'preload',
    overlay: null,
    viewAlbumId: null,
    previousAlbumId: null,
    selectedTrackId: null,
};

type Handler<T extends StageAction['type']> = (
    state: StageState,
    action: Extract<StageAction, { type: T }>,
) => StageState;

const isMvShowing = (state: StageState) => state.overlay === 'mv';
/** 主頁，而且電視冇開（歌書開住唔緊要：會被新場景收起） */
const isOpenHome = (state: StageState) => state.scene === 'home' && !isMvShowing(state);

/** 換去另一隻碟：揀中嘅歌屬於舊碟，所以清走；同一隻碟就乜都唔變 */
const viewAlbum = (state: StageState, albumId: string): StageState =>
    albumId === state.viewAlbumId
        ? state
        : {
              ...state,
              viewAlbumId: albumId,
              selectedTrackId: null,
              // 離開一隻真專輯時記低佢，等 ♥ 可以返去
              previousAlbumId:
                  state.viewAlbumId && state.viewAlbumId !== FAVOURITES_ALBUM_ID
                      ? state.viewAlbumId
                      : state.previousAlbumId,
          };

const toggleFavourites: Handler<'toggleFavourites'> = (state) => {
    const canReact = isOpenHome(state) || state.scene === 'discChange';
    if (!canReact) return state;
    const onFavourites = state.viewAlbumId === FAVOURITES_ALBUM_ID;
    const target = onFavourites ? state.previousAlbumId : FAVOURITES_ALBUM_ID;
    if (!target) return state;
    return { ...viewAlbum(state, target), overlay: null };
};

const toggleBooklet: Handler<'toggleBooklet'> = (state, { hasSong }) => {
    if (state.overlay === 'booklet') return { ...state, overlay: null };
    // D24：冇歌就冇內容，開唔到
    return isOpenHome(state) && hasSong ? { ...state, overlay: 'booklet' } : state;
};

const openList: Handler<'openList'> = (state) => {
    const canOpen = isOpenHome(state) || state.scene === 'discChange';
    return canOpen ? { ...state, scene: 'list', overlay: null } : state;
};

const HANDLERS: { [T in StageAction['type']]: Handler<T> } = {
    preloadDone: (state, { albumId, trackId }) =>
        state.scene === 'preload'
            ? { ...state, scene: 'home', viewAlbumId: albumId, selectedTrackId: trackId ?? null }
            : state,
    openDiscChange: (state) =>
        isOpenHome(state) ? { ...state, scene: 'discChange', overlay: null } : state,
    selectAlbum: (state, { albumId }) =>
        state.scene === 'discChange' ? viewAlbum(state, albumId) : state,
    // D27：留喺揀咗嗰隻碟返主頁
    closeDiscChange: (state) =>
        state.scene === 'discChange' ? { ...state, scene: 'home' } : state,
    openList,
    focusTrack: (state, { trackId }) =>
        state.scene === 'list' ? { ...state, selectedTrackId: trackId } : state,
    // 播揀中嗰首：返主頁（實際播放由發出動作嗰邊做）
    playSelected: (state) =>
        state.scene === 'list' && state.selectedTrackId ? { ...state, scene: 'home' } : state,
    // D25：㩒暗位收返，碟同揀中嘅歌都唔變
    closeList: (state) => (state.scene === 'list' ? { ...state, scene: 'home' } : state),
    toggleFavourites,
    toggleBooklet,
    // 電視同歌書唔會同時出現：開電視會收起歌書
    openMv: (state, { hasMv }) =>
        isOpenHome(state) && hasMv ? { ...state, overlay: 'mv' } : state,
    closeMv: (state) => (isMvShowing(state) ? { ...state, overlay: null } : state),
};

export const stageReducer = (state: StageState, action: StageAction): StageState => {
    const handler = HANDLERS[action.type] as Handler<StageAction['type']>;
    return handler(state, action);
};
