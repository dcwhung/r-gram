import type { CatalogDocument } from '@r-gram/catalog';
import { type Dispatch, useCallback, useReducer } from 'react';
import type { CoverVariants } from '../catalog/coverVariants';
import { albumTracks, dialAlbums, findTrack, isPlayable } from '../catalog/selectors';
import { useCoverVariants } from '../catalog/useCoverVariants';
import { usePrefetchOtherArt } from '../catalog/usePrefetchOtherArt';
import { homeView, listFocusTrackId, type HomeView } from './homeView';
import {
    IDLE_PLAYBACK,
    type PlaybackAction,
    playbackReducer,
    type PlaybackState,
} from '../playback/playbackState';
import { INITIAL_STAGE, type StageAction, stageReducer, type StageState } from './stageReducer';
import type { HomeHandlers } from './Turntable';

/**
 * 開 app 時嘅場景：一開始已經有 catalog（測試、hook 直接用）就由第一隻碟嘅主頁開始；
 * 冇就停喺 Preload，等 Preload 載入完叫 `finishPreload()`（T-034；重開 app 回復上次嘅碟同歌係 D12 嘅任務）。
 */
export const initialStage = (catalog: CatalogDocument | null): StageState => {
    const first = catalog?.albums[0];
    return first
        ? stageReducer(INITIAL_STAGE, { type: 'preloadDone', albumId: first.id })
        : INITIAL_STAGE;
};

interface HomeContext {
    catalog: CatalogDocument;
    stage: StageState;
    playback: PlaybackState;
    view: HomeView;
    dispatch: Dispatch<StageAction>;
    play: Dispatch<PlaybackAction>;
}

/**
 * 開始播一首（弧線歌單、唱片夾共用嘅路）：播放狀態 start（載入嘅碟換咗 = 舊歌停、唱臂由泊位開場）。
 * 真正出聲、隊列係 T-038
 */
const startTrack = (play: Dispatch<PlaybackAction>, albumId: string, trackId: string) =>
    play({ type: 'start', albumId, trackId });

/** 歌單入面㩒 play：播揀中嗰首（要播得）；冇歌嘅碟（D39）= 收返歌單（設計稿 ACTIONS.playpause） */
const playSelected = ({ catalog, stage, view, dispatch, play }: HomeContext) => {
    if (view.list?.rows.length === 0) dispatch({ type: 'closeList' });
    const found = stage.selectedTrackId ? findTrack(catalog, stage.selectedTrackId) : null;
    if (!found || !isPlayable(found.track)) return;
    dispatch({ type: 'playSelected' });
    startTrack(play, found.album.id, found.track.id);
};

/** 打開歌單，預先揀中載入嘅歌或者第一首（US-004） */
const openList = ({ catalog, stage, playback, dispatch }: HomeContext) => {
    const focus = listFocusTrackId(catalog, stage, playback);
    dispatch({ type: 'openList' });
    if (focus) dispatch({ type: 'focusTrack', trackId: focus });
};

/**
 * 歌單入面 Enter／Space（行唔㩒得，W-051）：揀框入面嗰首，再同㩒唱片夾一樣播（返主頁、播放狀態 start；
 * 真正出聲係 T-038）。要係歌單開住、嗰首喺呢隻碟而且播得
 */
const playListTrack = (context: HomeContext, trackId: string) => {
    const { view, dispatch, play } = context;
    const row = view.list?.rows.find((candidate) => candidate.id === trackId);
    if (!view.list || !row?.playable) return;
    dispatch({ type: 'focusTrack', trackId });
    dispatch({ type: 'playSelected' });
    startTrack(play, view.list.albumId, trackId);
};

/**
 * 未揀歌㩒 play（設計稿第 19 版 ACTIONS.playpause；B-086 ③）：播顯示緊嘅碟第一首有音檔嘅歌，
 * 拎住另一隻碟 = 隻碟入機（舊歌停、唱臂由泊位開場）。冇歌播得就乜都唔做。真正出聲係 T-038
 */
const playFirst = ({ catalog, stage, play }: HomeContext) => {
    const albumId = stage.viewAlbumId;
    const first = albumId ? albumTracks(catalog, albumId).find(isPlayable) : undefined;
    if (albumId && first) startTrack(play, albumId, first.id);
};

const pressSpindle = (context: HomeContext) => {
    const { view, play } = context;
    // 電視開住時唱片夾喺電視後面（T-060）；字母盤開住時唔㩒得（B-086 ④）
    if (view.mvOpen || view.dial.open) return;
    if (view.spindle === 'list') playSelected(context);
    else if (view.spindle === 'idle') playFirst(context);
    else play({ type: 'toggle' });
};

