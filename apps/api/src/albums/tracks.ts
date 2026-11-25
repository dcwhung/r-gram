/*
 * API-012 專輯頁嘅歌曲列表（唔包歌詞原文：lyrics 表只拎 synced 同行數）。
 * 歌曲嘅寫入（API-020–024、040、041）係 T-023
 */
import { CREDIT_FIELDS, type TrackCredits } from '@r-gram/catalog';

interface TrackRow extends Record<(typeof CREDIT_FIELDS)[number], string | null> {
    id: string;
    no: number;
    title: string;
    subtitle: string | null;
    audio_key: string | null;
    audio_manual: number;
    mv_key: string | null;
    mv_manual: number;
    lyrics_source_url: string | null;
    note: string | null;
    youtube_id: string | null;
    video_kind: string | null;
    updated_at: string;
    synced: number | null;
    line_count: number | null;
}

const TRACKS_SQL = `
    SELECT t.id, t."no", t.title, t.subtitle, t.audio_key, t.audio_manual, t.mv_key, t.mv_manual,
        t.composer, t.lyricist, t.arranger, t.producer,
        t.lyrics_source_url, t.note, t.youtube_id, t.video_kind, t.updated_at,
        l.synced, l.line_count
    FROM tracks t
    LEFT JOIN lyrics l ON l.track_id = t.id
    WHERE t.album_id = ?
    ORDER BY t."no", t.id`;

const creditsOf = (row: TrackRow): TrackCredits =>
    Object.fromEntries(
        CREDIT_FIELDS.map((field) => [field, row[field]]),
    ) as unknown as TrackCredits;

const toTrack = (row: TrackRow) => ({
    id: row.id,
    no: row.no,
    title: row.title,
    subtitle: row.subtitle,
    audio: row.audio_key,
    audioManual: row.audio_manual === 1,
    mv: row.mv_key,
    mvManual: row.mv_manual === 1,
    credits: creditsOf(row),
    lyrics: row.synced === null ? null : { synced: row.synced === 1, lineCount: row.line_count },
    lyricsSourceUrl: row.lyrics_source_url,
    note: row.note,
    youtubeId: row.youtube_id,
    videoKind: row.video_kind,
    updatedAt: row.updated_at,
});

export const tracksOf = async (db: D1Database, albumId: string) => {
    const rows = await db.prepare(TRACKS_SQL).bind(albumId).all<TrackRow>();
    return rows.results.map(toTrack);
};
