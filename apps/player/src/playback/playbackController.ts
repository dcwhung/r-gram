/*
 * 播放 controller（外部 store；T-011 報告 §2.1、§2.4–2.6）：持有播放狀態（`playbackReducer`）、隊列同播放模式；
 * `subscribe`／`getSnapshot` 畀 `useSyncExternalStore`。用戶手勢經呢度同步行到引擎（`cue` 要喺手勢入面）；
 * 引擎事件（`playing`、`paused`、`ended`…）推動狀態，唔靠 Media Session 嘅 handler（T-011 ③）。
 * 落針 timer 喺呢度，唔喺畫面：出聲唔可以靠 React render、effect 或者唱臂有冇 mount。
 * 冇 DOM、冇元件；D99 嘅 3 秒要睇畫面，喺 `app/useEndedRelease`。
 */
import { leadInMs } from '../components/tonearm/armPose';
import { prefersReducedMotion } from '../utils/motion';
import type { AudioEngine, EngineErrorReason, EngineEvent, EngineTrack } from './audioEngine';
import { createMediaSession, type MediaSessionPort } from './mediaSession';
import {
    type ModeStorage,
    nextPlayMode,
    type PlayMode,
    readPlayMode,
    writePlayMode,
} from './playModes';
import {
    IDLE_PLAYBACK,
    type PlaybackAction,
    playbackReducer,
    type PlaybackState,
} from './playbackState';
import { createQueue, firstTrack, nextTrack, previousTrack, type Queue, withMode } from './queue';
import { SessionSync } from './sessionSync';

export interface SourceTrack extends EngineTrack {
    readonly title: string;
}

/** 一隻碟（將來 Favourites 碟一樣）：播得嘅歌（碟嘅次序）、碟名、封面（Media Session） */
export interface PlaybackSource {
    readonly albumId: string;
    readonly albumTitle: string;
    readonly tracks: readonly SourceTrack[];
    readonly artwork: readonly MediaImage[];
}

export interface PlayerSnapshot {
    readonly playback: PlaybackState;
    readonly mode: PlayMode;
    /** 真係出緊聲（引擎 `playing` 之後，直到停、卡住、換碟）：碟只喺呢個時候轉 */
    readonly audible: boolean;
}

export interface PlaybackControllerDeps {
    engine: AudioEngine;
    random?: () => number;
    reduceMotion?: () => boolean;
    /** 畫面隱藏（鎖機）：由泊位開始都冇開場，即刻出聲（`playNow`） */
    isHidden?: () => boolean;
    storage?: ModeStorage | null;
    /** 鎖屏（Media Session）；冇畀 = 瀏覽器嗰個（冇就 null） */
    session?: MediaSessionPort | null;
}

export interface PlaybackController {
    subscribe(listener: () => void): () => void;
    getSnapshot(): PlayerSnapshot;
    /** 用戶手勢入面同步叫：由泊位開始播（唱臂開場，唱針放低先出聲） */
    start(source: PlaybackSource, trackId: string): void;
    pause(): void;
    /** 繼續：升針 = 即刻；MV 收埋後 = 開場；載入失敗、播完、被拒 = 由泊位重新開始（手勢入面叫） */
    resume(): void;
    toggle(): void;
    pauseFor(reason: 'mv'): void;
    /** 放低隻碟（D99）：停、放開音檔，冇歌載入 */
    release(): void;
    cycleMode(): void;
    /** 鎖屏下一首／上一首：即刻換、冇開場；冇就唔做嘢 */
    next(): void;
    previous(): void;
    seek(positionSec: number): void;
    /** 載入嘅碟（播完 3 秒內 `playFirst` 用） */
    readonly source: PlaybackSource | null;
}

type Timer = ReturnType<typeof setTimeout>;

const browserHidden = () =>
    typeof document !== 'undefined' && document.visibilityState === 'hidden';

const browserStorage = (): ModeStorage | null => {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
};

class Controller implements PlaybackController {
    private snapshot: PlayerSnapshot;
    private queue: Queue;
    private landing: Timer | null = null;
    private readonly listeners = new Set<() => void>();
    source: PlaybackSource | null = null;
    private readonly engine: AudioEngine;
    private readonly random: () => number;
    private readonly reduceMotion: () => boolean;
    private readonly isHidden: () => boolean;
    private readonly storage: ModeStorage | null;
    private readonly session: SessionSync;
    /** D109：而家嗰首係自動下一首（或者跳過去嗰首），未出過聲 */
    private autoUnplayed = false;
    /** D109：今輪已經跳過一次（出咗聲先清） */
    private skipped = false;

