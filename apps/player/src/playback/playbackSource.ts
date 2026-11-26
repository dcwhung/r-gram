/*
 * 由 catalog 砌出 controller 要嘅「播放來源」（純函數）：一隻碟嘅播得嘅歌（有音檔，D11）、
 * 音檔網址（逐段 encode，`mediaUrl`）、碟名同封面（Media Session，T-011 報告 §2.6）。
 * controller 自己唔讀 catalog：自動下一首要同步，所以開始播嗰下就將成隻碟交畀佢。
 * Favourites 碟（T-070）一樣：`document` 係 `withFavourites()` 嗰份；每首歌另外帶住佢原本嗰隻碟同封面（鎖屏顯示）。
 */
import {
    type CatalogAlbum,
    type CatalogDocument,
    type CatalogTrack,
    mediaUrl,
} from '@r-gram/catalog';
import { coverVariantOf, type CoverVariants } from '../catalog/coverVariants';
import { albumArt, findAlbum, findTrack, playableTracks } from '../catalog/selectors';
import type { PlaybackSource, SourceTrack } from './playbackController';

/** 封面檔嘅尺寸（Functional Spec D48、D50：大封面 1200、縮圖 320，正方形） */
const ARTWORK_SIZE = { thumb: 320, cover: 1200 } as const;

const IMAGE_TYPES: Readonly<Record<string, string>> = {
    webp: 'image/webp',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
};

const imageType = (file: string): string | undefined =>
    IMAGE_TYPES[file.split('.').pop()?.toLowerCase() ?? ''];

const artworkItem = (base: string, file: string | null, size: number): MediaImage[] =>
    file ? [{ src: mediaUrl(base, file), sizes: `${size}x${size}`, type: imageType(file) }] : [];

/** 一隻碟揀中嗰張封面：縮圖 + 大封面 */
const albumArtwork = (
    document: CatalogDocument,
    album: CatalogAlbum,
    covers: CoverVariants,
): MediaImage[] => {
    const art = albumArt(album, coverVariantOf(covers, album.id));
    return [
        ...artworkItem(document.imageBase, art.thumb, ARTWORK_SIZE.thumb),
        ...artworkItem(document.imageBase, art.cover, ARTWORK_SIZE.cover),
    ];
};

/** 一首播得嘅歌；原本嗰隻碟唔係呢隻碟（Favourites 碟）就帶住原本碟名同封面 */
const sourceTrack = (
    document: CatalogDocument,
    album: CatalogAlbum,
    covers: CoverVariants,
    track: CatalogTrack,
): SourceTrack => {
    const base = {
        id: track.id,
        title: track.title,
        url: mediaUrl(document.mediaBase, track.audio ?? ''),
    };
    const origin = findTrack(document, track.id)?.album;
    if (!origin || origin.id === album.id) return base;
    return {
        ...base,
        album: { title: origin.title, artwork: albumArtwork(document, origin, covers) },
    };
};

export const playbackSource = (
    document: CatalogDocument,
    albumId: string,
    covers: CoverVariants,
): PlaybackSource | null => {
    const album = findAlbum(document, albumId);
    if (!album) return null;
    return {
        albumId,
        albumTitle: album.title,
        tracks: playableTracks(album.tracks).map((track) =>
            sourceTrack(document, album, covers, track),
        ),
        artwork: albumArtwork(document, album, covers),
    };
};
