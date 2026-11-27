/** 事件記錄最多留幾多行（最新喺最前） */
export const LOG_LIMIT = 40;
/** 「閃」= 過去一秒 fit key 變咗幾多次 */
export const FLICKER_WINDOW_MS = 1000;

export interface LogEntry {
    /** ms，由 navigation start 計 */
    t: number;
    type: string;
    detail: string;
}

export const appendEntry = (
    log: readonly LogEntry[],
    entry: LogEntry,
    limit = LOG_LIMIT,
): LogEntry[] => [entry, ...log].slice(0, limit);

/** 只留 (now − window, now] 入面嘅時間 */
export const recentTimes = (
    times: readonly number[],
    now: number,
    windowMs = FLICKER_WINDOW_MS,
): number[] => times.filter((time) => now - time < windowMs);

export const formatEntry = ({ t, type, detail }: LogEntry): string =>
    `+${Math.round(t)}ms ${type} ${detail}`.trimEnd();
