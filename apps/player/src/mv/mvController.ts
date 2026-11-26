/*
 * 電視 controller（外部 store；Functional Spec US-007、C8、FR-038；Technical Spec「CR-010 → MV 音訊」
 *「MV 電視過場」「Media Session → MV 開住」）。`subscribe`／`getSnapshot` 畀 `useSyncExternalStore`。
 * - 開：手勢入面 `cue`（gain 0），鎖屏轉去 MV；升起 + 開機（crtOn 完）先 `reveal` 出聲。計時喺呢度，唔靠 render
 * - 收（■ 或者播完）：即刻靜，熄機 + 收埋（tvCloseMs）之後先停引擎、鎖屏轉返唱片、`phase = closed`
 * - 載入失敗：電視留低，螢幕講「未能播放 MV」，▶ = 由頭再試；自動播被拒：停喺度等 ▶
 * - 旋鈕（T-061）：音量、靜音經 gain（D104；轉音量 = 取消靜音），音量同靜音下次開電視照用；快轉／倒轉。
 *   未開機、熄機期間旋鈕唔郁
 * 唱片點停、收埋之後唔續播（C8）係主頁嘅事（useHome、playbackController.pauseFor）。
 */
import { MOTION } from '../config/motion';
import type { EngineEvent, EngineTrack } from '../playback/audioEngine';
import type { MediaSessionPort, NowPlaying } from '../playback/mediaSession';
import type { SessionTargets } from '../playback/sessionTargets';
import { prefersReducedMotion } from '../utils/motion';
import type { VideoEngine } from './videoEngine';

export interface MvTrack extends EngineTrack {
    readonly title: string;
    /** 鎖屏：歌名 + 「MV」、碟名、封面 */
    readonly nowPlaying: NowPlaying;
}

/** closed：收埋咗；open：升起 / 開住；closing：熄機 + 收埋緊 */
export type TvPhase = 'closed' | 'open' | 'closing';
export type MvStatus = 'loading' | 'playing' | 'paused' | 'error';

export interface MvSnapshot {
    readonly phase: TvPhase;
    readonly status: MvStatus;
    readonly track: MvTrack | null;
    readonly positionSec: number;
    readonly durationSec: number | null;
    /** 載入失敗（被拒唔算） */
    readonly failed: boolean;
    readonly volume: number;
    readonly muted: boolean;
    /** 有 Web Audio：音量旋鈕用得 */
    readonly volumeSupported: boolean;
}

export interface MvControllerDeps {
    engine: VideoEngine;
    /** 鎖屏嘅目標（唱片／MV）；冇 = 唔理鎖屏 */
    sessions?: SessionTargets | null;
    reduceMotion?: () => boolean;
}

export interface MvController {
    subscribe(listener: () => void): () => void;
    getSnapshot(): MvSnapshot;
    /** 電視 mount 時放入螢幕嘅 `<video>` */
    readonly element: HTMLVideoElement;
    /** 㩒 MV 掣（手勢入面同步叫）：升起電視、預備 MV */
    open(track: MvTrack): void;
    play(): void;
    pause(): void;
    /** ■：熄機、收埋 */
    stop(): void;
    /** 0–1（冇 Web Audio = 唔做嘢） */
    setVolume(level: number): void;
    toggleMute(): void;
    /** 快轉（正數）／倒轉（負數）幾多秒，夾喺 MV 入面 */
    seekBy(deltaSec: number): void;
    seekTo(positionSec: number): void;
}

type Timer = ReturnType<typeof setTimeout>;

const CLOSED: MvSnapshot = {
    phase: 'closed',
    status: 'loading',
    track: null,
    positionSec: 0,
    durationSec: null,
    failed: false,
    volume: 1,
    muted: false,
    volumeSupported: false,
};

class Controller implements MvController {
    private snapshot: MvSnapshot;
    private timer: Timer | null = null;
    private readonly listeners = new Set<() => void>();
    private readonly engine: VideoEngine;
    private readonly sessions: SessionTargets | null;
    private readonly reduceMotion: () => boolean;

    constructor(deps: MvControllerDeps) {
        this.engine = deps.engine;
        this.sessions = deps.sessions ?? null;
        this.reduceMotion = deps.reduceMotion ?? prefersReducedMotion;
        this.snapshot = { ...CLOSED, ...this.levels() };
        this.engine.subscribe((event) => this.onEngine(event));
        this.session?.bind({
            play: () => this.play(),
            pause: () => this.pause(),
            seekTo: (positionSec) => this.seekTo(positionSec),
        });
    }

    get element(): HTMLVideoElement {
        return this.engine.element;
    }

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    getSnapshot = (): MvSnapshot => this.snapshot;

    open(track: MvTrack): void {
        if (this.snapshot.phase !== 'closed') return;
        this.engine.cue(track);
        this.session?.setNowPlaying(track.nowPlaying);
        this.session?.setState('paused');
        this.sessions?.use('mv');
        this.update({ ...CLOSED, ...this.levels(), phase: 'open', status: 'loading', track });
        this.after(this.revealDelay(), () => this.reveal());
    }