/**
 * MV：開電視時停播（唱臂返泊位）。電視（連 ■ 掣）係 T-060：未有之前，電視開住時再㩒 MV 掣就收返，
 * 收返之後唔自動續播（C8）。
 */
const pressMv = ({ stage, view, dispatch, play }: HomeContext) => {
    if (view.mvOpen) {
        dispatch({ type: 'closeMv' });
        return;
    }
    if (stage.scene !== 'home' || !view.hasMv) return;
    dispatch({ type: 'openMv', hasMv: true });
    play({ type: 'pauseFor', reason: 'mv' });
};

/** 旋鈕指住第 position 格：轉去嗰格嘅碟（♥ 格 = Favourites 碟）；格外嘅數唔理 */
const turnTo = ({ view, dispatch }: HomeContext, position: number) => {
    const entry = view.dial.entries[position];
    if (entry) dispatch({ type: 'selectAlbum', albumId: entry.albumId });
};

/**
 * 擰旋鈕（T-036）：㩒住打開字母盤 → 指針跟住轉 → 放手留喺嗰隻碟（D27）；Esc 取消返去開始嗰隻碟（S-154）；
 * ♥ 一㩒去 Favourites 碟
 */
const dialHandlers = (context: HomeContext) => ({
    onTurnStart: () => context.dispatch({ type: 'openDiscChange' }),
    onTurn: (position: number) => turnTo(context, position),
    onTurnEnd: () => context.dispatch({ type: 'closeDiscChange' }),
    onTurnCancel: () => context.dispatch({ type: 'cancelDiscChange' }),
    onFavourites: () => context.dispatch({ type: 'toggleFavourites' }),
});

/** 弧線歌單（T-037、B-086 ②）：㩒碟面打開（拎住另一隻碟都得）、捲到框入面嗰首、Enter 播 */
const listHandlers = (context: HomeContext) => ({
    onOpenList: () => {
        if (context.view.canOpenList) openList(context);
    },
    onFocusListTrack: (trackId: string) => context.dispatch({ type: 'focusTrack', trackId }),
    onPlayListTrack: (trackId: string) => playListTrack(context, trackId),
});

const handlersFor = (context: HomeContext): HomeHandlers => ({
    ...dialHandlers(context),
    onSpindle: () => pressSpindle(context),
    onBooklet: () => context.dispatch({ type: 'toggleBooklet', hasSong: context.view.hasSong }),
    onMv: () => pressMv(context),
    // 四個播放模式係 T-071
    onMode: () => {},
    onCloseList: () => context.dispatch({ type: 'closeList' }),
    ...listHandlers(context),
    onReturnToLoaded: () =>
        context.dispatch({ type: 'returnToLoaded', loadedAlbumId: context.view.loadedAlbumId }),
});

export interface Home {
    stage: StageState;
    playback: PlaybackState;
    /** 今次開 app 每張專輯用邊張封面（轉盤嘅碟、Preload 都用，T-034、T-036） */
    covers: CoverVariants;
    /** 未有 catalog = null */
    view: HomeView | null;
    handlers: HomeHandlers | null;
    /**
     * Preload 載入完：離開 Preload，開第一隻碟（review S-078：catalog 遲過 Preload 開始先到都得）。
     * 未有 catalog 就乜都唔做
     */
    finishPreload: () => void;
}

/**
 * 主頁嘅狀態同動作：場景狀態機 + 播放狀態（暫時，T-038 取代）+ catalog → 畫面要嘅值。
 * 封面：開 app 時每張專輯揀一張（CR-005 D56；`random` 測試用固定值），畫面上嘅碟另一張封面有空先攞入 cache。
 */
export const useHome = (catalog: CatalogDocument | null, random?: () => number): Home => {
    const [stage, dispatch] = useReducer(stageReducer, catalog, initialStage);
    const [playback, play] = useReducer(playbackReducer, IDLE_PLAYBACK);
    const covers = useCoverVariants(catalog, random);
    usePrefetchOtherArt(catalog, stage.viewAlbumId, covers);
    const finishPreload = useCallback(() => {
        const first = catalog ? dialAlbums(catalog)[0] : undefined;
        if (first) dispatch({ type: 'preloadDone', albumId: first.id });
    }, [catalog]);
    if (!catalog) return { stage, playback, covers, view: null, handlers: null, finishPreload };
    const view = homeView(catalog, stage, playback, covers);
    return {
        stage,
        playback,
        covers,
        view,
        handlers: handlersFor({ catalog, stage, playback, view, dispatch, play }),
        finishPreload,
    };
};
