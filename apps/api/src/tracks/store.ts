/*
 * tracks / lyrics 表嘅讀寫（全部 parameterised；欄位名只會嚟自常數）。
 * 並發：
 * - 改單一首歌用 `WHERE updated_at = If-Match` 一句完成；歌詞嘅寫入同一個 batch（transaction），
 *   用 `changes() > 0` 跟住上一句：歌冇改到，歌詞都唔會郁
 * - 歌號跟檔名、可以跳號（CR-006，Functional Spec D60）：新增同改歌號都係明確嘅值，刪歌唔重編。
 *   同碟撞號由 D1 UNIQUE (album_id, no) 擋，寫入一方按 isNumberTaken() 回 409
 */
import { CREDIT_FIELDS, TRACK_NO_MIN, type SongText } from '@r-gram/catalog';
import { nextUpdatedAt } from '../lib/updatedAt';
import { MEDIA_FIELDS, type TrackField } from './fieldRules';
import { TRACK_RETURNING, type TrackRow } from './rows';
import type { StoredLyrics } from './songText';
import type { TrackFields } from './validate';

/** API-040 / 041 / 022 要用嘅欄：歌曲文字嘅欄位 + 歌詞原文同檔名 */
export interface TrackTextRow extends Record<(typeof CREDIT_FIELDS)[number], string | null> {
    id: string;
    album_id: string;
    title: string;
    subtitle: string | null;
    updated_at: string;
    source: string | null;
    json_name: string | null;
    line_count: number | null;
}

export const findTrackText = (db: D1Database, id: string) =>
    db
        .prepare(
            `SELECT t.album_id, t.id, t.title, t.subtitle, t.composer, t.lyricist, t.arranger,
                 t.producer, t.updated_at, l.source, l.json_name, l.line_count
             FROM tracks t LEFT JOIN lyrics l ON l.track_id = t.id
             WHERE t.id = ?`,
        )
        .bind(id)
        .first<TrackTextRow>();

/** 冇其他歌嘅歌詞用緊呢個檔（同一段歌詞 = 同一個 hash 檔名） */
export const isLyricsFileUsed = async (db: D1Database, jsonName: string) =>
    (await db
        .prepare('SELECT 1 FROM lyrics WHERE json_name = ? LIMIT 1')
        .bind(jsonName)
        .first()) !== null;

const creditValues = (song: SongText) =>
    CREDIT_FIELDS.map((field) => song.credits?.[field] ?? null);

/** 上一句有寫到先寫歌詞（冇歌詞就刪走嗰行） */
const lyricsWrite = (db: D1Database, trackId: string, lyrics: StoredLyrics | null, at: string) =>
    lyrics
        ? db
              .prepare(
                  `INSERT INTO lyrics (track_id, source, synced, json_name, line_count, updated_at)
                   SELECT ?1, ?2, ?3, ?4, ?5, ?6 WHERE changes() > 0
                   ON CONFLICT (track_id) DO UPDATE SET source = excluded.source,
                       synced = excluded.synced, json_name = excluded.json_name,
                       line_count = excluded.line_count, updated_at = excluded.updated_at`,
              )
              .bind(
                  trackId,
                  lyrics.source,
                  lyrics.synced ? 1 : 0,
                  lyrics.jsonName,
                  lyrics.lineCount,
                  at,
              )
        : db.prepare('DELETE FROM lyrics WHERE track_id = ? AND changes() > 0').bind(trackId);

/** RETURNING 嘅歌詞狀態係寫歌詞之前嘅；用今次寫入嘅值 */
const withLyrics = (row: TrackRow, lyrics: StoredLyrics | null): TrackRow => ({
    ...row,
    synced: lyrics ? Number(lyrics.synced) : null,
    line_count: lyrics ? lyrics.lineCount : null,
});

const UNIQUE_VIOLATION = 'UNIQUE constraint failed';
/** SQLite 講明撞咗邊個 index 嘅欄：(album_id, no) 係 `tracks.album_id, tracks.no` */
const NUMBER_COLUMN = 'tracks.no';
const ID_COLUMN = 'tracks.id';

const violates = (error: unknown, column: string): boolean =>
    error instanceof Error &&
    error.message.includes(UNIQUE_VIOLATION) &&
    error.message.includes(column);

/** 同碟已有歌用呢個歌號 */
export const isNumberTaken = (error: unknown): boolean => violates(error, NUMBER_COLUMN);
/** 歌 id 已經有人用（PK） */
export const isIdTaken = (error: unknown): boolean => violates(error, ID_COLUMN);

