/*
 * 由 catalog 砌出電視要嘅 MV（純函數）：網址（逐段 encode，`mediaUrl`）、歌名、鎖屏（歌名 + 「MV」、碟名、封面）。
 * Favourites 碟（T-070）：MV 屬於首歌，網址同佢原本嗰隻碟一樣；鎖屏顯示首歌原本嗰隻碟同封面（同唱片一致）。
 */
import { type CatalogDocument, type CatalogTrack, mediaUrl } from '@r-gram/catalog';
import type { CoverVariants } from '../catalog/coverVariants';
import { t } from '../i18n/t';
import type { MvTrack } from '../mv/mvController';
import { playbackSource } from '../playback/playbackSource';

/** 冇 MV 檔 = null（MV 掣停用，C5） */
export const mvTrackOf = (
    document: CatalogDocument,
    covers: CoverVariants,
    albumId: string,
    track: CatalogTrack,
): MvTrack | null => {
    if (!track.mv) return null;
    const source = playbackSource(document, albumId, covers);
    const origin = source?.tracks.find((candidate) => candidate.id === track.id)?.album;
    return {
        id: track.id,
        title: track.title,
        url: mediaUrl(document.mediaBase, track.mv),
        nowPlaying: {
            title: t('mv.sessionTitle', { title: track.title }),
            album: origin?.title ?? source?.albumTitle ?? '',
            artwork: origin?.artwork ?? source?.artwork ?? [],
        },
    };
};
