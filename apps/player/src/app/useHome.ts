import type { CatalogDocument } from '@r-gram/catalog';
import { type Dispatch, useReducer } from 'react';
import { findTrack, isPlayable } from '../catalog/selectors';
import { homeView, listFocusTrackId, type HomeView } from './homeView';
import {
    IDLE_PLAYBACK,
    type PlaybackAction,
    playbackReducer,
    type PlaybackState,
} from './playbackState';
import { INITIAL_STAGE, type StageAction, stageReducer, type StageState } from './stageReducer';
import type { HomeHandlers } from './Turntable';

/**
 * 開 app 時嘅場景。T-034 之前嘅接口：有 catalog 就直接由第一隻碟嘅主頁開始。
 * T-034 嘅 Preload 會喺載入完之後自己 dispatch `preloadDone`（連重開 app 時回復嘅碟同歌，D12）。
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
    view: HomeView;
    dispatch: Dispatch<StageAction>;
    play: Dispatch<PlaybackAction>;
}

/** 歌單入面㩒 play：播揀中嗰首（要播得） */
const playSelected = ({ catalog, stage, dispatch, play }: HomeContext) => {
    const found = stage.selectedTrackId ? findTrack(catalog, stage.selectedTrackId) : null;
    if (!found || !isPlayable(found.track)) return;
    dispatch({ type: 'playSelected' });
    play({ type: 'start', albumId: found.album.id, trackId: found.track.id });
};

/** 未揀歌：打開歌單，預先揀中第一首（US-004） */
const openList = ({ catalog, stage, dispatch }: HomeContext) => {
    const focus = listFocusTrackId(catalog, stage);
    dispatch({ type: 'openList' });
    if (focus) dispatch({ type: 'focusTrack', trackId: focus });
};

const pressSpindle = (context: HomeContext) => {
    const { view, play } = context;
    // 電視開住時唱片夾喺電視後面（T-060），唔反應
    if (view.mvOpen) return;
    if (view.spindle === 'list') playSelected(context);
    else if (view.spindle === 'idle') openList(context);
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

const handlersFor = (context: HomeContext): HomeHandlers => ({
    onSpindle: () => pressSpindle(context),
    onBooklet: () => context.dispatch({ type: 'toggleBooklet', hasSong: context.view.hasSong }),
    onMv: () => pressMv(context),
    // 四個播放模式係 T-071
    onMode: () => {},
    onCloseList: () => context.dispatch({ type: 'closeList' }),
});

export interface Home {
    stage: StageState;
    playback: PlaybackState;
    /** 未有 catalog = null */
    view: HomeView | null;
    handlers: HomeHandlers | null;
}

/** 主頁嘅狀態同動作：場景狀態機 + 播放狀態（暫時，T-038 取代）+ catalog → 畫面要嘅值 */
export const useHome = (catalog: CatalogDocument | null): Home => {
    const [stage, dispatch] = useReducer(stageReducer, catalog, initialStage);
    const [playback, play] = useReducer(playbackReducer, IDLE_PLAYBACK);
    if (!catalog) return { stage, playback, view: null, handlers: null };
    const view = homeView(catalog, stage, playback);
    return {
        stage,
        playback,
        view,
        handlers: handlersFor({ catalog, stage, view, dispatch, play }),
    };
};
