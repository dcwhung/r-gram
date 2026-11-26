/*
 * 拎住嘅碟嘅歌單欄要嘅值（純函數；Functional Spec FR-044、D11、D39、D57、D60、D70；設計稿第 18 版 trackPanel()）。
 * 拎住另一隻碟先有；列出顯示嘅碟全部歌（冇音檔 = 灰色、㩒唔到）；旋鈕開住時欄較短、行未㩒得。
 */
import {
    type CatalogTrack,
    type CatalogDocument,
    FAVOURITES_ALBUM_ID,
    NEUTRAL_ACCENT,
} from '@r-gram/catalog';
import { albumTracks, findAlbum, isPlayable } from '../catalog/selectors';
import { t } from '../i18n/t';
import type { StageState } from './stageReducer';

/** 歌號最少兩位（設計稿 `padStart(2, '0')`） */
const NUMBER_DIGITS = 2;

export interface HeldTrackRow {
    id: string;
    /** 真正嘅歌號（`track.no`，可以跳號，D60） */
    no: number;
    /** 顯示嘅歌號（兩位） */
    number: string;
    title: string;
    /** 有音檔先播得；冇 = 灰色、唔係掣 */
    playable: boolean;
}

export interface HeldTracksView {
    albumId: string;
    /** 歌號同位置條用專輯色 */
    accent: string;
    rows: readonly HeldTrackRow[];
    /** 冇歌時欄入面嗰行灰字（Favourites 碟有自己一句） */
    emptyText: string;
    /** 旋鈕開住：欄底較高（避開字母盤） */
    dialOpen: boolean;
    /** 鬆手之後先㩒得 */
    pressable: boolean;
}

const rowOf = (track: CatalogTrack): HeldTrackRow => ({
    id: track.id,
    no: track.no,
    number: String(track.no).padStart(NUMBER_DIGITS, '0'),
    title: track.title,
    playable: isPlayable(track),
});

/** 收藏（T-070）未有之前，Favourites 碟冇歌：`albumTracks()` 搵唔到就係空 */
export const heldTracksView = (
    document: CatalogDocument,
    stage: StageState,
    holding: boolean,
): HeldTracksView | null => {
    const albumId = stage.viewAlbumId;
    if (!holding || !albumId) return null;
    const dialOpen = stage.scene === 'discChange';
    const favourites = albumId === FAVOURITES_ALBUM_ID;
    return {
        albumId,
        accent: findAlbum(document, albumId)?.accent ?? NEUTRAL_ACCENT,
        rows: albumTracks(document, albumId).map(rowOf),
        emptyText: t(favourites ? 'favourites.empty' : 'list.empty'),
        dialOpen,
        pressable: !dialOpen,
    };
};
