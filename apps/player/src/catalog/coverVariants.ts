/*
 * 兩張封面嘅專輯每次開 app 隨機揀一張（Functional Spec D56、FR-042；Technical Spec「播放端隨機封面」）。
 * 揀咗就放記憶體（useCoverVariants），唔寫本機儲存；純函數，隨機數由外面注入（測試用固定值）。
 */
import type { CatalogAlbum } from '@r-gram/catalog';

export const COVER_VARIANT = { FIRST: 0, SECOND: 1 } as const;
export type CoverVariant = (typeof COVER_VARIANT)[keyof typeof COVER_VARIANT];

/** 專輯 id → 揀中邊張 */
export type CoverVariants = ReadonlyMap<string, CoverVariant>;

/** `random()` 細過呢個數揀第一張，否則第二張（兩張機會一樣） */
const FIRST_COVER_CHANCE = 0.5;

export const NO_COVER_PICKS: CoverVariants = new Map();

/** 第二張封面成對先算（validator 已保證；冇縮圖嘅半套唔用） */
export const hasSecondCover = (album: CatalogAlbum): boolean =>
    Boolean(album.cover2 && album.thumb2);

const pickFor = (album: CatalogAlbum, random: () => number): CoverVariant => {
    if (!hasSecondCover(album)) return COVER_VARIANT.FIRST;
    return random() < FIRST_COVER_CHANCE ? COVER_VARIANT.FIRST : COVER_VARIANT.SECOND;
};

/**
 * 每張專輯揀一張。`previous` = 今次開 app 之前已經揀咗嘅（catalog 更新時）：已有嘅照舊，
 * 包括之後先加第二張封面嘅舊專輯（照用第一張，下次開 app 先揀）；新專輯先揀；已刪嘅專輯唔留。
 */
export const pickCoverVariants = (
    albums: readonly CatalogAlbum[],
    random: () => number,
    previous: CoverVariants = NO_COVER_PICKS,
): CoverVariants =>
    new Map(albums.map((album) => [album.id, previous.get(album.id) ?? pickFor(album, random)]));

/** 未揀過（例如 Favourites 碟、未有 catalog）= 第一張 */
export const coverVariantOf = (covers: CoverVariants, albumId: string): CoverVariant =>
    covers.get(albumId) ?? COVER_VARIANT.FIRST;
