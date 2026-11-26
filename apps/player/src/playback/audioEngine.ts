/*
 * 唱片嘅聲音引擎（T-011 報告 §2「audioEngine 介面（定案）」；Technical Spec 實現注意事項 1–4）。
 * 成個 app 一個引擎、一個 `<audio>`（唔放入 React tree、唔放入 DOM），一直用到尾。
 * 只做：解鎖、載入、靜音預備（cue）、落針出聲（land）、暫停、seek、停；`ended` 同步接下一首；卡住重試；
 * 將 element 事件翻譯成少量引擎事件。隊列、播放 store、畫面、Media Session 全部唔喺呢度。
 */
import { STALL_MAX_RETRIES, STALL_NOTICE_MS, STALL_RETRY_MS } from '../config/limits';

/** 引擎只需要知嘅嘢：id 對返 store，url 已經逐段 encode（catalog selectors） */
export interface EngineTrack {
    readonly id: string;
    readonly url: string;
}

export type EngineErrorReason =
    | 'blocked' // play() 被拒（NotAllowedError）：要下一次用戶手勢
    | 'network' // MEDIA_ERR_NETWORK，或者重試用晒都未出聲
    | 'decode' // MEDIA_ERR_DECODE
    | 'unsupported'; // MEDIA_ERR_SRC_NOT_SUPPORTED（包括 404）

export type EngineEvent =
    /** 真係出緊聲（落針之後；靜音預備期間唔發） */
    | { type: 'playing'; trackId: string }
    /** 停咗。requested = false：唔係我哋叫嘅（鎖屏由系統處理、電話、Siri、拔耳機） */
    | { type: 'paused'; trackId: string; requested: boolean }
    /** 大約每 0.25 秒（timeupdate）；靜音預備期間唔發 */
    | { type: 'time'; trackId: string; positionSec: number; durationSec: number | null }
    /** 自動下一首已經換咗（喺 ended handler 入面同步做完） */
    | { type: 'advanced'; trackId: string; previousTrackId: string }
    /** 播完而冇下一首（resolver 回 null） */
    | { type: 'ended'; trackId: string }
    /** 想播但等數據超過 STALL_NOTICE_MS；之後出聲會有 playing */
    | { type: 'stalled'; trackId: string }
    | { type: 'error'; trackId: string; reason: EngineErrorReason };

export interface AudioEngine {
    /** 只可以喺用戶手勢入面同步叫：設 src、muted、play()；一出 playing 就停喺 0 等 land() */
    cue(track: EngineTrack): void;
    /** 唱針放低：由 0 出聲；預備未完成就記住，一出 playing 即刻出聲 */
    land(): void;
    /** 即刻出聲播 track（冇開場）：鎖屏上一首／下一首、畫面隱藏時 */
    playNow(track: EngineTrack): void;
    /** 繼續；仲喺預備 = land() */
    play(): void;
    /** 我哋要求嘅暫停；預備期間 = 取消未做嘅 land() */
    pause(): void;
    /** 夾喺 0 至長度；metadata 未到就記住 */
    seek(positionSec: number): void;
    /** 停同放開 src；之後 Now Playing 冇嘢 */
    stop(): void;
    /** 自動下一首嘅來源：ended handler 入面同步叫，回 null = 隊列完 */
    setNext(resolve: (currentTrackId: string) => EngineTrack | null): void;
    subscribe(listener: (event: EngineEvent) => void): () => void;
    readonly currentTrackId: string | null;
    readonly positionSec: number;
    readonly durationSec: number | null;
}

/** 畫面隱藏（鎖機、背景）：卡住時唔重載，等返前景（903-player v1.20.8） */
export interface EngineEnv {
    isHidden: () => boolean;
    onVisible: (callback: () => void) => void;
}

const browserEnv = (): EngineEnv => ({
    isHidden: () => document.visibilityState === 'hidden',
    onVisible: (callback) =>
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') callback();
        }),
});

/** idle：冇歌；priming：靜音預備緊；primed：停喺 0 等落針；live：正常（出聲或者暫停緊） */
type Phase = 'idle' | 'priming' | 'primed' | 'live';

const MEDIA_ERR_NETWORK = 2;
const MEDIA_ERR_DECODE = 3;

type Timer = ReturnType<typeof setTimeout>;

class Engine implements AudioEngine {
    private phase: Phase = 'idle';
    private track: EngineTrack | null = null;
    /** 每次換 src 加一：舊 src 嘅 promise（AbortError 等）一律唔理 */
    private generation = 0;
    private landPending = false;
    private pauseRequested = false;
    /** 我哋為咗預備而 pause()：嗰個 pause 事件唔報 */
    private internalPause = false;
    /** 想出聲（play 咗而未暫停）：卡住先算數 */
    private wantsSound = false;
    private pendingSeek: number | null = null;
    private retries = 0;
    private lastTime = 0;
    private overdue = false;
    private timers: Timer[] = [];
    private resolveNext: (currentTrackId: string) => EngineTrack | null = () => null;
    private readonly listeners = new Set<(event: EngineEvent) => void>();

