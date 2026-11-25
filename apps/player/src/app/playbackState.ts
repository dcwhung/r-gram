/*
 * 播放狀態（暫時，只係 state）。真正嘅播放 store（audioEngine、隊列、進度、自動下一首、載入失敗）係 T-038：
 * 到時用佢取代呢個 reducer，`PlaybackState` 嘅形狀就係主頁讀嘅接口（Technical Spec「播放狀態（獨立 store）」）。
 * 呢度冇聲：`playing` 只係狀態。
 */
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

export const playbackReducer = (state: PlaybackState, action: PlaybackAction): PlaybackState => {
    switch (action.type) {
        case 'start':
            return {
                ...IDLE_PLAYBACK,
                status: 'playing',
                albumId: action.albumId,
                trackId: action.trackId,
            };
        case 'toggle':
            return toggle(state);
        case 'pauseFor':
            return state.status === 'idle'
                ? state
                : { ...state, status: 'paused', pauseReason: action.reason };
    }
};