    play(): void {
        const { phase, status, track } = this.snapshot;
        if (phase !== 'open' || !track) return;
        if (status === 'error') {
            // 由頭再試（呢下係 ▶ 嘅手勢，cue 得）
            this.engine.cue(track);
            this.update({ status: 'loading', failed: false });
        }
        this.clearTimer();
        this.engine.reveal();
        this.engine.play();
    }

    pause(): void {
        if (this.snapshot.phase !== 'open') return;
        this.clearTimer();
        this.engine.pause();
    }

    stop(): void {
        if (this.snapshot.phase !== 'open') return;
        this.clearTimer();
        this.engine.pause();
        this.update({ phase: 'closing' });
        this.after(this.closeDelay(), () => this.close());
    }

    setVolume(level: number): void {
        if (!this.knobsWork()) return;
        const { audio } = this.engine;
        audio.setVolume(level);
        audio.setMuted(false);
        this.update(this.levels());
    }

    toggleMute(): void {
        if (!this.knobsWork()) return;
        const { audio } = this.engine;
        audio.setMuted(!audio.muted);
        this.update(this.levels());
    }

    seekBy(deltaSec: number): void {
        this.seekTo(this.engine.positionSec + deltaSec);
    }

    seekTo(positionSec: number): void {
        const { phase, status } = this.snapshot;
        if (phase !== 'open' || (status !== 'playing' && status !== 'paused')) return;
        this.engine.seek(positionSec);
        this.update({ positionSec: this.engine.positionSec });
        this.reportPosition();
    }

    /** 音量旋鈕：電視開住（唔係熄機緊）、有 Web Audio */
    private knobsWork(): boolean {
        return this.snapshot.phase === 'open' && this.engine.audio.supported;
    }

    private get session(): MediaSessionPort | null {
        return this.sessions?.mv ?? null;
    }

    /** 音量、靜音、有冇 Web Audio（成個 app 一個 gain，所以收埋再開都係同一個音量） */
    private levels(): Pick<MvSnapshot, 'volume' | 'muted' | 'volumeSupported'> {
        const { audio } = this.engine;
        return { volume: audio.volume, muted: audio.muted, volumeSupported: audio.supported };
    }

    /** 開機（crtOn 完）先出聲；減少動態效果 = 即刻 */
    private revealDelay(): number {
        const { crtOnDelayMs, crtOnMs } = MOTION.scene;
        return this.reduceMotion() ? 0 : crtOnDelayMs + crtOnMs;
    }

    private closeDelay(): number {
        return this.reduceMotion() ? 0 : MOTION.scene.tvCloseMs;
    }

    private reveal(): void {
        if (this.snapshot.status === 'loading') this.engine.reveal();
    }

    private close(): void {
        this.engine.stop();
        this.sessions?.use('record');
        this.update({ ...CLOSED, ...this.levels() });
    }

    /** 0 毫秒 = 即刻（同一個 call stack，例如減少動態效果） */
    private after(ms: number, action: () => void): void {
        this.clearTimer();
        if (ms === 0) {
            action();
            return;
        }
        this.timer = setTimeout(() => {
            this.timer = null;
            action();
        }, ms);
    }

    private clearTimer(): void {
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
    }

    private onEngine(event: EngineEvent): void {
        if (this.snapshot.phase === 'closed') return;
        if (event.type === 'playing') this.onPlaying();
        else if (event.type === 'paused') this.onPaused();
        else if (event.type === 'time') this.onTime(event.positionSec, event.durationSec);
        else if (event.type === 'ended') this.stop();
        else if (event.type === 'error') this.onError(event.reason === 'blocked');
    }

    private onPlaying(): void {
        this.session?.setState('playing');
        this.update({ status: 'playing', failed: false });
        this.reportPosition();
    }

    private onPaused(): void {
        this.session?.setState('paused');
        this.update({ status: 'paused' });
        this.reportPosition();
    }

    /**
     * 進度線同時間一秒一格就夠（S-260：timeupdate 約 4 Hz，唔好每次都令主頁 re-render）：
     * 整秒變咗或者長度變咗先通知；長度變咗先報鎖屏
     */
    private onTime(positionSec: number, durationSec: number | null): void {
        const lengthChanged = durationSec !== this.snapshot.durationSec;
        const sameSecond = Math.floor(positionSec) === Math.floor(this.snapshot.positionSec);
        if (sameSecond && !lengthChanged) return;
        this.update({ positionSec, durationSec });
        if (lengthChanged) this.reportPosition();
    }

    /** 被拒 = 停喺度等 ▶；其他 = 載入失敗 */
    private onError(blocked: boolean): void {
        this.clearTimer();
        this.session?.setState('paused');
        this.update(blocked ? { status: 'paused' } : { status: 'error', failed: true });
    }

    private reportPosition(): void {
        this.session?.setPosition(this.engine.positionSec, this.engine.durationSec);
    }

    private update(change: Partial<MvSnapshot>): void {
        this.snapshot = { ...this.snapshot, ...change };
        this.listeners.forEach((listener) => listener());
    }
}

export const createMvController = (deps: MvControllerDeps): MvController => new Controller(deps);
