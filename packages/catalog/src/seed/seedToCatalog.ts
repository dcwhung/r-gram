import { NEUTRAL_ACCENT } from '../color/color';
import {
    CATALOG_VERSION,
    type CatalogAlbum,
    type CatalogDocument,
    type CatalogTrack,
} from '../schema/types';
import { matchCredits, type CreditMatchResult } from './matchCredits';
import { trackIdFor } from '../schema/ids';
import type { SeedAlbum, SeedCredits, SeedDiscography, SeedTrack } from './types';

export interface SeedCatalogOptions {
    generatedAt: string;
    mediaBase: string;
    imageBase: string;
    lyricsBase: string;
    /** 專輯 id → 專輯色；冇就用中性灰 */
    accents?: Readonly<Record<string, string>>;
    /** 幫某首歌掛上媒體檔（開發 / 測試用嘅假媒體）；冇就全部係 null */
    mediaFor?: (albumId: string, track: SeedTrack) => { audio: string | null; mv: string | null };
}

const NO_MEDIA = { audio: null, mv: null };

const toTrack = (
    album: SeedAlbum,
    track: SeedTrack,
    credits: CreditMatchResult,
    options: SeedCatalogOptions,
): CatalogTrack => {
    const id = trackIdFor(album.id, track.no);
    return {
        id,
        no: track.no,
        title: track.title,
        subtitle: track.subtitle,
        credits: credits.byTrackId[id]?.credits ?? null,
        ...(options.mediaFor?.(album.id, track) ?? NO_MEDIA),
        lyrics: null,
    };
};

/** 只認 `accents` 自己嘅 key（專輯 id 撞正 `constructor` 之類嘅名都唔會讀到 prototype） */
const accentFor = (albumId: string, accents: SeedCatalogOptions['accents']): string =>
    accents && Object.hasOwn(accents, albumId)
        ? (accents[albumId] ?? NEUTRAL_ACCENT)
        : NEUTRAL_ACCENT;

const toAlbum = (
    album: SeedAlbum,
    credits: CreditMatchResult,
    options: SeedCatalogOptions,
): CatalogAlbum => ({
    id: album.id,
    title: album.title,
    wheelKey: album.wheelKey,
    year: album.year,
    category: album.category,
    categoryNo: album.categoryNo,
    label: album.label,
    accent: accentFor(album.id, options.accents),
    cover: null,
    thumb: null,
    tracks: album.tracks.map((track) => toTrack(album, track, credits, options)),
});

/**
 * 由初始資料直接砌一份 catalog 文件（唔經 Backend）：播放端開發同 E2E 用嘅 fixture。
 * 專輯次序跟 `order`；封面同歌詞係 null；媒體由 `mediaFor` 決定。
 */
export const seedToCatalog = (
    discography: SeedDiscography,
    credits: SeedCredits,
    options: SeedCatalogOptions,
): CatalogDocument => {
    const matched = matchCredits(discography, credits);
    const albums = [...discography.albums].sort((a, b) => a.order - b.order);
    return {
        version: CATALOG_VERSION,
        generatedAt: options.generatedAt,
        mediaBase: options.mediaBase,
        imageBase: options.imageBase,
        lyricsBase: options.lyricsBase,
        albums: albums.map((album) => toAlbum(album, matched, options)),
    };
};
