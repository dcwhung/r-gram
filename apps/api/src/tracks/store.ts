/*
 * tracks / lyrics 表嘅讀寫（全部 parameterised；欄位名只會嚟自常數）。
 * 並發：
 * - 改單一首歌用 `WHERE updated_at = If-Match` 一句完成；歌詞嘅寫入同一個 batch（transaction），
 *   用 `changes() > 0` 跟住上一句：歌冇改到，歌詞都唔會郁
 * - 同碟撞號由 D1 UNIQUE (album_id, no) 擋，寫入一方按 isNumberTaken() 判斷（同步建立歌曲，T-105）
 * CR-007（D71）：冇副題、手動指定、參考欄；人手新增、改、刪歌（API-020、021、022）拎走
 */
import { CREDIT_FIELDS, type SongText } from '@r-gram/catalog';
import { nextUpdatedAt } from '../lib/updatedAt';
import { TRACK_RETURNING, type TrackRow } from './rows';
import type { StoredLyrics } from './songText';

/** API-040 / 041 要用嘅欄：歌曲文字嘅欄位 + 歌詞原文同檔名 */
export interface TrackTextRow extends Record<(typeof CREDIT_FIELDS)[number], string | null> {
    id: string;
    album_id: string;
    title: string;
    updated_at: string;
    source: string | null;
    json_name: string | null;
    line_count: number | null;
}

export const findTrackText = (db: D1Database, id: string) =>
    db
        .prepare(
            `SELECT t.album_id, t.id, t.title, t.composer, t.lyricist, t.arranger,
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

/** 上一句有寫到先寫歌詞（冇歌詞就刪走嗰行）；同步（sync/trackStore.ts）都用 */
export const lyricsWrite = (
    db: D1Database,
    trackId: string,
    lyrics: StoredLyrics | null,
    at: string,
) =>
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

/** 新歌連埋嘅檔（同步建立歌曲，T-105） */
export interface TrackFiles {
    audioKey: string | null;
    mvKey: string | null;
    /** 嗰首歌嘅 `.txt` key（內容有錯都記，文字框要開得返） */
    textKey: string | null;
    /** 匯入咗嘅 `.txt` 嘅 ETag（Technical Spec「tracks.text_source_etag」） */
    textSourceEtag: string | null;
}

export const NO_FILES: TrackFiles = {
    audioKey: null,
    mvKey: null,
    textKey: null,
    textSourceEtag: null,
};

const INSERT_SQL = `
    INSERT INTO tracks (id, album_id, "no", title, composer, lyricist, arranger,
        producer, audio_key, mv_key, text_source_etag, text_key, created_at, updated_at)
    SELECT ?1, a.id, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13
    FROM albums a WHERE a.id = ?2
    RETURNING ${TRACK_RETURNING}`;

interface TrackIds {
    id: string;
    albumId: string;
    no: number;
}

/** 同步建立歌曲（T-105）：新增一首歌；冇呢張碟 → null。id 或者歌號撞咗會 throw（isIdTaken / isNumberTaken） */
export const insertTrack = async (
    db: D1Database,
    ids: TrackIds,
    song: SongText,
    lyrics: StoredLyrics | null,
    files: TrackFiles = NO_FILES,
): Promise<TrackRow | null> => {
    const now = new Date().toISOString();
    const { audioKey, mvKey, textKey, textSourceEtag } = files;
    const { id, albumId, no } = ids;
    const songValues = [song.title, ...creditValues(song)];
    const fileValues = [audioKey, mvKey, textSourceEtag, textKey];
    const insert = db.prepare(INSERT_SQL).bind(id, albumId, no, ...songValues, ...fileValues, now);
    const statements = lyrics ? [insert, lyricsWrite(db, id, lyrics, now)] : [insert];
    const [inserted] = await db.batch<TrackRow>(statements);
    const row = inserted?.results[0];
    return row ? withLyrics(row, lyrics) : null;
};

/**
 * API-041：歌名、credit + 歌詞一個 batch；If-Match 過時或者冇呢首歌 → null。
 * `textSourceEtag`：畀咗就一齊記低；API-041 人手儲存唔改佢（T-106 改為寫返 bucket 再同步）
 */
export const saveSongText = async (
    db: D1Database,
    id: string,
    expected: string,
    song: SongText,
    lyrics: StoredLyrics | null,
    textSourceEtag?: string,
): Promise<TrackRow | null> => {
    const updatedAt = nextUpdatedAt(expected);
    const source = textSourceEtag === undefined ? [] : [textSourceEtag];
    const update = db
        .prepare(
            `UPDATE tracks SET title = ?1, composer = ?2, lyricist = ?3,
                 arranger = ?4, producer = ?5, updated_at = ?6
                 ${source.length > 0 ? ', text_source_etag = ?9' : ''}
             WHERE id = ?7 AND updated_at = ?8
             RETURNING ${TRACK_RETURNING}`,
        )
        .bind(song.title, ...creditValues(song), updatedAt, id, expected, ...source);
    const [updated] = await db.batch<TrackRow>([update, lyricsWrite(db, id, lyrics, updatedAt)]);
    const row = updated?.results[0];
    return row ? withLyrics(row, lyrics) : null;
};
