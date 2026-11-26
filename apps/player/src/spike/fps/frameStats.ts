/* ⑤ 幀率：由 requestAnimationFrame 嘅時間戳計平均 fps、最慢一格、掉格比例（以 60 Hz 做一格） */

export interface FrameStats {
    frames: number;
    durationMs: number;
    averageFps: number;
    worstMs: number;
    droppedFrames: number;
    droppedPercent: number;
}

const MS_PER_SECOND = 1000;
const BASE_FRAME_MS = MS_PER_SECOND / 60;
/** 一格超過 1.5 格咁耐先當有掉格（容許少少抖動） */
const DROP_THRESHOLD = 1.5;
const PERCENT = 100;

const EMPTY: FrameStats = {
    frames: 0,
    durationMs: 0,
    averageFps: 0,
    worstMs: 0,
    droppedFrames: 0,
    droppedPercent: 0,
};

const droppedIn = (interval: number): number =>
    interval > BASE_FRAME_MS * DROP_THRESHOLD ? Math.round(interval / BASE_FRAME_MS) - 1 : 0;

export const frameStats = (timestamps: readonly number[]): FrameStats => {
    if (timestamps.length < 2) return { ...EMPTY };
    const intervals = timestamps.slice(1).map((time, index) => time - (timestamps[index] ?? time));
    const durationMs = intervals.reduce((sum, value) => sum + value, 0);
    const droppedFrames = intervals.reduce((sum, value) => sum + droppedIn(value), 0);
    const frames = intervals.length;
    return {
        frames,
        durationMs,
        averageFps: durationMs > 0 ? (frames * MS_PER_SECOND) / durationMs : 0,
        worstMs: Math.max(...intervals),
        droppedFrames,
        droppedPercent: (droppedFrames / (frames + droppedFrames)) * PERCENT,
    };
};

export const formatFrameStats = (stats: FrameStats): string =>
    `平均 ${stats.averageFps.toFixed(1)} fps · 最慢一格 ${stats.worstMs.toFixed(1)} ms · ` +
    `掉格 ${stats.droppedPercent.toFixed(1)}%（${stats.frames} 格 / ` +
    `${(stats.durationMs / MS_PER_SECOND).toFixed(2)} 秒）`;