    constructor(
        private readonly element: HTMLAudioElement,
        private readonly env: EngineEnv,
    ) {
        element.preload = 'metadata';
        this.listen();
        env.onVisible(() => this.retryIfOverdue());
    }

    get currentTrackId(): string | null {
        return this.track?.id ?? null;
    }

    get positionSec(): number {
        return this.phase === 'live' ? this.element.currentTime : 0;
    }

    get durationSec(): number | null {
        const { duration } = this.element;
        return Number.isFinite(duration) && duration > 0 ? duration : null;
    }

    cue(track: EngineTrack): void {
        this.load(track, 'priming');
        this.element.muted = true;
        this.playElement();
    }

    land(): void {
        if (this.phase === 'priming') {
            this.landPending = true;
            this.expectSound();
        } else if (this.phase === 'primed') {
            this.phase = 'live';
            this.expectSound();
            this.playElement();
        }
    }

    playNow(track: EngineTrack): void {
        this.load(track, 'live');
        this.element.muted = false;
        this.expectSound();
        this.playElement();
    }

    play(): void {
        if (this.phase === 'priming' || this.phase === 'primed') this.land();
        else if (this.phase === 'live' && this.overdue) this.retryOrFail();
        else if (this.phase === 'live' && this.element.paused) {
            this.expectSound();
            this.playElement();
        }
    }

    pause(): void {
        const trackId = this.track?.id;
        if (!trackId) return;
        this.landPending = false;
        this.stopWatching();
        const elementPlaying = this.phase === 'live' && !this.element.paused;
        if (!elementPlaying) {
            this.emit({ type: 'paused', trackId, requested: true });
            return;
        }
        this.pauseRequested = true;
        this.element.pause();
    }

    seek(positionSec: number): void {
        const duration = this.durationSec;
        if (duration === null) this.pendingSeek = Math.max(0, positionSec);
        else this.element.currentTime = Math.min(Math.max(0, positionSec), duration);
    }

    stop(): void {
        this.generation += 1;
        this.phase = 'idle';
        this.track = null;
        this.landPending = false;
        this.pendingSeek = null;
        this.stopWatching();
        this.element.pause();
        this.element.removeAttribute('src');
        this.element.load();
    }

    setNext(resolve: (currentTrackId: string) => EngineTrack | null): void {
        this.resolveNext = resolve;
    }

