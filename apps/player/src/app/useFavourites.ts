/*
 * 主頁用嘅收藏（T-070）：本機 store（外部 store，`useSyncExternalStore`）→ 加咗 Favourites 碟嘅 document、
 * 收藏咗嘅歌 id、心形掣嘅 toggle。
 * 喺 Favourites 碟取消收藏播緊嘅歌（US-013；呢個畫面或者其他分頁，W-067）：store 即刻拎走（心形變空心、
 * 重開 app 唔再有），但首歌喺播（或者暫停、載入失敗）期間照留喺原本嘅位置；播完、換歌、放低隻碟先消失。
 */
import { type CatalogDocument, FAVOURITES_ALBUM_ID } from '@r-gram/catalog';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { CoverVariants } from '../catalog/coverVariants';
import { withFavourites, withKept } from '../favourites/favouritesAlbum';
import {
    createBrowserFavourites,
    type FavouriteEntry,
    type FavouritesStore,
} from '../favourites/store';
import type { PlaybackController } from '../playback/playbackController';
import { playbackSource } from '../playback/playbackSource';
import type { PlaybackState } from '../playback/playbackState';

export interface Favourites {
    /** catalog + 最尾一隻 Favourites 碟；未有 catalog = null */
    document: CatalogDocument | null;
    ids: ReadonlySet<string>;
    /** 心形掣：收藏／取消收藏一首歌 */
    toggle: (trackId: string) => void;
}

/** 由 Favourites 碟載入嘅歌（播緊、暫停、載入失敗；播完唔算）；冇 = null */
const loadedFavourite = (playback: PlaybackState): string | null =>
    playback.albumId === FAVOURITES_ALBUM_ID &&
    (playback.status === 'playing' || playback.status === 'paused' || playback.status === 'error')
        ? playback.trackId
        : null;

/**
 * W-067：載入嘅歌喺收藏入面時記低佢嗰項；之後佢喺收藏度冇咗（呢個畫面嘅心形掣、其他分頁都一樣）
 * 就用記低嗰項排返原位，直到換歌、播完或者放低隻碟。用 render 期間調整 state（唔使 effect）
 */
const useKept = (entries: readonly FavouriteEntry[], playback: PlaybackState) => {
    const loaded = loadedFavourite(playback);
    const current = entries.find((entry) => entry.trackId === loaded) ?? null;
    const [remembered, setRemembered] = useState<FavouriteEntry | null>(current);
    if (current && current !== remembered) setRemembered(current);
    return !current && loaded && remembered?.trackId === loaded ? remembered : null;
};

export const useFavourites = (
    catalog: CatalogDocument | null,
    playback: PlaybackState,
    store?: FavouritesStore,
): Favourites => {
    const [favourites] = useState(() => store ?? createBrowserFavourites());
    // 自己開嘅 store：unmount 時唔再聽其他分頁（S-257），StrictMode 重新 mount 再聽返；外面畀嘅由外面管
    useEffect(() => {
        if (store) return undefined;
        favourites.listen();
        return favourites.dispose;
    }, [store, favourites]);
    const entries = useSyncExternalStore(favourites.subscribe, favourites.getSnapshot);
    const kept = useKept(entries, playback);
    const document = useMemo(
        () => (catalog ? withFavourites(catalog, withKept(entries, kept)) : null),
        [catalog, entries, kept],
    );
    const ids = useMemo(() => new Set(entries.map((entry) => entry.trackId)), [entries]);
    const toggle = (trackId: string) => {
        if (favourites.has(trackId)) favourites.remove(trackId);
        // 播緊嗰陣取消咗再收藏 = undo：放返原本嘅位置；其他重新收藏排最尾
        else favourites.add(trackId, kept?.trackId === trackId ? kept.addedAt : undefined);
    };
    return { document, ids, toggle };
};

/**
 * Favourites 碟播緊（或者暫停、播完）期間收藏有變（加歌、播完咗嘅取消收藏歌拎走、其他分頁改咗）：
 * 將新歌單交畀 controller，之後嘅自動下一首跟住（隨機嘅今輪照舊）。真專輯唔受影響
 */
export const useFavouritesQueue = (
    player: PlaybackController,
    loadedAlbumId: string | null,
    document: CatalogDocument | null,
    covers: CoverVariants,
): void => {
    useEffect(() => {
        if (!document || loadedAlbumId !== FAVOURITES_ALBUM_ID) return;
        const source = playbackSource(document, FAVOURITES_ALBUM_ID, covers);
        if (source) player.refresh(source);
    }, [player, loadedAlbumId, document, covers]);
};
