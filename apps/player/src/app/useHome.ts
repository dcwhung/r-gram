import type { CatalogDocument } from '@r-gram/catalog';
import { type Dispatch, useCallback, useReducer, useState, useSyncExternalStore } from 'react';
import type { CoverVariants } from '../catalog/coverVariants';
import { dialAlbums } from '../catalog/selectors';
import { useCoverVariants } from '../catalog/useCoverVariants';
import { usePrefetchOtherArt } from '../catalog/usePrefetchOtherArt';
import type { FavouritesStore } from '../favourites/store';
import type { MvController } from '../mv/mvController';
import { createAudioEngine } from '../playback/audioEngine';
import { createPlaybackController, type PlaybackController } from '../playback/playbackController';
import { playbackSource } from '../playback/playbackSource';
import { IDLE_PLAYBACK, type PlaybackState } from '../playback/playbackState';
import { isHolding, loadedAlbumOf } from './holding';
import { endedWaitRuns, useEndedRelease } from './useEndedRelease';
import { homeView, listFocusTrackId, type HomeView } from './homeView';
import { type Favourites, useFavourites, useFavouritesQueue } from './useFavourites';
import { INITIAL_STAGE, type StageAction, stageReducer, type StageState } from './stageReducer';
import type { HomeHandlers } from './Turntable';
import { mvTrackOf } from './mvTrack';
import { type TvParts, tvParts, useMvController, useTvClosed } from './useTv';

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
    /** catalog + 最尾一隻 Favourites 碟（useFavourites） */
    catalog: CatalogDocument;
    stage: StageState;
    playback: PlaybackState;
    view: HomeView;
    covers: CoverVariants;
    dispatch: Dispatch<StageAction>;
    player: PlaybackController;
    favourites: Favourites;
    /** 電視（T-060） */
    mv: MvController;
}

/**
 * 開始播一首（弧線歌單、唱片夾共用嘅路）：舊歌停、成隻碟交畀 controller 做隊列、唱臂由泊位開場，
 * 唱針放低先出聲。一定要喺手勢 handler 入面同步行到呢度（`cue` 解鎖 iOS 播放；T-011 §2.5）
 */
const startTrack = (
    { catalog, covers, player }: HomeContext,
    albumId: string,
    trackId: string | null,
) => {
    const source = playbackSource(catalog, albumId, covers);
    const id = trackId ?? source?.tracks[0]?.id;
    if (source && id) player.start(source, id);
};

/**
 * 歌單入面㩒 play：播揀中嗰首（要播得）；冇歌嘅碟（D39）= 收返歌單（設計稿 ACTIONS.playpause）。
 * 一律由顯示緊嘅碟播：Favourites 碟嘅歌喺 Favourites 碟嘅隊列（唔係佢原本嗰隻碟，T-070）
 */
const playSelected = (context: HomeContext) => {
    const { stage, view, dispatch } = context;
    if (view.list?.rows.length === 0) dispatch({ type: 'closeList' });
    const row = view.list?.rows.find((candidate) => candidate.id === stage.selectedTrackId);
    if (!view.list || !row?.playable) return;
    dispatch({ type: 'playSelected' });
    startTrack(context, view.list.albumId, row.id);
};

/** 打開歌單，預先揀中載入嘅歌或者第一首（US-004） */
const openList = ({ catalog, stage, playback, dispatch }: HomeContext) => {
    const focus = listFocusTrackId(catalog, stage, playback);
    dispatch({ type: 'openList' });
    if (focus) dispatch({ type: 'focusTrack', trackId: focus });
};

/**
 * 歌單入面 Enter／Space（行唔㩒得，W-051）：揀框入面嗰首，再同㩒唱片夾一樣播（返主頁、開始播）。
 * 要係歌單開住、嗰首喺呢隻碟而且播得
 */
const playListTrack = (context: HomeContext, trackId: string) => {
    const { view, dispatch } = context;
    const row = view.list?.rows.find((candidate) => candidate.id === trackId);
    if (!view.list || !row?.playable) return;
    dispatch({ type: 'focusTrack', trackId });
    dispatch({ type: 'playSelected' });
    startTrack(context, view.list.albumId, trackId);
};

