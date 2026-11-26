/*
 * @r-gram/catalog public API：內容資料嘅純邏輯（catalog 型別同驗證、LRC、歌曲文字、`info.txt`、資料夾名、檢查結果、掃描配對、字母盤標記、顏色、初始資料）。
 * 唔掂 DOM、唔用 Vite / Worker API；播放端、管理端、Backend 共用，保證「管理端驗得過 = 播放端讀得到」。
 */
export { formatAlbumInfo } from './album-info/formatAlbumInfo';
export { INFO_TEXT_MAX_BYTES, INFO_TEXT_MAX_LINES } from './album-info/limits';
export { parseAlbumInfo } from './album-info/parseAlbumInfo';
export type { AlbumInfo, AlbumInfoFields, AlbumInfoTrack } from './album-info/types';
export { dominantColor, glowColor, NEUTRAL_ACCENT, NEUTRAL_GLOW } from './color/color';
export {
    parseLrc,
    toLyricsJson,
    type LrcError,
    type LrcErrorCode,
    type LrcResult,
    type LyricLine,
    type LyricsJson,
    type PlainLyricLine,
} from './lrc/parseLrc';
export {
    classifyFile,
    fileNameOf,
    trackNoOf,
    type CoverKind,
    type FileClass,
    type NumberedKind,
    type UnmatchedReason,
} from './scan/classifyFile';
export { planScan } from './scan/planScan';
export type { ScanFile } from './scan/scanFiles';
export type {
    CoverSource,
    FileChange,
    MatchedMedia,
    MediaKind,
    NewTrackPlan,
    ScanAlbumState,
    ScanConflict,
    ScanInput,
    ScanPlan,
    ScanTrackState,
    SkippedFile,
    SkipReason,
    TextCandidate,
    TextSource,
} from './scan/scanTypes';
export { songTextChange, type SongTextComparison, type TextChange } from './scan/songTextChange';
export { titleFromFileName } from './scan/titleFromFileName';
export {
    FAVOURITES_ALBUM_ID,
    isAlbumId,
    isTrackId,
    isTrackNo,
    TRACK_NO_MAX,
    TRACK_NO_MIN,
    trackIdFor,
} from './schema/ids';
export type { CatalogError, CatalogErrorCode } from './schema/issues';
export { mediaUrl } from './schema/mediaUrl';
export {
    albumOrder,
    expectedFolder,
    isReleaseCategory,
    parseAlbumFolder,
    RELEASE_CATEGORIES,
    type AlbumFolder,
    type ReleaseCategory,
} from './schema/releaseCategory';
export { parseCatalogDocument, type CatalogParseResult } from './schema/parseCatalogDocument';
export { isAlbumYear, YEAR_MAX, YEAR_MIN } from './schema/year';
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
export {
    planAlbumSeed,
    type AlbumSeedPlan,
    type ExistingAlbum,
    type OrdinalTaken,
} from './seed/planAlbumSeed';
export { seedToCatalog, type SeedCatalogOptions } from './seed/seedToCatalog';
export type {
    SeedAlbum,
    SeedCreditAlbum,
    SeedCreditTrack,
    SeedCredits,
    SeedDiscography,
    SeedTrack,
} from './seed/types';
export { formatSongText } from './song-text/formatSongText';
export { labelLinesAfterGap } from './song-text/labelHints';
export {
    CREDIT_MAX_CHARS,
    LYRIC_LINE_MAX_CHARS,
    SONG_TEXT_MAX_BYTES,
    SONG_TEXT_MAX_LINES,
    TITLE_MAX_CHARS,
} from './song-text/limits';
export { parseSongText, songOf } from './song-text/parseSongText';
export type {
    SongLyrics,
    SongText,
    SongTextError,
    SongTextErrorCode,
    SongTextFields,
    SongTextHint,
    SongTextHintCode,
    SongTextResult,
} from './song-text/types';
export { CHECK_LEVELS, checkOf, type Check, type CheckCode, type CheckLevel } from './sync/checks';
export { titleKey } from './sync/titleKey';
export { WHEEL_KEY_FALLBACK, wheelKeyFor } from './wheel/wheelKeyFor';
