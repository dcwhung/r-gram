/* API-041 嘅成功回應，同 D1 欄 → formatSongText() 嘅輸入 */
import {
    CREDIT_FIELDS,
    formatSongText,
    type SongTextFields,
    type TrackCredits,
} from '@r-gram/catalog';
import { toTrack, type TrackRow } from './rows';
import type { ReadSong, StoredLyrics } from './songText';
import type { TrackTextRow } from './store';

/** formatSongText() 要嘅 D1 欄（tracks + lyrics.source） */
export type SongTextColumns = Pick<
    TrackTextRow,
    'title' | 'source' | (typeof CREDIT_FIELDS)[number]
>;

/** 四項 credit 都冇 = null（同 parseSongText() 一樣） */
const creditsOf = (row: SongTextColumns): TrackCredits | null =>
    CREDIT_FIELDS.some((field) => row[field] !== null)
        ? (Object.fromEntries(
              CREDIT_FIELDS.map((field) => [field, row[field]]),
          ) as unknown as TrackCredits)
        : null;

export const songFieldsOf = (row: SongTextColumns): SongTextFields => ({
    title: row.title,
    credits: creditsOf(row),
    lyrics: row.source === null ? null : { source: row.source },
});

/**
 * `text` = 正規化之後嘅文字（回填文字框）；`lineCount` / `synced` / `lyrics` 講歌詞（冇歌詞：0 / null / null）；
 * `track` = 同 API-012 一樣嘅歌曲物件（管理端唔使再讀就更新到歌曲行）；`hints` = 唔擋儲存嘅提示
 */
export const savedResponse = (row: TrackRow, read: ReadSong, lyrics: StoredLyrics | null) => ({
    trackId: row.id,
    text: formatSongText(read.song),
    lineCount: lyrics?.lineCount ?? 0,
    synced: lyrics?.synced ?? null,
    lyrics: lyrics?.jsonName ?? null,
    updatedAt: row.updated_at,
    track: toTrack(row),
    hints: read.hints,
});
