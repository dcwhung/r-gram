/*
 * @r-gram/catalog public API：內容資料嘅純邏輯（catalog 型別同驗證、LRC、掃描配對、字母盤標記、顏色、初始資料）。
 * 唔掂 DOM、唔用 Vite / Worker API；播放端、管理端、Backend 共用，保證「管理端驗得過 = 播放端讀得到」。
 */
export { dominantColor, glowColor, NEUTRAL_ACCENT, NEUTRAL_GLOW } from './color/color';
export {
    parseLrc,
    toLyricsJson,
    type LrcError,
    type LrcErrorCode,
    type LrcResult,
    type LyricLine,
    type LyricsJson,
} from './lrc/parseLrc';
export {
    matchMediaFiles,
    type MatchedFile,
    type MediaKind,
    type ScanResult,
    type ScanTrack,
    type UnmatchedReason,
} from './scan/matchMediaFiles';
export { FAVOURITES_ALBUM_ID, isAlbumId, isTrackId } from './schema/ids';
export type { CatalogError, CatalogErrorCode } from './schema/issues';
export { mediaUrl } from './schema/mediaUrl';
export { parseCatalogDocument, type CatalogParseResult } from './schema/parseCatalogDocument';
export {
    CATALOG_VERSION,
    CREDIT_FIELDS,
    type CatalogAlbum,
    type CatalogDocument,
    type CatalogTrack,
    type CreditField,
    type TrackCredits,
} from './schema/types';
export { matchCredits, type CreditMatchResult, type MatchedCredits } from './seed/matchCredits';
export { seedToCatalog, type SeedCatalogOptions } from './seed/seedToCatalog';
export { trackIdFor } from './seed/trackId';
export type {
    SeedAlbum,
    SeedCreditAlbum,
    SeedCreditTrack,
    SeedCredits,
    SeedDiscography,
    SeedTrack,
} from './seed/types';
export { WHEEL_KEY_FALLBACK, wheelKeyFor } from './wheel/wheelKeyFor';
