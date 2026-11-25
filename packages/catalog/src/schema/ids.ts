/** 專輯 id：細楷英數，用連字號分段 */
const ALBUM_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TRACK_ID = /^[a-z0-9-]+$/;

/** Favourites 虛擬專輯（播放端由本機收藏砌出嚟）用咗呢個 id，真專輯唔可以用 */
export const FAVOURITES_ALBUM_ID = 'favourites';
const RESERVED_ALBUM_IDS: readonly string[] = [FAVOURITES_ALBUM_ID];

export const isAlbumId = (value: string): boolean =>
    ALBUM_ID.test(value) && !RESERVED_ALBUM_IDS.includes(value);

export const isTrackId = (value: string): boolean => TRACK_ID.test(value);
