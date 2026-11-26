/*
 * 播放狀態（純 reducer；Technical Spec「播放狀態（獨立 store）」、T-011 報告 §2.5）。
 * 由 playbackController（外部 store）持有：用戶手勢同引擎事件都經 action 改佢；主頁只讀。
 * 呢度冇聲：出聲、隊列、Media Session 喺 controller 同 audioEngine。
 */
import type { EngineErrorReason } from './audioEngine';

/**
 * `ended`：載入嘅歌播完（碟仍然喺唱片機，唱針離開碟；設計稿第 19 版「已播完」、D99）。
 * `error`：載入失敗（US-004：唱臂泊位、一行錯誤提示；再㩒 = 重新開始同一首）
 */
export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'ended' | 'error';

/**
 * 點解停：分得出「用戶㩒暫停」（唱臂留喺碟上面、升針；系統暫停都當呢個）同其他（唱臂返泊位）。
 * `restore`：瀏覽器唔准 play()（下一下行完整開場；將來重開 app 回復上次嘅歌都用，D36 ①）
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
    | { type: 'pauseFor'; reason: PauseReason }
    /** 繼續（用戶、鎖屏、或者系統自己恢復） */
    | { type: 'resumed' }
    /** 自動下一首、鎖屏上／下一首：換歌，唱臂唔郁 */
    | { type: 'advanced'; trackId: string }
    | { type: 'ended' }
    /** 放低隻碟（D99 嘅 3 秒、提早結束、拎住時返去） */
    | { type: 'release' }
    | { type: 'time'; positionSec: number; durationSec: number | null }
    | { type: 'failed'; reason: EngineErrorReason };

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

const pauseFor = (state: PlaybackState, reason: PauseReason): PlaybackState =>
    state.status === 'playing' || state.status === 'paused'
        ? { ...state, status: 'paused', pauseReason: reason }
        : state;

const resumed = (state: PlaybackState): PlaybackState =>
    state.status === 'paused' ? { ...state, status: 'playing', pauseReason: null } : state;

/** 只喺秒數或者長度變先換 state（進度圈同時間一秒一格，唔使每 0.25 秒 render） */
const time = (state: PlaybackState, positionSec: number, durationSec: number | null) => {
    const same =
        Math.floor(positionSec) === Math.floor(state.positionSec) &&
        durationSec === state.durationSec;
    return state.status === 'idle' || same ? state : { ...state, positionSec, durationSec };
};

const failed = (state: PlaybackState, reason: EngineErrorReason): PlaybackState => {
    if (state.status === 'idle') return state;
    return reason === 'blocked'
        ? { ...state, status: 'paused', pauseReason: 'restore' }
        : { ...state, status: 'error', pauseReason: null };
};

const advanced = (state: PlaybackState, trackId: string): PlaybackState =>
    state.status === 'idle'
        ? state
        : {
              ...state,
              status: 'playing',
              pauseReason: null,
              trackId,
              positionSec: 0,
              durationSec: null,
          };

export const playbackReducer = (state: PlaybackState, action: PlaybackAction): PlaybackState => {
    switch (action.type) {
        case 'start':
            return start(action.albumId, action.trackId);
        case 'toggle':
            return toggle(state);
        case 'pauseFor':
            return pauseFor(state, action.reason);
        case 'resumed':
            return resumed(state);
        case 'advanced':
            return advanced(state, action.trackId);
        case 'ended':
            return state.status === 'idle'
                ? state
                : { ...state, status: 'ended', pauseReason: null };
        case 'release':
            return IDLE_PLAYBACK;
        case 'time':
            return time(state, action.positionSec, action.durationSec);
        case 'failed':
            return failed(state, action.reason);
    }
};
