/*
 * 碟名下面嘅歌單欄要嘅值（純函數；Functional Spec FR-044、D11、D39、D60、D70；設計稿第 19 版 trackPanel()、
 * showsColumn()；backlog B-086）。字母盤開住或者顯示緊嘅碟未揀歌先有（holding.ts showsColumn）；
 * 列出顯示嘅碟全部歌（冇音檔 = 灰色）；純睇，行唔㩒得。
 */
import {
    type CatalogTrack,
    type CatalogDocument,
    FAVOURITES_ALBUM_ID,
    NEUTRAL_ACCENT,
} from '@r-gram/catalog';
import { albumTracks, findAlbum, isPlayable } from '../catalog/selectors';
import { t } from '../i18n/t';
import { showsColumn } from './holding';
import type { PlaybackState } from '../playback/playbackState';
import type { StageState } from './stageReducer';

/** 歌號最少兩位（設計稿 `padStart(2, '0')`） */
const NUMBER_DIGITS = 2;

/** 歌單一行（歌單欄、弧線歌單共用） */
export interface TrackRow {
    id: string;
    /** 真正嘅歌號（`track.no`，可以跳號，D60） */
    no: number;
    /** 顯示嘅歌號（兩位） */
    number: string;
    title: string;
    /** 有音檔先播得；冇 = 灰色 */
    playable: boolean;
}

/** 歌單欄嘅行（同弧線歌單嘅行一樣） */
export type HeldTrackRow = TrackRow;

export interface TrackColumnView {
    albumId: string;
    /** 歌號同位置條用專輯色 */
    accent: string;
    rows: readonly HeldTrackRow[];
    /** 冇歌時欄入面嗰行灰字（Favourites 碟有自己一句） */
    emptyText: string;
    /** 旋鈕開住：欄底較低（字母盤開住冇細掣） */
    dialOpen: boolean;
}

export const trackRow = (track: CatalogTrack): TrackRow => ({
    id: track.id,
    no: track.no,
    number: String(track.no).padStart(NUMBER_DIGITS, '0'),
    title: track.title,
    playable: isPlayable(track),
});

/** 收藏（T-070）未有之前，Favourites 碟冇歌：`albumTracks()` 搵唔到就係空 */
export const trackColumnView = (
    document: CatalogDocument,
    stage: StageState,
    playback: PlaybackState,
): TrackColumnView | null => {
    const albumId = stage.viewAlbumId;
    if (!showsColumn(stage, playback) || !albumId) return null;
    const dialOpen = stage.scene === 'discChange';
    const favourites = albumId === FAVOURITES_ALBUM_ID;
    return {
        albumId,
        accent: findAlbum(document, albumId)?.accent ?? NEUTRAL_ACCENT,
        rows: albumTracks(document, albumId).map(trackRow),
        emptyText: t(favourites ? 'favourites.empty' : 'list.empty'),
        dialOpen,
    };
};
