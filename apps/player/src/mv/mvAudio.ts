/*
 * MV 嘅聲音（Technical Spec「CR-010 → MV 音訊」；T-011 報告 §2.8、spike ④；Functional Spec D104）：
 * `<video crossOrigin="anonymous">` → MediaElementAudioSourceNode → GainNode → 喇叭。
 * 音量、靜音（gain 0，記住音量）、預備期間嘅靜音全部經 gain；唔用 `video.volume`、`video.muted`
 *（spike 4f：接咗 graph 之後冇效）。所有平台一樣。
 * 成個 app 一個 `<video>`，所以 graph 只砌一次；收埋電視 suspend，下次開再 resume。
 * 開電視嘅手勢入面，有 `navigator.audioSession` 就設 `playback`（🅰️ Q2：側邊靜音撥掣開咗 MV 照有聲；唱片唔掂）。
 */
import { DEFAULT_MV_VOLUME, MV_GAIN_RAMP_S } from './mvConfig';

type AudioContextClass = typeof AudioContext;

/** iOS 17+ 嘅 `navigator.audioSession`（未入 TypeScript 嘅 DOM 型別） */
interface AudioSessionLike {
    type: string;
}

export interface MvAudioEnv {
    /** 冇 = 呢個瀏覽器冇 Web Audio（極舊）：音量旋鈕停用，MV 用系統音量照播 */
    AudioContext?: AudioContextClass;
    audioSession?: AudioSessionLike;
}

export interface MvAudio {
    /** 有冇 AudioContext；false = 音量旋鈕 aria-disabled */
    readonly supported: boolean;
    /** 手勢入面同步叫：第一次砌 context、source、gain（之後重用）；context.resume()；audioSession = playback */
    attach(video: HTMLMediaElement): void;
    /** 預備期間 gain 0（唔係 muted）；false = 去返音量 */
    hold(silent: boolean): void;
    /** 0–1；短 ramp */
    setVolume(level: number): void;
    /** 靜音 = gain 0，記住音量；false 還原 */
    setMuted(muted: boolean): void;
    readonly volume: number;
    readonly muted: boolean;
    /** 電視收埋：context.suspend()（唔 close） */
    detach(): void;
}

export const browserMvAudioEnv = (): MvAudioEnv => {
    if (typeof window === 'undefined') return {};
    const prefixed = (window as Window & { webkitAudioContext?: AudioContextClass })
        .webkitAudioContext;
    const Context = window.AudioContext ?? prefixed;
    const { audioSession } = navigator as Navigator & { audioSession?: AudioSessionLike };
    return {
        ...(Context ? { AudioContext: Context } : {}),
        ...(audioSession ? { audioSession } : {}),
    };
};

const clampLevel = (level: number) => Math.min(1, Math.max(0, level));

interface Graph {
    context: AudioContext;
    gain: GainNode;
}

class GainAudio implements MvAudio {
    private graph: Graph | null = null;
    private held = false;
    volume = DEFAULT_MV_VOLUME;
    muted = false;

    constructor(private readonly env: MvAudioEnv) {}

    get supported(): boolean {
        return this.env.AudioContext !== undefined;
    }

    attach(video: HTMLMediaElement): void {
        if (this.env.audioSession) this.env.audioSession.type = 'playback';
        const graph = this.graph ?? this.build(video);
        if (!graph) return;
        // resume 要喺手勢入面；失敗（例如未准）唔影響畫面，聲音由下一次手勢再試
        graph.context.resume().catch(() => {});
    }

    hold(silent: boolean): void {
        this.held = silent;
        this.apply();
    }

    setVolume(level: number): void {
        this.volume = clampLevel(level);
        this.apply();
    }

    setMuted(muted: boolean): void {
        this.muted = muted;
        this.apply();
    }

    detach(): void {
        this.graph?.context.suspend().catch(() => {});
    }

    /** 靜（預備、靜音）即刻到 0，唔可以漏聲；開聲同轉音量用短 ramp */
    private apply(): void {
        const graph = this.graph;
        if (!graph) return;
        const { gain, context } = graph;
        const silent = this.held || this.muted;
        gain.gain.cancelScheduledValues(context.currentTime);
        if (silent) gain.gain.setValueAtTime(0, context.currentTime);
        else gain.gain.setTargetAtTime(this.volume, context.currentTime, MV_GAIN_RAMP_S);
    }

    /** 每個 element 只可以 createMediaElementSource 一次：成個 app 一個 <video>，所以只砌一次 */
    private build(video: HTMLMediaElement): Graph | null {
        const Context = this.env.AudioContext;
        if (!Context) return null;
        const context = new Context();
        const gain = context.createGain();
        context.createMediaElementSource(video).connect(gain);
        gain.connect(context.destination);
        this.graph = { context, gain };
        return this.graph;
    }
}

export const createMvAudio = (env: MvAudioEnv = browserMvAudioEnv()): MvAudio => new GainAudio(env);
