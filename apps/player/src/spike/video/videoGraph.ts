/*
 * ④ MV 音量（Functional Spec C9；iPhone 唔理 `video.volume`）：`<video crossOrigin="anonymous">` →
 * MediaElementAudioSourceNode → GainNode → AnalyserNode → 喇叭。CORS 唔啱 = element「tainted」，graph 出嚟全部係 0。
 */
import { errorText } from '../media/probe';

export interface VideoGraph {
    context: AudioContext;
    gain: GainNode;
    analyser: AnalyserNode;
}

const graphs = new WeakMap<HTMLMediaElement, VideoGraph>();
const ANALYSER_SIZE = 2048;
const PROBE_VOLUME = 0.5;

type AudioContextClass = typeof AudioContext;

const contextClass = (): AudioContextClass | undefined =>
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: AudioContextClass }).webkitAudioContext;

/** 每個 element 只可以 createMediaElementSource 一次：砌過就用返（要喺手勢入面叫，iOS 先肯 resume） */
export const connectVideo = (video: HTMLVideoElement): VideoGraph | null => {
    const existing = graphs.get(video);
    if (existing) return existing;
    const Context = contextClass();
    if (!Context) return null;
    const context = new Context();
    const gain = context.createGain();
    const analyser = context.createAnalyser();
    analyser.fftSize = ANALYSER_SIZE;
    context.createMediaElementSource(video).connect(gain);
    gain.connect(analyser);
    analyser.connect(context.destination);
    const graph = { context, gain, analyser };
    graphs.set(video, graph);
    return graph;
};

/** 訊號大細（RMS，0–1） */
export const levelOf = (analyser: AnalyserNode): number => {
    const samples = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(samples);
    const sum = samples.reduce((total, value) => total + value * value, 0);
    return Math.sqrt(sum / samples.length);
};

/** 後備一：設 0.5 再讀返；iOS 永遠係 1（唯讀） */
export const volumeWritable = (video: HTMLVideoElement): boolean => {
    const before = video.volume;
    video.volume = PROBE_VOLUME;
    const writable = video.volume === PROBE_VOLUME;
    video.volume = before;
    return writable;
};

/** 直接攞頭 1 byte：bucket 有冇對呢個 origin 回 CORS 標頭 */
export const checkCors = async (url: string): Promise<{ ok: boolean; detail: string }> => {
    try {
        const response = await fetch(url, { headers: { Range: 'bytes=0-0' }, cache: 'no-store' });
        return { ok: response.ok, detail: `HTTP ${response.status}` };
    } catch (error) {
        return { ok: false, detail: errorText(error) };
    }
};

interface AudioSessionNavigator {
    audioSession?: { type: string };
}

export const hasAudioSession = (): boolean =>
    (navigator as Navigator & AudioSessionNavigator).audioSession !== undefined;

/** iOS 17+：Web Audio 預設跟靜音鍵（ambient）；`playback` = 同 `<audio>` 一樣唔理靜音鍵 */
export const setPlaybackSession = (on: boolean): void => {
    const session = (navigator as Navigator & AudioSessionNavigator).audioSession;
    if (session) session.type = on ? 'playback' : 'auto';
};

/** 後備二：靜音開關 */
export const toggleMuted = (video: HTMLVideoElement | null): void => {
    if (video) video.muted = !video.muted;
};