    constructor(deps: PlaybackControllerDeps) {
        this.engine = deps.engine;
        this.random = deps.random ?? Math.random;
        this.reduceMotion = deps.reduceMotion ?? prefersReducedMotion;
        this.isHidden = deps.isHidden ?? browserHidden;
        this.storage = deps.storage === undefined ? browserStorage() : deps.storage;
        const mode = readPlayMode(this.storage);
        this.snapshot = { playback: IDLE_PLAYBACK, mode, audible: false };
        this.queue = createQueue([], mode, null, this.random);
        this.engine.setNext((currentId) => this.resolveNext(currentId));
        this.engine.subscribe((event) => this.onEngine(event));
        const port = deps.session === undefined ? createMediaSession() : deps.session;
        this.session = new SessionSync(port, this.engine);
        port?.bind({
            play: () => this.resume(),
            pause: () => this.pause(),
            previous: () => this.previous(),
            next: () => this.next(),
            seekTo: (positionSec) => this.seek(positionSec),
        });
    }

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    getSnapshot = (): PlayerSnapshot => this.snapshot;

    private get playback(): PlaybackState {
        return this.snapshot.playback;
    }

    start(source: PlaybackSource, trackId: string): void {
        const track = source.tracks.find((candidate) => candidate.id === trackId);
        if (!track) return;
        this.source = source;
        const ids = source.tracks.map((candidate) => candidate.id);
        this.queue = createQueue(ids, this.snapshot.mode, trackId, this.random);
        this.clearLanding();
        this.silence();
        this.chosenByListener();
        this.dispatch({ type: 'start', albumId: source.albumId, trackId });
        this.session.track(source, trackId);
        if (this.isHidden()) {
            this.engine.playNow(track);
            return;
        }
        this.engine.cue(track);
        this.afterLeadIn(() => this.engine.land());
    }

    pause(): void {
        this.clearLanding();
        if (this.playback.status !== 'playing') return;
        this.silence();
        this.dispatch({ type: 'pauseFor', reason: 'user' });
        this.engine.pause();
    }

    resume(): void {
        const { status, pauseReason, trackId } = this.playback;
        if (status === 'paused' && pauseReason === 'user') {
            this.dispatch({ type: 'resumed' });
            this.engine.play();
        } else if (status === 'paused' && pauseReason === 'mv') {
            // 熄咗電視之後再播：由泊位行開場，唱針放低先繼續（C8、FR-040）
            this.dispatch({ type: 'resumed' });
            this.afterLeadIn(() => this.engine.play());
        } else if (status === 'paused' || status === 'error') this.restart(trackId);
        else if (status === 'ended') this.restart(firstTrack(this.queue));
    }

    toggle(): void {
        if (this.playback.status === 'playing') this.pause();
        else this.resume();
    }

    pauseFor(reason: 'mv'): void {
        const { status } = this.playback;
        if (status !== 'playing' && status !== 'paused') return;
        this.clearLanding();
        this.silence();
        this.dispatch({ type: 'pauseFor', reason });
        this.engine.pause();
    }

    /** arrow：畫面直接將佢當 callback（D99 嘅 timer），唔使再包 */
    release = (): void => {
        this.clearLanding();
        this.engine.stop();
        this.silence();
        this.dispatch({ type: 'release' });
        this.session.clear();
    };

    cycleMode(): void {
        const mode = nextPlayMode(this.snapshot.mode);
        this.queue = withMode(this.queue, mode, this.playback.trackId, this.random);
        writePlayMode(this.storage, mode);
        this.snapshot = { ...this.snapshot, mode };
        this.notify();
    }

    next(): void {
        const { trackId } = this.playback;
        if (!trackId || this.playback.status === 'idle') return;
        const move = nextTrack(this.queue, trackId, 'skip', this.random);
        this.queue = move.queue;
        this.skipTo(move.trackId);
    }

    previous(): void {
        const { trackId } = this.playback;
        if (!trackId || this.playback.status === 'idle') return;
        this.skipTo(previousTrack(this.queue, trackId));
    }

    /** 鎖屏拖進度：即刻報返新位置（時間顯示跟 element 嘅 timeupdate） */
    seek(positionSec: number): void {
        this.engine.seek(positionSec);
        this.session.position();
    }

    private skipTo(trackId: string | null): void {
        const track = this.trackOf(trackId);
        if (!track) return;
        this.clearLanding();
        this.chosenByListener();
        this.engine.playNow(track);
        this.dispatch({ type: 'advanced', trackId: track.id });
        this.session.track(this.source, track.id);
    }

    private restart(trackId: string | null): void {
        if (this.source && trackId) this.start(this.source, trackId);
    }

