/*
 * Catalog 嘅純讀取函數：場景（轉碟、歌單、左上資訊）用。唔改 document、唔 cache。
 * Favourites 碟唔喺 catalog 入面：佢係由本機收藏砌出嚟嘅虛擬專輯（`favourites/favouritesAlbum.ts`，另一個任務），
 * 所以呢度用 `FAVOURITES_ALBUM_ID` 查專輯 / 歌單會搵唔到；收藏嘅歌用 `findTrack()` 逐首搵返。
 */
import type { CatalogAlbum, CatalogDocument, CatalogTrack } from '@r-gram/catalog';

export interface TrackLocation {
    album: CatalogAlbum;
    track: CatalogTrack;
}

const NO_TRACKS: readonly CatalogTrack[] = [];

/** 轉碟刻度上真專輯嘅次序 = catalog 次序（管理端次序）；冇歌嘅專輯照列（CR-003 決定 7：冇上下架，全部專輯都顯示）。♥ 永遠喺最尾，唔喺呢度 */
export const dialAlbums = (document: CatalogDocument): readonly CatalogAlbum[] => document.albums;

export const findAlbum = (document: CatalogDocument, albumId: string): CatalogAlbum | null =>
    document.albums.find((album) => album.id === albumId) ?? null;

/** 專輯全部歌（有冇音檔都列：冇音檔嘅係灰色行），次序跟 catalog；搵唔到專輯就冇歌 */
export const albumTracks = (document: CatalogDocument, albumId: string): readonly CatalogTrack[] =>
    findAlbum(document, albumId)?.tracks ?? NO_TRACKS;

/** 歌連佢原本嗰隻碟；歌已經被刪就係 null（收藏 / 續播記錄指住嘅歌唔顯示） */
export const findTrack = (document: CatalogDocument, trackId: string): TrackLocation | null => {
    for (const album of document.albums) {
        const track = album.tracks.find((candidate) => candidate.id === trackId);
        if (track) return { album, track };
    }
    return null;
};

/** 有音檔先播得；冇音檔 = 歌單灰色行、揀唔到（Functional Spec D11） */
export const isPlayable = (track: CatalogTrack): boolean => track.audio !== null;

/** 播得嘅歌，次序不變（隊列、Shuffle 只計呢啲） */
export const playableTracks = (tracks: readonly CatalogTrack[]): readonly CatalogTrack[] =>
    tracks.filter(isPlayable);
