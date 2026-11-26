/*
 * 由 catalog 砌出 controller 要嘅「播放來源」（純函數）：一隻碟嘅播得嘅歌（有音檔，D11）、
 * 音檔網址（逐段 encode，`mediaUrl`）、碟名同封面（Media Session，T-011 報告 §2.6）。
 * controller 自己唔讀 catalog：自動下一首要同步，所以開始播嗰下就將成隻碟交畀佢。
 * Favourites 碟（T-070）到時砌另一個來源就得。
 */
import { type CatalogDocument, mediaUrl } from '@r-gram/catalog';
import { coverVariantOf, type CoverVariants } from '../catalog/coverVariants';
import { albumArt, findAlbum, playableTracks } from '../catalog/selectors';
import type { PlaybackSource } from './playbackController';

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

export const playbackSource = (
    document: CatalogDocument,
    albumId: string,
    covers: CoverVariants,
): PlaybackSource | null => {
    const album = findAlbum(document, albumId);
    if (!album) return null;
    const art = albumArt(album, coverVariantOf(covers, album.id));
    return {
        albumId,
        albumTitle: album.title,
        tracks: playableTracks(album.tracks).map((track) => ({
            id: track.id,
            title: track.title,
            url: mediaUrl(document.mediaBase, track.audio ?? ''),
        })),
        artwork: [
            ...artworkItem(document.imageBase, art.thumb, ARTWORK_SIZE.thumb),
            ...artworkItem(document.imageBase, art.cover, ARTWORK_SIZE.cover),
        ],
    };
};
