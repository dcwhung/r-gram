/*
 * 電視嘅 `<video>`（Technical Spec「CR-010 → MV 音訊」VideoEngine；T-011 報告 §2.8）。
 * 成個 app 一個 element（`createMediaElementSource` 每個 element 只可以一次），電視 mount 時搬入螢幕。
 * 同唱片一樣：手勢入面 `cue`（gain 0 播，一出 playing 就停喺 0），開機先 `reveal`（gain 去音量、播）。
 * 冇 Web Audio：靜唔到聲，所以 `cue` 只載入，開機先 play()。事件型別同 audioEngine 一樣。
 * 唔理隊列、唔重試（卡住就等；錯誤即刻報）；畫面、Media Session、計時喺 mvController。
 */
import type { EngineErrorReason, EngineEvent, EngineTrack } from '../playback/audioEngine';
import { createMvAudio, type MvAudio } from './mvAudio';

export interface VideoEngine {
    /** 電視 mount 時放入螢幕（同一個 element 搬嚟搬去） */
    readonly element: HTMLVideoElement;
    readonly audio: MvAudio;
    /** 㩒 MV 掣（手勢入面，同步）：接 gain、設 src、gain 0 播；一出 playing 就停喺 0 */
    cue(track: EngineTrack): void;
    /** 螢幕開機：gain 去音量、由 0 播；預備未完就記住 */
    reveal(): void;
    play(): void;
    pause(): void;
    /** ■ 或者播完：停、放開檔案、suspend 聲音 */
    stop(): void;
    seek(positionSec: number): void;
    subscribe(listener: (event: EngineEvent) => void): () => void;
    readonly positionSec: number;
    readonly durationSec: number | null;
}

/** idle：冇片；priming：靜音預備緊；primed：停喺 0 等開機；live：開咗機（播緊或者暫停緊） */
type Phase = 'idle' | 'priming' | 'primed' | 'live';

const MEDIA_ERR_ABORTED = 1;
const ERROR_REASONS: Readonly<Record<number, EngineErrorReason>> = {
    2: 'network',
    3: 'decode',
    4: 'unsupported',
};

class Engine implements VideoEngine {
    private phase: Phase = 'idle';
    private track: EngineTrack | null = null;
    /** 每次換 src 加一：舊 src 嘅 promise 一律唔理 */
    private generation = 0;
    private revealPending = false;
    private pauseRequested = false;
    /** 我哋為咗預備而 pause()：嗰個 pause 事件唔報 */
    private internalPause = false;
    private readonly listeners = new Set<(event: EngineEvent) => void>();

    constructor(
        readonly element: HTMLVideoElement,
        readonly audio: MvAudio,
    ) {
        element.crossOrigin = 'anonymous';
        element.playsInline = true;
        element.preload = 'metadata';
        this.listen();
    }

    get positionSec(): number {
        return this.phase === 'live' ? this.element.currentTime : 0;
    }

    get durationSec(): number | null {
        const { duration } = this.element;
        return Number.isFinite(duration) && duration > 0 ? duration : null;
    }

    cue(track: EngineTrack): void {
        this.generation += 1;
        this.track = track;
        this.revealPending = false;
        this.audio.attach(this.element);
        this.audio.hold(true);
        this.element.src = track.url;
        if (!this.audio.supported) {
            this.phase = 'primed';
            this.element.load();
            return;
        }
        this.phase = 'priming';
        this.playElement();
    }

    reveal(): void {
        if (this.phase === 'priming') this.revealPending = true;
        else if (this.phase === 'primed') {
            this.phase = 'live';
            this.audio.hold(false);
            this.playElement();
        }
    }

    play(): void {
        if (this.phase === 'priming' || this.phase === 'primed') this.reveal();
        else if (this.phase === 'live' && this.element.paused) this.playElement();
    }

    pause(): void {
        const trackId = this.track?.id;
        if (!trackId) return;
        this.revealPending = false;
        if (this.phase !== 'live' || this.element.paused) {
            this.emit({ type: 'paused', trackId, requested: true });
            return;
        }
        this.pauseRequested = true;
        this.element.pause();
    }

    stop(): void {
        this.generation += 1;
        this.phase = 'idle';
        this.track = null;
        this.revealPending = false;
        this.element.pause();
        this.element.removeAttribute('src');
        this.element.load();
        this.audio.detach();
    }

    seek(positionSec: number): void {
        const duration = this.durationSec;
        if (duration === null) return;
        this.element.currentTime = Math.min(Math.max(0, positionSec), duration);
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
        on('loadedmetadata', () => this.onTime());
        on('ended', () => this.onEnded());
        on('error', () => this.onError());
    }

    private playElement(): void {
        const generation = this.generation;
        const result = this.element.play() as Promise<void> | undefined;
        result?.catch((error: unknown) => this.onPlayRejected(generation, error));
    }

    /** 只理而家呢個世代嘅 NotAllowedError；其他（換 src 引起嘅 AbortError）由 error 事件報 */
    private onPlayRejected(generation: number, error: unknown): void {
        const trackId = this.track?.id;
        const blocked = error instanceof Error && error.name === 'NotAllowedError';
        if (generation !== this.generation || !trackId || !blocked) return;
        this.emit({ type: 'error', trackId, reason: 'blocked' });
    }

    private onPlaying(): void {
        const trackId = this.track?.id;
        if (!trackId) return;
        if (this.phase === 'priming') {
            if (this.revealPending) this.goLive(trackId);
            else this.holdAtStart();
        } else if (this.phase === 'live') this.emit({ type: 'playing', trackId });
    }

    /** 預備完：停喺 0 等開機 */
    private holdAtStart(): void {
        this.internalPause = !this.element.paused;
        this.element.pause();
        this.element.currentTime = 0;
        this.phase = 'primed';
    }

    /** 預備未完已經開咗機：唔 pause，由 0 出聲 */
    private goLive(trackId: string): void {
        this.element.currentTime = 0;
        this.phase = 'live';
        this.revealPending = false;
        this.audio.hold(false);
        this.emit({ type: 'playing', trackId });
    }

    /** 預備嘅 pause、播到尾嘅 pause 唔報 */
    private onPause(): void {
        const trackId = this.track?.id;
        if (this.internalPause) {
            this.internalPause = false;
            return;
        }
        if (!trackId || this.phase !== 'live' || this.element.ended) return;
        const requested = this.pauseRequested;
        this.pauseRequested = false;
        this.emit({ type: 'paused', trackId, requested });
    }

    private onTime(): void {
        const trackId = this.track?.id;
        if (!trackId || this.phase !== 'live') return;
        const positionSec = this.element.currentTime;
        this.emit({ type: 'time', trackId, positionSec, durationSec: this.durationSec });
    }

    private onEnded(): void {
        const trackId = this.track?.id;
        if (trackId && this.phase === 'live') this.emit({ type: 'ended', trackId });
    }

    private onError(): void {
        const trackId = this.track?.id;
        const code = this.element.error?.code;
        if (!trackId || this.phase === 'idle' || code === undefined) return;
        if (code === MEDIA_ERR_ABORTED) return;
        this.emit({ type: 'error', trackId, reason: ERROR_REASONS[code] ?? 'unsupported' });
    }
}

const browserVideo = (): HTMLVideoElement => document.createElement('video');

/** 唯一入口：成個 app 一個引擎、一個 element；測試注入假 element 同假 Web Audio */
export const createVideoEngine = (
    element: HTMLVideoElement = browserVideo(),
    audio: MvAudio = createMvAudio(),
): VideoEngine => new Engine(element, audio);
