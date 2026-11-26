/*
 * 轉碟要嘅衍生值（純函數）：刻度每格一隻碟（catalog 次序 = 管理端次序，D47），最尾一格 ♥（Favourites 碟）。
 * Technical Spec「刻度同字母盤」：格數 = 專輯數 + 1，唔寫死。
 */
import {
    type CatalogAlbum,
    type CatalogDocument,
    FAVOURITES_ALBUM_ID,
    mediaUrl,
    NEUTRAL_ACCENT,
} from '@r-gram/catalog';
import { coverVariantOf, type CoverVariants, NO_COVER_PICKS } from '../catalog/coverVariants';
import { albumArt, dialAlbums } from '../catalog/selectors';
import { t } from '../i18n/t';
import type { StageState } from './stageReducer';

/** ♥ 格嘅標記（字母盤唔畫佢：由旋鈕旁邊嘅 ♥ 負責） */
export const HEART_KEY = '♥';

export interface DialEntry {
    albumId: string;
    /** 字母盤標記（內容資料 `wheelKey`；♥ 格係 HEART_KEY） */
    key: string;
    /** 畀讀屏：旋鈕嘅 aria-valuetext */
    title: string;
    accent: string;
    /** 揀中嗰張大封面同佢嘅縮圖（CR-005 D56）；冇 = null */
    coverUrl: string | null;
    thumbUrl: string | null;
}

export interface DialView {
    entries: readonly DialEntry[];
    /** 指針指住邊格（顯示嘅碟） */
    current: number;
    /** 字母盤打開緊（揀緊碟） */
    open: boolean;
}

const albumEntry = (
    document: CatalogDocument,
    album: CatalogAlbum,
    covers: CoverVariants,
): DialEntry => {
    const art = albumArt(album, coverVariantOf(covers, album.id));
    const url = (file: string | null) => (file ? mediaUrl(document.imageBase, file) : null);
    return {
        albumId: album.id,
        key: album.wheelKey,
        title: album.title,
        accent: album.accent,
        coverUrl: url(art.cover),
        thumbUrl: url(art.thumb),
    };
};

/** Favourites 碟嘅樣（碟面、強調色）係 T-070；未有之前用中性色、冇封面 */
const heartEntry = (): DialEntry => ({
    albumId: FAVOURITES_ALBUM_ID,
    key: HEART_KEY,
    title: t('favourites.title'),
    accent: NEUTRAL_ACCENT,
    coverUrl: null,
    thumbUrl: null,
});

export const dialView = (
    document: CatalogDocument,
    stage: StageState,
    covers: CoverVariants = NO_COVER_PICKS,
): DialView => {
    const entries = [
        ...dialAlbums(document).map((album) => albumEntry(document, album, covers)),
        heartEntry(),
    ];
    const current = entries.findIndex((entry) => entry.albumId === stage.viewAlbumId);
    return { entries, current: Math.max(current, 0), open: stage.scene === 'discChange' };
};
