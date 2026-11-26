/*
 * 播放狀態（暫時，只係 state）。真正嘅播放 store（audioEngine、隊列、進度、自動下一首、載入失敗）係 T-038：
 * 到時用佢取代呢個 reducer，`PlaybackState` 嘅形狀就係主頁讀嘅接口（Technical Spec「播放狀態（獨立 store）」）。
 * 呢度冇聲：`playing` 只係狀態。
 */
import { loadedAlbumOf } from './holding';

export type PlaybackStatus = 'idle' | 'playing' | 'paused';

/**
 * 點解停：分得出「用戶㩒暫停」（唱臂留喺碟上面、升針）同其他（唱臂返泊位）。
 * `restore`（重開 app 回復上次嘅歌，D36 ①）由 T-038 用。
 */
export type PauseReason = 'user' | 'mv' | 'restore';

export interface PlaybackState {
    status: PlaybackStatus;
    albumId: string | null;
    trackId: string | null;
    /** 只喺 `paused` 有值 */
    pauseReason: PauseReason | null;
    positionSec: number;
    /** 未知（未載入）= null */
    durationSec: number | null;
}

export type PlaybackAction =
    | { type: 'start'; albumId: string; trackId: string }
    /**
     * 㩒拎住嘅碟嘅一行（T-049）：同 `start` 一樣，但只喺載入嘅碟仍然係 `loadedAlbumId`（㩒嗰陣畫面見到嗰隻）先做；
     * 同一個 tick 連㩒兩行，第二下帶住過時嘅值，唔理（review S-180）
     */
    | { type: 'startHeld'; albumId: string; trackId: string; loadedAlbumId: string | null }
    | { type: 'toggle' }
    | { type: 'pauseFor'; reason: PauseReason };

export const IDLE_PLAYBACK: PlaybackState = {
    status: 'idle',
    albumId: null,
    trackId: null,
    pauseReason: null,
    positionSec: 0,
    durationSec: null,
};

const toggle = (state: PlaybackState): PlaybackState => {
    if (state.status === 'playing') return { ...state, status: 'paused', pauseReason: 'user' };
    if (state.status === 'paused') return { ...state, status: 'playing', pauseReason: null };
    return state;
};

const start = (albumId: string, trackId: string): PlaybackState => ({
    ...IDLE_PLAYBACK,
    status: 'playing',
    albumId,
    trackId,
});

export const playbackReducer = (state: PlaybackState, action: PlaybackAction): PlaybackState => {
    switch (action.type) {
        case 'start':
            return start(action.albumId, action.trackId);
        case 'startHeld':
            return loadedAlbumOf(state) === action.loadedAlbumId
                ? start(action.albumId, action.trackId)
                : state;
        case 'toggle':
            return toggle(state);
        case 'pauseFor':
            return state.status === 'idle'
                ? state
                : { ...state, status: 'paused', pauseReason: action.reason };
    }
};
