/*
 * API-035 嘅 D1 寫入（parameterised；欄位名只嚟自常數）。條件寫入：連結仲係確認嗰個先清（唔係 = 冇改到 → STALE）。
 * 清音檔 = 連 MV、`.txt`、credit、歌詞一齊清（冇音檔就冇 MV、歌曲文字，D54）；清 `.txt` = credit、歌詞一齊清；
 * 清第一張封面 = 第二張都清、專輯色返中性灰（D1 CHECK：冇第一張唔可以有第二張）。刪專輯、刪歌連歌詞一齊刪
 * （明寫，唔靠 foreign key cascade）。歌詞 JSON 檔名回畀 route，等 catalog 生成成功先刪（W-021）
 */
import { NEUTRAL_ACCENT, type CoverKind } from '@r-gram/catalog';
import { nextUpdatedAt } from '../lib/updatedAt';

export interface RemovalTrack {
    id: string;
    album_id: string;
    no: number;
    audio_key: string | null;
    mv_key: string | null;
    text_key: string | null;
    updated_at: string;
    folder: string;
    json_name: string | null;
}

export const findRemovalTrack = (db: D1Database, id: string) =>
    db
        .prepare(
            `SELECT t.id, t.album_id, t."no", t.audio_key, t.mv_key, t.text_key, t.updated_at,
                 a.folder, l.json_name
             FROM tracks t JOIN albums a ON a.id = t.album_id
             LEFT JOIN lyrics l ON l.track_id = t.id
             WHERE t.id = ?`,
        )
        .bind(id)
        .first<RemovalTrack>();

const LYRICS_OF_ALBUM = `SELECT l.json_name FROM lyrics l JOIN tracks t ON t.id = l.track_id WHERE t.album_id = ?`;

/** 回歌詞檔名（刪完冇人用就清） */
export const deleteAlbum = async (db: D1Database, id: string): Promise<string[]> => {
    const names = await db.prepare(LYRICS_OF_ALBUM).bind(id).all<{ json_name: string }>();
    await db.batch([
        db
            .prepare(
                'DELETE FROM lyrics WHERE track_id IN (SELECT id FROM tracks WHERE album_id = ?)',
            )
            .bind(id),
        db.prepare('DELETE FROM tracks WHERE album_id = ?').bind(id),
        db.prepare('DELETE FROM albums WHERE id = ?').bind(id),
    ]);
    return names.results.map(({ json_name }) => json_name);
};

export const deleteTrack = async (db: D1Database, id: string): Promise<void> => {
    await db.batch([
        db.prepare('DELETE FROM lyrics WHERE track_id = ?').bind(id),
        db.prepare('DELETE FROM tracks WHERE id = ?').bind(id),
    ]);
};

export type TrackFileKind = 'audio' | 'mv' | 'text';

const TEXT_COLUMNS =
    'text_key = NULL, text_source_etag = NULL, composer = NULL, lyricist = NULL, arranger = NULL, producer = NULL';

/** 每類：清乜、按邊個欄對 key、要唔要一齊刪歌詞 */
const CLEARS: Readonly<Record<TrackFileKind, { set: string; column: string; lyrics: boolean }>> = {
    audio: {
        set: `audio_key = NULL, mv_key = NULL, ${TEXT_COLUMNS}`,
        column: 'audio_key',
        lyrics: true,
    },
    mv: { set: 'mv_key = NULL', column: 'mv_key', lyrics: false },
    text: { set: TEXT_COLUMNS, column: 'text_key', lyrics: true },
};

/** 有冇清到（連結唔係 `key` = 冇） */
export const clearTrackFile = async (
    db: D1Database,
    track: Pick<RemovalTrack, 'id' | 'updated_at'>,
    kind: TrackFileKind,
    key: string,
): Promise<boolean> => {
    const { set, column, lyrics } = CLEARS[kind];
    const update = db
        .prepare(`UPDATE tracks SET ${set}, updated_at = ?1 WHERE id = ?2 AND ${column} = ?3`)
        .bind(nextUpdatedAt(track.updated_at), track.id, key);
    const dropLyrics = db
        .prepare('DELETE FROM lyrics WHERE track_id = ? AND changes() > 0')
        .bind(track.id);
    const [result] = await db.batch(lyrics ? [update, dropLyrics] : [update]);
    return (result?.meta.changes ?? 0) > 0;
};

const COVER_CLEARS: Readonly<Record<CoverKind, { set: string; has: string }>> = {
    cover: {
        set: `cover = NULL, thumb = NULL, cover_source_etag = NULL, cover2 = NULL, thumb2 = NULL,
              cover2_source_etag = NULL, accent = ?1`,
        has: 'cover IS NOT NULL OR cover_source_etag IS NOT NULL',
    },
    cover2: {
        // ?1（專輯色）唔用：SQLite 嘅參數數目 = 最大嘅編號，多綁一個冇問題
        set: 'cover2 = NULL, thumb2 = NULL, cover2_source_etag = NULL',
        has: 'cover2 IS NOT NULL OR cover2_source_etag IS NOT NULL',
    },
};

export const clearCover = async (
    db: D1Database,
    albumId: string,
    slot: CoverKind,
): Promise<boolean> => {
    const { set, has } = COVER_CLEARS[slot];
    const result = await db
        .prepare(`UPDATE albums SET ${set}, updated_at = ?2 WHERE id = ?3 AND (${has})`)
        .bind(NEUTRAL_ACCENT, new Date().toISOString(), albumId)
        .run();
    return result.meta.changes > 0;
};
