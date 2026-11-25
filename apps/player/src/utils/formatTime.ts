const SECONDS_PER_MINUTE = 60;
const TWO_DIGITS = 2;

/** 播放位置 → `m:ss`（設計稿 `0:41`）。負數、NaN 當 0 */
export const formatTime = (seconds: number): string => {
    const whole = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
    const minutes = Math.floor(whole / SECONDS_PER_MINUTE);
    const rest = String(whole % SECONDS_PER_MINUTE).padStart(TWO_DIGITS, '0');
    return `${minutes}:${rest}`;
};

/** 歌號補到兩位（設計稿「第 07 首」） */
export const padTrackNumber = (no: number): string => String(no).padStart(TWO_DIGITS, '0');
