/*
 * MV 嘅聲音（Technical Spec「CR-010 → MV 音訊」；T-011 報告 §2.8、spike ④）：
 * `<video crossOrigin="anonymous">` → MediaElementAudioSourceNode → GainNode → 喇叭。
 * 音量、預備期間嘅靜音全部經 gain；唔用 `video.volume`、`video.muted`（spike 4f：接咗 graph 之後冇效）。
 * 成個 app 一個 `<video>`，所以 graph 只砌一次；收埋電視 suspend，下次開再 resume。
 */
import { DEFAULT_MV_VOLUME, MV_GAIN_RAMP_S } from './mvConfig';

type AudioContextClass = typeof AudioContext;

export interface MvAudioEnv {
    /** 冇 = 呢個瀏覽器冇 Web Audio（極舊）：MV 用系統音量照播 */
    AudioContext?: AudioContextClass;
}

export interface MvAudio {
    /** 有冇 AudioContext */
    readonly supported: boolean;
    /** 手勢入面同步叫：第一次砌 context、source、gain（之後重用）；context.resume() */
    attach(video: HTMLMediaElement): void;
    /** 預備期間 gain 0（唔係 muted）；false = 去返音量 */
    hold(silent: boolean): void;
    /** 電視收埋：context.suspend()（唔 close） */
    detach(): void;
}

export const browserMvAudioEnv = (): MvAudioEnv => {
    if (typeof window === 'undefined') return {};
    const prefixed = (window as Window & { webkitAudioContext?: AudioContextClass })
        .webkitAudioContext;
    const Context = window.AudioContext ?? prefixed;
    return Context ? { AudioContext: Context } : {};
};

interface Graph {
    context: AudioContext;
    gain: GainNode;
}

class GainAudio implements MvAudio {
    private graph: Graph | null = null;
    private held = false;
    private readonly level = DEFAULT_MV_VOLUME;

    constructor(private readonly env: MvAudioEnv) {}

    get supported(): boolean {
        return this.env.AudioContext !== undefined;
    }

    attach(video: HTMLMediaElement): void {
        const graph = this.graph ?? this.build(video);
        if (!graph) return;
        // resume 要喺手勢入面；失敗（例如未准）唔影響畫面，聲音由下一次手勢再試
        graph.context.resume().catch(() => {});
    }

    hold(silent: boolean): void {
        this.held = silent;
        const graph = this.graph;
        if (!graph) return;
        const { gain, context } = graph;
        gain.gain.cancelScheduledValues(context.currentTime);
        // 靜音即刻（預備嗰下唔可以漏聲）；開聲用短 ramp
        if (silent) gain.gain.setValueAtTime(0, context.currentTime);
        else gain.gain.setTargetAtTime(this.target(), context.currentTime, MV_GAIN_RAMP_S);
    }

    detach(): void {
        this.graph?.context.suspend().catch(() => {});
    }

    private target(): number {
        return this.held ? 0 : this.level;
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