/** API-020 冇畀歌號時用：而家最大歌號 + 1（冇歌 = 1） */
export const nextTrackNo = async (db: D1Database, albumId: string): Promise<number> =>
    (await db
        .prepare('SELECT COALESCE(MAX("no"), 0) + 1 AS next FROM tracks WHERE album_id = ?')
        .bind(albumId)
        .first<number>('next')) ?? TRACK_NO_MIN;

/** API-020：新增一首歌；冇呢張碟 → null。id 或者歌號撞咗會 throw（isIdTaken / isNumberTaken） */
export const insertTrack = async (
    db: D1Database,
    ids: { id: string; albumId: string; no: number },
    song: SongText,
    lyrics: StoredLyrics | null,
): Promise<TrackRow | null> => {
    const now = new Date().toISOString();
    const insert = db
        .prepare(
            `INSERT INTO tracks (id, album_id, "no", title, subtitle,
                 composer, lyricist, arranger, producer, created_at, updated_at)
             SELECT ?1, a.id, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10
             FROM albums a WHERE a.id = ?2
             RETURNING ${TRACK_RETURNING}`,
        )
        .bind(ids.id, ids.albumId, ids.no, song.title, song.subtitle, ...creditValues(song), now);
    const statements = lyrics ? [insert, lyricsWrite(db, ids.id, lyrics, now)] : [insert];
    const [inserted] = await db.batch<TrackRow>(statements);
    const row = inserted?.results[0];
    return row ? withLyrics(row, lyrics) : null;
};

/** API-041：歌名、副題、credit + 歌詞一個 batch；If-Match 過時或者冇呢首歌 → null */
export const saveSongText = async (
    db: D1Database,
    id: string,
    expected: string,
    song: SongText,
    lyrics: StoredLyrics | null,
): Promise<TrackRow | null> => {
    const updatedAt = nextUpdatedAt(expected);
    const update = db
        .prepare(
            `UPDATE tracks SET title = ?1, subtitle = ?2, composer = ?3, lyricist = ?4,
                 arranger = ?5, producer = ?6, updated_at = ?7
             WHERE id = ?8 AND updated_at = ?9
             RETURNING ${TRACK_RETURNING}`,
        )
        .bind(song.title, song.subtitle, ...creditValues(song), updatedAt, id, expected);
    const [updated] = await db.batch<TrackRow>([update, lyricsWrite(db, id, lyrics, updatedAt)]);
    const row = updated?.results[0];
    return row ? withLyrics(row, lyrics) : null;
};

const COLUMN_OF: Record<TrackField, string> = {
    no: '"no"',
    lyricsSourceUrl: 'lyrics_source_url',
    note: 'note',
    audio: 'audio_key',
    mv: 'mv_key',
};

/** SET 子句：手動指定檔案連「手動」旗一齊改（有 key = 1；清走 = 0，掃描可以再填） */
const assignments = (fields: TrackFields): { sql: string[]; values: unknown[] } => {
    const keys = Object.keys(fields) as TrackField[];
    const sql = keys.map((key) => `${COLUMN_OF[key]} = ?`);
    const values = keys.map((key) => fields[key]);
    MEDIA_FIELDS.filter((key) => key in fields).forEach((key) => {
        sql.push(`${key}_manual = ?`);
        values.push(fields[key] === null ? 0 : 1);
    });
    return { sql, values };
};

/** API-021：只喺 updated_at 仲係 `expected` 時改，RETURNING 同一句回改好嘅行；改唔到 → null。撞歌號會 throw */
export const updateTrackFields = (
    db: D1Database,
    id: string,
    fields: TrackFields,
    expected: string,
): Promise<TrackRow | null> => {
    const { sql, values } = assignments(fields);
    return db
        .prepare(
            `UPDATE tracks SET ${[...sql, 'updated_at = ?'].join(', ')}
             WHERE id = ? AND updated_at = ?
             RETURNING ${TRACK_RETURNING}`,
        )
        .bind(...values, nextUpdatedAt(expected), id, expected)
        .first<TrackRow>();
};

/** API-022：刪歌（歌詞 ON DELETE CASCADE）；其他歌嘅歌號唔郁（D60）。已經唔存在 → false */
export const deleteTrack = async (db: D1Database, id: string) => {
    const deleted = await db.prepare('DELETE FROM tracks WHERE id = ?').bind(id).run();
    return deleted.meta.changes > 0;
};
