/*
 * 弧線歌單要嘅值（純函數；Functional Spec US-004、FR-005、D11、D39、D60；設計稿第 18 版 listLayer()）。
 * 歌單開住先有；列出顯示嘅碟全部歌（冇音檔 = 灰色、唔停得、㩒唔到），框入面係揀中嗰首（`selectedTrackId`）。
 * 拎住另一隻碟唔會開弧線歌單（reducer 嘅 openList 守衛），所以呢度唔使理 holding。
 */
import { type CatalogDocument, FAVOURITES_ALBUM_ID, NEUTRAL_ACCENT } from '@r-gram/catalog';
import { albumTracks, findAlbum } from '../catalog/selectors';
import { t } from '../i18n/t';
import { trackRow, type TrackRow } from './heldTracksView';
import type { StageState } from './stageReducer';

export interface ArcListView {
    albumId: string;
    /** 歌號用專輯色 */
    accent: string;
    rows: readonly TrackRow[];
    /** 框入面嗰行（揀中嗰首）；冇揀中 = 第一行 */
    focusIndex: number;
    /** 冇歌時框入面嗰句（Favourites 碟有自己一句） */
    emptyText: string;
}

export const listView = (document: CatalogDocument, stage: StageState): ArcListView | null => {
    const albumId = stage.viewAlbumId;
    if (stage.scene !== 'list' || !albumId) return null;
    const rows = albumTracks(document, albumId).map(trackRow);
    const focused = rows.findIndex((row) => row.id === stage.selectedTrackId);
    return {
        albumId,
        accent: findAlbum(document, albumId)?.accent ?? NEUTRAL_ACCENT,
        rows,
        focusIndex: Math.max(0, focused),
        emptyText: t(albumId === FAVOURITES_ALBUM_ID ? 'favourites.empty' : 'list.empty'),
    };
};