/**
 * 未揀歌㩒 play（設計稿第 19 版 ACTIONS.playpause；D85）：播顯示緊嘅碟第一首有音檔嘅歌，
 * 拎住另一隻碟 = 隻碟入機（舊歌停、唱臂由泊位開場）。冇歌播得就乜都唔做
 */
const playFirst = (context: HomeContext) => {
    const albumId = context.stage.viewAlbumId;
    if (albumId) startTrack(context, albumId, null);
};

/**
 * 唱片夾：歌單 = 播框入面嗰首；未揀歌 = 第一首；載入嘅碟 = 暫停／繼續
 *（播完、載入失敗 = 由泊位重新開始：controller 喺同一個手勢入面 cue）
 */
const pressSpindle = (context: HomeContext) => {
    const { view, player } = context;
    // 電視開住時唱片夾喺電視後面（T-060）；字母盤開住時唔㩒得（B-086 ④）
    if (view.mvOpen || view.dial.open) return;
    if (view.spindle === 'list') playSelected(context);
    else if (view.spindle === 'idle') playFirst(context);
    else player.toggle();
};

/**
 * MV 掣（T-060；US-007、C8）：唱片停（唱臂返泊位），電視升起，喺同一個手勢入面預備 MV（`cue`）。
 * 電視開住時背後成層 inert，呢粒掣㩒唔到；萬一叫到 = 同 ■ 一樣收埋。收埋之後唱片唔自動續播
 */
const pressMv = (context: HomeContext) => {
    const { stage, view, dispatch, player, mv } = context;
    if (view.mvOpen) {
        mv.stop();
        return;
    }
    const albumId = stage.viewAlbumId;
    const track =
        albumId && view.track && mvTrackOf(context.catalog, context.covers, albumId, view.track);
    if (stage.scene !== 'home' || !track) return;
    dispatch({ type: 'openMv', hasMv: true });
    player.pauseFor('mv');
    mv.open(track);
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
    onTurnStart: () => releaseIfEnded(context).dispatch({ type: 'openDiscChange' }),
    onTurn: (position: number) => turnTo(context, position),
    onTurnEnd: () => context.dispatch({ type: 'closeDiscChange' }),
    onTurnCancel: () => context.dispatch({ type: 'cancelDiscChange' }),
    onFavourites: () => context.dispatch({ type: 'toggleFavourites' }),
});

/** 弧線歌單（T-037、B-086 ②）：㩒碟面打開（拎住另一隻碟都得）、捲到框入面嗰首、Enter 播 */
const listHandlers = (context: HomeContext) => ({
    onOpenList: () => {
        if (context.view.canOpenList) openList(releaseIfEnded(context));
    },
    onFocusListTrack: (trackId: string) => context.dispatch({ type: 'focusTrack', trackId }),
    onPlayListTrack: (trackId: string) => playListTrack(context, trackId),
});

/** 播完而冇拎住另一隻碟（3 秒等緊，D99） */
const isEndedHere = ({ playback, view }: HomeContext) =>
    playback.status === 'ended' && !view.holding;

/**
 * D99 ①：3 秒內擰旋鈕、㩒碟面、開歌書／MV = 即刻當 3 秒到咗（放低隻碟），再做嗰個操作。
 * 回傳放低之後嘅 context（播放 = 冇歌載入），等操作用新狀態
 */
const releaseIfEnded = (context: HomeContext): HomeContext => {
    if (!isEndedHere(context)) return context;
    context.player.release();
    return { ...context, playback: IDLE_PLAYBACK };
};

/** 歌書、MV：播完 3 秒內㩒（開）= 放低隻碟；收埋照收（之後由頭計 3 秒）；放低之後未揀歌，兩粒掣冇嘢開（D24、C5），所以唔再開 */
const pressOverlay = (context: HomeContext, open: (context: HomeContext) => void) => {
    const closing = context.view.mvOpen || context.view.bookletOpen;
    if (isEndedHere(context) && !closing) context.player.release();
    else open(context);
};

