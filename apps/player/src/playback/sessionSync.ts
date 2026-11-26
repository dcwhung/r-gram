/*
 * 將引擎事件同 controller 嘅換歌寫入 Media Session（T-011 報告 §2.6）：
 * - 狀態跟 element 事件（`playing` → playing；`paused`／`ended`／`error` → paused；放低隻碟 → none），唔跟 handler（③ H2）
 * - metadata 換歌嗰下同步設（自動下一首喺引擎 ended handler 入面）
 * - 位置喺知道長度、出聲、停、seek、換歌時報（iOS 自己推算，唔使每個 timeupdate 報；903-player useMediaPosition）
 */
import type { AudioEngine, EngineEvent } from './audioEngine';
import type { MediaSessionPort } from './mediaSession';
import type { PlaybackSource } from './playbackController';

export class SessionSync {
    private lastDuration: number | null = null;

    constructor(
        private readonly port: MediaSessionPort | null,
        private readonly engine: AudioEngine,
    ) {}

    /** 換歌（開始播、鎖屏上／下一首、自動下一首） */
    track(source: PlaybackSource | null, trackId: string): void {
        const track = source?.tracks.find((candidate) => candidate.id === trackId);
        if (!source || !track) return;
        this.lastDuration = null;
        this.port?.setNowPlaying({
            title: track.title,
            album: source.albumTitle,
            artwork: source.artwork,
        });
    }

    /** 放低隻碟：鎖屏冇嘢 */
    clear(): void {
        this.lastDuration = null;
        this.port?.setNowPlaying(null);
        this.port?.setState('none');
    }

    position(): void {
        this.port?.setPosition(this.engine.positionSec, this.engine.durationSec);
    }

    onEvent(event: EngineEvent, source: PlaybackSource | null): void {
        if (event.type === 'playing') this.port?.setState('playing');
        else if (event.type === 'paused' || event.type === 'ended' || event.type === 'error') {
            this.port?.setState('paused');
        } else if (event.type === 'advanced') this.track(source, event.trackId);
        else if (event.type !== 'time' || event.durationSec === this.lastDuration) return;
        if (event.type === 'time') this.lastDuration = event.durationSec;
        this.position();
    }
}