    subscribe(listener: (event: EngineEvent) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private emit(event: EngineEvent): void {
        this.listeners.forEach((listener) => listener(event));
    }

    private listen(): void {
        const on = (type: string, handler: () => void) =>
            this.element.addEventListener(type, handler);
        on('playing', () => this.onPlaying());
        on('pause', () => this.onPause());
        on('timeupdate', () => this.onTime());
        on('loadedmetadata', () => this.onMetadata());
        on('waiting', () => {
            if (this.phase === 'live' && this.wantsSound) this.watchStall();
        });
        on('ended', () => this.onEnded());
        on('error', () => this.onError());
    }

    /** 換歌：舊歌即刻停（唔發 ended），新世代 */
    private load(track: EngineTrack, phase: Phase): void {
        this.generation += 1;
        this.stopWatching();
        this.phase = phase;
        this.track = track;
        this.landPending = false;
        this.pendingSeek = null;
        this.retries = 0;
        this.element.src = track.url;
    }

    private playElement(): void {
        const generation = this.generation;
        const result = this.element.play() as Promise<void> | undefined;
        result?.catch((error: unknown) => this.onPlayRejected(generation, error));
    }

    /** 只理而家呢個世代嘅 NotAllowedError；AbortError 等（換 src 引起）唔理，錯誤由 error 事件報 */
    private onPlayRejected(generation: number, error: unknown): void {
        const trackId = this.track?.id;
        const blocked = error instanceof Error && error.name === 'NotAllowedError';
        if (generation !== this.generation || !trackId || !blocked) return;
        this.wantsSound = false;
        this.stopWatching();
        this.emit({ type: 'error', trackId, reason: 'blocked' });
    }

    private onPlaying(): void {
        const trackId = this.track?.id;
        if (!trackId) return;
        if (this.phase === 'priming') {
            if (this.landPending) this.goLive(trackId);
            else this.holdAtStart();
            return;
        }
        if (this.phase !== 'live') return;
        this.stopWatching();
        this.emit({ type: 'playing', trackId });
    }

    /** 預備完：停喺 0、取消靜音（seek 喺開場入面做完，落針嗰下只係 play()） */
    private holdAtStart(): void {
        this.internalPause = !this.element.paused;
        this.element.pause();
        this.element.currentTime = 0;
        this.element.muted = false;
        this.phase = 'primed';
    }

    /** 預備未完已經落針：唔 pause，由 0 出聲 */
    private goLive(trackId: string): void {
        this.element.currentTime = 0;
        this.element.muted = false;
        this.phase = 'live';
        this.landPending = false;
        this.stopWatching();
        this.emit({ type: 'playing', trackId });
    }

    /** 播到尾嘅 pause（spec：先 pause 後 ended）、預備嘅 pause 唔報 */
    private onPause(): void {
        const trackId = this.track?.id;
        if (this.internalPause) {
            this.internalPause = false;
            return;
        }
        if (!trackId || this.phase !== 'live' || this.element.ended) return;
        const requested = this.pauseRequested;
        this.pauseRequested = false;
        this.wantsSound = false;
        this.stopWatching();
        this.emit({ type: 'paused', trackId, requested });
    }

    private onTime(): void {
        const trackId = this.track?.id;
        if (!trackId || this.phase !== 'live') return;
        const positionSec = this.element.currentTime;
        if (positionSec > this.lastTime && this.wantsSound) this.stopWatching();
        this.lastTime = positionSec;
        this.emit({ type: 'time', trackId, positionSec, durationSec: this.durationSec });
    }

    private onMetadata(): void {
        if (this.pendingSeek !== null) {
            const target = this.pendingSeek;
            this.pendingSeek = null;
            this.seek(target);
        }
        if (this.phase === 'live') this.onTime();
    }

    /** 同步：揀下一首、設 src、play()；中間冇 await、唔等 render（T-011 ②） */
    private onEnded(): void {
        const current = this.track;
        if (!current || this.phase !== 'live') return;
        const next = this.resolveNext(current.id);
        if (!next) {
            this.wantsSound = false;
            this.stopWatching();
            this.emit({ type: 'ended', trackId: current.id });
            return;
        }
        if (next.url === current.url) {
            this.track = next;
            this.element.currentTime = 0;
        } else this.load(next, 'live');
        this.emit({ type: 'advanced', trackId: next.id, previousTrackId: current.id });
        this.expectSound();
        this.playElement();
    }

    private onError(): void {
        const trackId = this.track?.id;
        const code = this.element.error?.code;
        if (!trackId || this.phase === 'idle' || code === undefined) return;
        if (code === MEDIA_ERR_NETWORK) {
            this.retryOrFail();
            return;
        }
        this.wantsSound = false;
        this.stopWatching();
        const reason = code === MEDIA_ERR_DECODE ? 'decode' : 'unsupported';
        this.emit({ type: 'error', trackId, reason });
    }

    private expectSound(): void {
        this.wantsSound = true;
        this.lastTime = this.element.currentTime;
        this.watchStall();
    }

    private watchStall(): void {
        this.stopWatching();
        this.timers = [
            setTimeout(() => this.onStallNotice(), STALL_NOTICE_MS),
            setTimeout(() => this.onStallTimeout(), STALL_RETRY_MS),
        ];
    }

    private stopWatching(): void {
        this.timers.forEach(clearTimeout);
        this.timers = [];
        this.overdue = false;
    }

    private onStallNotice(): void {
        const trackId = this.track?.id;
        if (trackId && this.wantsSound) this.emit({ type: 'stalled', trackId });
    }

    private onStallTimeout(): void {
        if (!this.wantsSound) return;
        if (this.env.isHidden()) this.overdue = true;
        else this.retryOrFail();
    }

    private retryIfOverdue(): void {
        if (this.overdue && this.wantsSound) this.retryOrFail();
    }

    /** 記低位置、重設 src、seek 返去、play()；用晒次數 = 載入失敗 */
    private retryOrFail(): void {
        const track = this.track;
        if (!track) return;
        if (this.retries >= STALL_MAX_RETRIES) {
            this.wantsSound = false;
            this.stopWatching();
            this.emit({ type: 'error', trackId: track.id, reason: 'network' });
            return;
        }
        this.retries += 1;
        const position = this.element.currentTime;
        this.generation += 1;
        this.element.src = track.url;
        this.pendingSeek = position > 0 ? position : null;
        this.element.muted = this.phase === 'priming';
        this.expectSound();
        this.playElement();
    }
}

/** 唯一入口：成個 app 一個引擎、一個 element；測試注入假 element 同假 env */
export const createAudioEngine = (
    element: HTMLAudioElement = new Audio(),
    env: EngineEnv = browserEnv(),
): AudioEngine => new Engine(element, env);
