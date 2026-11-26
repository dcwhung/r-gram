/*
 * Media Session（鎖屏、控制中心、耳機掣；T-011 報告 §1.2 ③、§2.6；903-player useMediaSession／useMediaPosition）。
 * 呢度只係將 controller 嘅決定寫入 `navigator.mediaSession`，唔決定播乜：
 * handler 只註冊一次；`seekbackward`、`seekforward`、`stop` 設 null（鎖屏保持上一首／下一首掣）；
 * 每個 `setActionHandler` 包 try/catch（舊 Safari 唔識某啲 action）；冇 `setPositionState` 就唔設位置。
 */

/** 鎖屏嘅「藝人」：樂隊名係資料，唔翻譯 */
export const RECORD_ARTIST = 'RubberBand';

/** 鎖屏進度條：iOS 用呢個速度自己推算位置（唔使每個 timeupdate 報） */
const PLAYBACK_RATE = 1;

export interface NowPlaying {
    title: string;
    album: string;
    artwork: readonly MediaImage[];
}

export interface MediaSessionHandlers {
    play: () => void;
    pause: () => void;
    /** 冇 = 鎖屏冇呢粒掣（MV 冇上一首／下一首，T-060） */
    previous?: () => void;
    next?: () => void;
    seekTo: (positionSec: number) => void;
}

export interface MediaSessionPort {
    bind(handlers: MediaSessionHandlers): void;
    /** null = 冇歌（放低隻碟之後） */
    setNowPlaying(nowPlaying: NowPlaying | null): void;
    setState(state: MediaSessionPlaybackState): void;
    /** 長度未知唔設；位置夾喺 0 至長度 */
    setPosition(positionSec: number, durationSec: number | null): void;
}

type ActionHandlers = Partial<Record<MediaSessionAction, MediaSessionActionHandler | null>>;

/** 冇 handler = null（鎖屏唔顯示嗰粒掣） */
const optional = (handler: (() => void) | undefined) => (handler ? () => handler() : null);

const actionsFor = (handlers: MediaSessionHandlers): ActionHandlers => ({
    play: () => handlers.play(),
    pause: () => handlers.pause(),
    previoustrack: optional(handlers.previous),
    nexttrack: optional(handlers.next),
    seekto: (details) => {
        if (typeof details.seekTime === 'number') handlers.seekTo(details.seekTime);
    },
    seekbackward: null,
    seekforward: null,
    stop: null,
});

const register = (session: MediaSession, handlers: MediaSessionHandlers): void => {
    Object.entries(actionsFor(handlers)).forEach(([action, handler]) => {
        try {
            session.setActionHandler(action as MediaSessionAction, handler ?? null);
        } catch {
            // 呢個瀏覽器唔識呢個 action：其餘照註冊
        }
    });
};

const positionOf = (session: MediaSession, positionSec: number, durationSec: number | null) => {
    if (typeof session.setPositionState !== 'function' || !durationSec) return;
    try {
        session.setPositionState({
            duration: durationSec,
            position: Math.min(Math.max(0, positionSec), durationSec),
            playbackRate: PLAYBACK_RATE,
        });
    } catch {
        // 數值唔合規（例如長度啱啱變咗）：下次再報
    }
};

const browserSession = (): MediaSession | undefined =>
    typeof navigator !== 'undefined' && 'mediaSession' in navigator
        ? navigator.mediaSession
        : undefined;

const browserMetadata = (): typeof MediaMetadata | undefined =>
    typeof MediaMetadata === 'undefined' ? undefined : MediaMetadata;

/** 冇 Media Session（舊瀏覽器、測試環境）= null，controller 照播 */
export const createMediaSession = (
    session: MediaSession | undefined = browserSession(),
    Metadata: typeof MediaMetadata | undefined = browserMetadata(),
): MediaSessionPort | null => {
    if (!session) return null;
    return {
        bind: (handlers) => register(session, handlers),
        setNowPlaying: (nowPlaying) => {
            session.metadata =
                nowPlaying && Metadata
                    ? new Metadata({
                          ...nowPlaying,
                          artist: RECORD_ARTIST,
                          artwork: [...nowPlaying.artwork],
                      })
                    : null;
        },
        setState: (state) => {
            session.playbackState = state;
        },
        setPosition: (positionSec, durationSec) => positionOf(session, positionSec, durationSec),
    };
};