    private trackOf(trackId: string | null): SourceTrack | null {
        return this.source?.tracks.find((track) => track.id === trackId) ?? null;
    }

    /** 引擎 ended handler 入面同步叫：隊列純函數，冇 I/O */
    private resolveNext(currentId: string): EngineTrack | null {
        const move = nextTrack(this.queue, currentId, 'auto', this.random);
        this.queue = move.queue;
        return this.trackOf(move.trackId);
    }

    /** 唱針放低嗰刻做 action；減少動態效果或者畫面隱藏 = 即刻 */
    private afterLeadIn(action: () => void): void {
        this.clearLanding();
        const delay = leadInMs(this.reduceMotion());
        if (delay === 0 || this.isHidden()) {
            action();
            return;
        }
        this.landing = setTimeout(() => {
            this.landing = null;
            action();
        }, delay);
    }

    /** 我哋自己停聲：同下一個 dispatch 一齊通知（唔使通知兩次） */
    private silence(): void {
        if (this.snapshot.audible) this.snapshot = { ...this.snapshot, audible: false };
    }

    private clearLanding(): void {
        if (this.landing) clearTimeout(this.landing);
        this.landing = null;
    }

    /** 出聲與否：`playing` = 有；停、卡住、播完、錯誤 = 冇（自動下一首之間嘅半秒照當有，碟唔使停一停） */
    private hear(event: EngineEvent): void {
        const audible =
            event.type === 'playing' ||
            (this.snapshot.audible && (event.type === 'time' || event.type === 'advanced'));
        if (audible === this.snapshot.audible) return;
        this.snapshot = { ...this.snapshot, audible };
        this.notify();
    }

    /** 用戶揀嘅歌（開始播、鎖屏上／下一首）：唔係自動下一首，D109 唔跳 */
    private chosenByListener(): void {
        this.autoUnplayed = false;
        this.skipped = false;
    }

    /** D109 嘅兩個 flag：自動下一首設；出咗聲就清 */
    private trackAuto(event: EngineEvent): void {
        if (event.type === 'advanced') this.autoUnplayed = true;
        else if (event.type === 'playing') this.chosenByListener();
    }

    /**
     * Functional Spec D109：畫面隱藏時自動下一首（未出過聲）載入失敗 = 同步跳去再下一首試一次（最多一次）。
     * 前景、被拒、已經跳過、冇再下一首（順序最後一首；重覆一首會返同一首）= 唔跳，照 US-004 停
     */
    private skipFailed(failedId: string, reason: EngineErrorReason): boolean {
        if (reason === 'blocked' || !this.isHidden() || !this.autoUnplayed || this.skipped)
            return false;
        const move = nextTrack(this.queue, failedId, 'auto', this.random);
        const track = move.trackId === failedId ? null : this.trackOf(move.trackId);
        if (!track) return false;
        this.queue = move.queue;
        this.skipped = true;
        this.engine.playNow(track);
        this.dispatch({ type: 'advanced', trackId: track.id });
        this.session.track(this.source, track.id);
        return true;
    }

    private onEngine(event: EngineEvent): void {
        const { status } = this.playback;
        if (status === 'idle') return;
        this.hear(event);
        this.trackAuto(event);
        this.session.onEvent(event, this.source);
        if (event.type === 'playing' && status === 'paused') this.dispatch({ type: 'resumed' });
        else if (event.type === 'paused' && !event.requested && status === 'playing') {
            // 系統暫停（電話、Siri、拔耳機）：當用戶暫停，升針；㩒唱片夾即刻續播
            this.dispatch({ type: 'pauseFor', reason: 'user' });
        } else if (event.type === 'time') {
            this.dispatch({
                type: 'time',
                positionSec: event.positionSec,
                durationSec: event.durationSec,
            });
        } else if (event.type === 'advanced')
            this.dispatch({ type: 'advanced', trackId: event.trackId });
        else if (event.type === 'ended') this.dispatch({ type: 'ended' });
        else if (event.type === 'error' && !this.skipFailed(event.trackId, event.reason)) {
            this.clearLanding();
            this.dispatch({ type: 'failed', reason: event.reason });
        }
    }

    private dispatch(action: PlaybackAction): void {
        const next = playbackReducer(this.playback, action);
        if (next === this.playback) return;
        this.snapshot = { ...this.snapshot, playback: next };
        this.notify();
    }

    private notify(): void {
        this.listeners.forEach((listener) => listener());
    }
}

export const createPlaybackController = (deps: PlaybackControllerDeps): PlaybackController =>
    new Controller(deps);
