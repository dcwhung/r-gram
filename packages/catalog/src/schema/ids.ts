/** 專輯 id：細楷英數，用連字號分段 */
const ALBUM_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TRACK_ID = /^[a-z0-9-]+$/;

/** Favourites 虛擬專輯（播放端由本機收藏砌出嚟）用咗呢個 id，真專輯唔可以用 */
export const FAVOURITES_ALBUM_ID = 'favourites';
const RESERVED_ALBUM_IDS: readonly string[] = [FAVOURITES_ALBUM_ID];

/** 歌號範圍（Functional Spec D60：跟檔名開頭嘅歌號，可以跳號）；D1 嘅 CHECK 用同一對數 */
export const TRACK_NO_MIN = 1;
export const TRACK_NO_MAX = 999;
const TRACK_NO_MIN_DIGITS = 2;

export const isAlbumId = (value: string): boolean =>
    ALBUM_ID.test(value) && !RESERVED_ALBUM_IDS.includes(value);

export const isTrackId = (value: string): boolean => TRACK_ID.test(value);

export const isTrackNo = (value: unknown): value is number =>
    Number.isInteger(value) &&
    (value as number) >= TRACK_NO_MIN &&
    (value as number) <= TRACK_NO_MAX;

/**
 * 建立歌時嘅 id：`<專輯 id>-<兩位歌號>`（例如 `apollo-18-01`；Functional Spec D61）。
 * 建立後不變：之後改歌號唔改 id，所以已經有人用嘅時候由建立嘅一方換隨機 id
 */
export const trackIdFor = (albumId: string, no: number): string =>
    `${albumId}-${String(no).padStart(TRACK_NO_MIN_DIGITS, '0')}`;
