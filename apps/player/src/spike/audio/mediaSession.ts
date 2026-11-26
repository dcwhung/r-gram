/* ③ Media Session：鎖屏畫面嘅歌名、封面同掣（Technical Spec 實現注意事項 4） */
import type { SpikeMedia, SpikeTrack } from '../media/useMedia';
import { TEXT } from '../text';
import type { SpikePlayer } from './SpikePlayer';

export const mediaSessionSupported = (): boolean =>
    typeof navigator !== 'undefined' && 'mediaSession' in navigator;

export const setTrackMetadata = (track: SpikeTrack, media: SpikeMedia): void => {
    if (!mediaSessionSupported() || typeof MediaMetadata === 'undefined') return;
    navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: TEXT.session.artist,
        album: media.albumTitle,
        artwork: media.coverUrl ? [{ src: media.coverUrl }] : [],
    });
};

type Call = (action: MediaSessionAction, detail?: string) => void;

const handlersFor = (player: SpikePlayer, audio: HTMLAudioElement) =>
    ({
        play: () => player.play(TEXT.playerLog.lockScreenPlay),
        pause: () => player.pause(),
        previoustrack: () => player.next(-1),
        nexttrack: () => player.next(1),
        seekto: (details) => {
            if (typeof details.seekTime === 'number') audio.currentTime = details.seekTime;
        },
    }) satisfies Partial<Record<MediaSessionAction, MediaSessionActionHandler>>;

/** 鎖屏嘅進度條：iOS 要有 positionState 先拖得 */
const updatePosition = (audio: HTMLAudioElement) => {
    const { duration, currentTime, playbackRate } = audio;
    if (!Number.isFinite(duration) || duration <= 0) return;
    try {
        navigator.mediaSession.setPositionState({
            duration,
            position: Math.min(currentTime, duration),
            playbackRate,
        });
    } catch {
        // 舊 Safari 冇 setPositionState
    }
};

const hooked = new WeakSet<HTMLAudioElement>();

/** 每次鎖屏掣叫都經 `onCall` 記低（連 seekTime） */
export const enableMediaSession = (
    player: SpikePlayer,
    audio: HTMLAudioElement,
    onCall: Call,
): void => {
    const handlers = handlersFor(player, audio);
    (Object.keys(handlers) as (keyof typeof handlers)[]).forEach((action) => {
        try {
            navigator.mediaSession.setActionHandler(action, (details) => {
                onCall(
                    action,
                    details.seekTime === undefined ? undefined : details.seekTime.toFixed(1),
                );
                handlers[action](details);
            });
        } catch {
            onCall(action, TEXT.playerLog.handlerFailed);
        }
    });
    if (hooked.has(audio)) return;
    hooked.add(audio);
    audio.addEventListener('timeupdate', () => updatePosition(audio));
};