/** 㩒細唱片機返去：載入嘅碟拎住期間播完咗 = 未揀歌嘅主頁（D99 ⑤，唔使再等 3 秒） */
const returnToLoaded = ({ playback, player, dispatch, view }: HomeContext) => {
    if (playback.status === 'ended') player.release();
    dispatch({ type: 'returnToLoaded', loadedAlbumId: view.loadedAlbumId });
};

const handlersFor = (context: HomeContext): HomeHandlers => ({
    ...dialHandlers(context),
    onSpindle: () => pressSpindle(context),
    onBooklet: () =>
        pressOverlay(context, ({ dispatch, view }) =>
            dispatch({ type: 'toggleBooklet', hasSong: view.hasSong }),
        ),
    onMv: () => pressOverlay(context, pressMv),
    // 順序 → 重覆全部 → 重覆一首 → 隨機（設計稿第 20 版 MODES），存喺本機
    onMode: () => context.player.cycleMode(),
    onCloseList: () => context.dispatch({ type: 'closeList' }),
    ...listHandlers(context),
    onReturnToLoaded: () => returnToLoaded(context),
    // 心形掣（US-010）：左上嗰首（播緊、暫停緊嘅歌）
    onFavourite: () => {
        if (context.view.track) context.favourites.toggle(context.view.track.id);
    },
});

export interface Home extends TvParts {
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
    /** 而家播到邊（秒，引擎嘅真位置；歌書跟歌行用，T-082） */
    clock: () => number;
}

/**
 * 播放 controller 成個 app 一個：第一次 render 嗰個一直用（唔會因為 re-render 換）。
 * 冇畀（測試）就自己建一個（唔接 Media Session）；app 一律由 main.tsx 畀
 */
const usePlayer = (controller: PlaybackController | undefined) => {
    const [player] = useState(
        () =>
            controller ?? createPlaybackController({ engine: createAudioEngine(), session: null }),
    );
    const { playback, mode, audible } = useSyncExternalStore(player.subscribe, player.getSnapshot);
    return { player, playback, mode, audible };
};

/**
 * 主頁嘅狀態同動作：場景狀態機 + 播放 controller（外部 store，T-038）+ catalog → 畫面要嘅值。
 * 播完最後一首 3 秒後放低隻碟（D99，`useEndedRelease`）。
 * 封面：開 app 時每張專輯揀一張（CR-005 D56；`random` 測試用固定值），畫面上嘅碟另一張封面有空先攞入 cache。
 */
export const useHome = (
    catalog: CatalogDocument | null,
    controller?: PlaybackController,
    random?: () => number,
    favouritesStore?: FavouritesStore,
    mvController?: MvController,
): Home => {
    const [stage, dispatch] = useReducer(stageReducer, catalog, initialStage);
    const { player, playback, mode, audible } = usePlayer(controller);
    const { mv, snapshot: tvState } = useMvController(mvController);
    useTvClosed(tvState, stage, dispatch);
    const loaded = loadedAlbumOf(playback);
    useEndedRelease(endedWaitRuns(playback, stage, isHolding(stage, loaded)), player.release);
    const favourites = useFavourites(catalog, playback, favouritesStore);
    const covers = useCoverVariants(catalog, random);
    useFavouritesQueue(player, loaded, favourites.document, covers);
    usePrefetchOtherArt(catalog, stage.viewAlbumId, covers);
    const finishPreload = useCallback(() => {
        const first = catalog ? dialAlbums(catalog)[0] : undefined;
        if (first) dispatch({ type: 'preloadDone', albumId: first.id });
    }, [catalog]);
    const clock = useCallback(() => player.positionSec, [player]);
    const { document } = favourites;
    const base = { stage, playback, covers, finishPreload, clock };
    if (!document) return { ...base, view: null, handlers: null, tv: null, tvHandlers: null };
    const view = homeView(document, stage, playback, covers, mode, audible, favourites.ids);
    const context = { catalog: document, stage, playback, view, covers, dispatch, player, mv };
    const handlers = handlersFor({ ...context, favourites });
    return { ...base, view, handlers, ...tvParts(mv, tvState, view) };
};
