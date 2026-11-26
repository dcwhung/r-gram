/*
 * 主頁用嘅收藏（T-070）：本機 store（外部 store，`useSyncExternalStore`）→ 加咗 Favourites 碟嘅 document、
 * 收藏咗嘅歌 id、心形掣嘅 toggle。
 * 喺 Favourites 碟取消收藏播緊嘅歌（US-013）：store 即刻拎走（心形變空心、重開 app 唔再有），
 * 但首歌喺播（或者暫停、載入失敗）期間照留喺 Favourites 碟原本嘅位置；播完、換歌、放低隻碟先消失。
 */
import { type CatalogDocument, FAVOURITES_ALBUM_ID } from '@r-gram/catalog';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { withFavourites, withKept } from '../favourites/favouritesAlbum';
import {
    createBrowserFavourites,
    type FavouriteEntry,
    type FavouritesStore,
} from '../favourites/store';
import type { PlaybackState } from '../playback/playbackState';

export interface Favourites {
    /** catalog + 最尾一隻 Favourites 碟；未有 catalog = null */
    document: CatalogDocument | null;
    ids: ReadonlySet<string>;
    /** 心形掣：收藏／取消收藏一首歌 */
    toggle: (trackId: string) => void;
}

/** 呢首歌係咪由 Favourites 碟載入咗（播緊、暫停、載入失敗；播完唔算） */
const loadedFromFavourites = (playback: PlaybackState, trackId: string) =>
    playback.albumId === FAVOURITES_ALBUM_ID &&
    playback.trackId === trackId &&
    (playback.status === 'playing' || playback.status === 'paused' || playback.status === 'error');

const keptWhileLoaded = (kept: FavouriteEntry | null, playback: PlaybackState) =>
    kept && loadedFromFavourites(playback, kept.trackId) ? kept : null;

export const useFavourites = (
    catalog: CatalogDocument | null,
    playback: PlaybackState,
    store?: FavouritesStore,
): Favourites => {
    const [favourites] = useState(() => store ?? createBrowserFavourites());
    const entries = useSyncExternalStore(favourites.subscribe, favourites.getSnapshot);
    const [kept, setKept] = useState<FavouriteEntry | null>(null);
    const shownKept = keptWhileLoaded(kept, playback);
    const document = useMemo(
        () => (catalog ? withFavourites(catalog, withKept(entries, shownKept)) : null),
        [catalog, entries, shownKept],
    );
    const ids = useMemo(() => new Set(entries.map((entry) => entry.trackId)), [entries]);
    const toggle = (trackId: string) => {
        if (!favourites.has(trackId)) {
            // 播緊嗰陣取消咗再收藏 = undo：放返原本嘅位置；其他重新收藏排最尾
            favourites.add(trackId, shownKept?.trackId === trackId ? shownKept.addedAt : undefined);
            return;
        }
        const removed = favourites.remove(trackId);
        if (removed && loadedFromFavourites(playback, trackId)) setKept(removed);
    };
    return { document, ids, toggle };
};
