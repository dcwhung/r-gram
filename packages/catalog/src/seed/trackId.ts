const TRACK_NO_MIN_DIGITS = 2;

/** 初始匯入嘅歌 id：`<專輯 id>-<兩位歌號>`（例如 `apollo-18-01`）。建立後不變 */
export const trackIdFor = (albumId: string, no: number): string =>
    `${albumId}-${String(no).padStart(TRACK_NO_MIN_DIGITS, '0')}`;
