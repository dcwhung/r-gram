/*
 * Favourites 碟係虛擬專輯（Technical Spec 實現注意事項 6；Functional Spec US-013、D19、§CR-002「Favourites」）：
 * 由本機收藏砌出一個同真專輯同型別嘅物件（id = 保留字 `favourites`），轉盤、歌單欄、弧線歌單、隊列全部當普通專輯用。
 * 歌按收藏先後排、歌號 = 收藏次序；catalog 搵唔到嘅收藏（歌被刪咗）唔顯示，但照留喺本機（store 唔郁）。
 */
import {
    type CatalogAlbum,
    type CatalogDocument,
    type CatalogTrack,
    FAVOURITES_ALBUM_ID,
    glowColor,
} from '@r-gram/catalog';
import { findTrack } from '../catalog/selectors';
import { t } from '../i18n/t';
import type { FavouriteEntry } from './store';

/** 強調色：紅（Functional Spec §CR-002「Favourites」；設計稿 ALBUMS.favourites.accent） */
export const FAVOURITES_ACCENT = '#d7263d';

/**
 * 著燈色（設計稿 ALBUMS.favourites.glow = #fb3751）：設計稿定咗呢個值，唔由強調色計（計出嚟係 #f92441）。
 * 左上心形、播放模式掣光圈、旋鈕 ♥、細唱片機一律用佢（S-253）
 */
export const FAVOURITES_GLOW = 'hsl(352 96% 60%)';

/** 一隻碟嘅著燈色：Favourites 碟用設計稿嘅值，真專輯由專輯色計 */
export const discGlow = (albumId: string | null, accent: string): string =>
    albumId === FAVOURITES_ALBUM_ID ? FAVOURITES_GLOW : glowColor(accent);

/** 字母盤嘅標記：心形（字母盤唔畫佢，由旋鈕旁邊嘅 ♥ 負責） */
export const FAVOURITES_WHEEL_KEY = '♥';

/** 類別同序號只係為咗同真專輯同型別：播放端唔顯示（Favourites 碟唔經 validator） */
const VIRTUAL_CATEGORY = 'album';
const VIRTUAL_CATEGORY_NO = 1;

/** 收藏咗而 catalog 仲有嘅歌，按收藏次序，歌號 = 次序（由 1 起） */
const favouriteTracks = (
    document: CatalogDocument,
    entries: readonly FavouriteEntry[],
): CatalogTrack[] =>
    entries
        .flatMap(({ trackId }) => {
            const found = findTrack(document, trackId);
            return found && found.album.id !== FAVOURITES_ALBUM_ID ? [found.track] : [];
        })
        .map((track, index) => ({ ...track, no: index + 1 }));

export const favouritesAlbum = (
    document: CatalogDocument,
    entries: readonly FavouriteEntry[],
): CatalogAlbum => ({
    id: FAVOURITES_ALBUM_ID,
    title: t('favourites.title'),
    wheelKey: FAVOURITES_WHEEL_KEY,
    year: null,
    category: VIRTUAL_CATEGORY,
    categoryNo: VIRTUAL_CATEGORY_NO,
    accent: FAVOURITES_ACCENT,
    cover: null,
    thumb: null,
    tracks: favouriteTracks(document, entries),
});

/**
 * 主頁用嘅 document：真專輯（次序不變）+ 最尾一隻 Favourites 碟。`findTrack()` 先搵真專輯，
 * 所以一首收藏嘅歌照搵到佢原本嗰隻碟；`dialAlbums()` 唔包 Favourites 碟（♥ 由轉盤自己加）
 */
export const withFavourites = (
    document: CatalogDocument,
    entries: readonly FavouriteEntry[],
): CatalogDocument => {
    const albums = document.albums.filter((album) => album.id !== FAVOURITES_ALBUM_ID);
    const base = { ...document, albums };
    return { ...base, albums: [...albums, favouritesAlbum(base, entries)] };
};

/**
 * 喺 Favourites 碟取消收藏播緊嘅歌（US-013）：首歌播完先由歌單消失，所以佢喺播嗰陣照排返喺原本收藏時間嘅位置。
 * 仲係收藏（或者冇）= 唔變
 */
export const withKept = (
    entries: readonly FavouriteEntry[],
    kept: FavouriteEntry | null,
): readonly FavouriteEntry[] => {
    if (!kept || entries.some((entry) => entry.trackId === kept.trackId)) return entries;
    const at = entries.findIndex((entry) => entry.addedAt > kept.addedAt);
    return at === -1 ? [...entries, kept] : [...entries.slice(0, at), kept, ...entries.slice(at)];
};
