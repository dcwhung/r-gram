/*
 * 左上資訊同收藏有關嘅衍生值（純函數；Functional Spec US-010、D19、§CR-002「Favourites」；設計稿 infoParts()）：
 * 心形掣嘅狀態、Favourites 碟嘅歌原本嗰隻碟、碟名下面嗰行（真專輯 = 年份；Favourites 碟 = 「N 首」）。
 */
import {
    type CatalogAlbum,
    type CatalogDocument,
    type CatalogTrack,
    FAVOURITES_ALBUM_ID,
} from '@r-gram/catalog';
import { findTrack } from '../catalog/selectors';
import { t } from '../i18n/t';

/** 碟名下面嗰行：Favourites 碟係歌數（冇收藏 = 「0 首」）；真專輯係年份，冇年份就冇字 */
export const albumSub = (album: CatalogAlbum | null): string => {
    if (album?.id === FAVOURITES_ALBUM_ID) {
        return t('album.trackCount', { count: album.tracks.length });
    }
    return album?.year == null ? '' : String(album.year);
};

/** 一首歌原本嗰隻碟同年份（設計稿 TRACKS.favourites：`碟名 · 年份`）；搵唔到 = null */
export const originText = (document: CatalogDocument, trackId: string): string | null => {
    const album = findTrack(document, trackId)?.album;
    if (!album) return null;
    return album.year === null
        ? album.title
        : t('favourites.origin', { album: album.title, year: String(album.year) });
};

export interface FavouriteParts {
    /** 左上嗰首歌係咪收藏咗（心形掣著唔著） */
    favourite: boolean;
    /** 顯示緊 Favourites 碟：左上嗰首歌原本嗰隻碟；其他碟 = null */
    origin: string | null;
    /** 碟名下面嗰行 */
    albumSub: string;
}

/** `track` = 左上顯示嗰首（播緊嘅歌，或者歌單開住時框入面嗰首） */
export const favouriteParts = (
    document: CatalogDocument,
    album: CatalogAlbum | null,
    track: CatalogTrack | null,
    favouriteIds: ReadonlySet<string>,
): FavouriteParts => ({
    favourite: track !== null && favouriteIds.has(track.id),
    origin: track && album?.id === FAVOURITES_ALBUM_ID ? originText(document, track.id) : null,
    albumSub: albumSub(album),
});
