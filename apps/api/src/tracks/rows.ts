/*
 * tracks 表嘅行 ⇄ API 物件（camelCase）。API-012 專輯頁嘅歌曲列表同歌曲 API 嘅回應用同一個形狀；
 * 唔包歌詞原文：lyrics 表只拎 synced 同行數
 */
import { CREDIT_FIELDS, type TrackCredits } from '@r-gram/catalog';

export interface TrackRow extends Record<(typeof CREDIT_FIELDS)[number], string | null> {
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

/** tracks 自己嘅欄（SELECT 同 RETURNING 共用；欄位名只嚟自呢度） */
const OWN_COLUMNS = [
    'id',
    '"no"',
    'title',
    'subtitle',
    'audio_key',
    'audio_manual',
    'mv_key',
    'mv_manual',
    'composer',
    'lyricist',
    'arranger',
    'producer',
    'lyrics_source_url',
    'note',
    'youtube_id',
    'video_kind',
    'updated_at',
];

/** UPDATE / INSERT … RETURNING：歌詞狀態用 subquery 喺同一句帶出（寫入之後唔使再讀，backlog B-043 ①） */
export const TRACK_RETURNING = [
    ...OWN_COLUMNS,
    '(SELECT synced FROM lyrics WHERE track_id = tracks.id) AS synced',
    '(SELECT line_count FROM lyrics WHERE track_id = tracks.id) AS line_count',
].join(', ');

const TRACKS_SQL = `
    SELECT ${OWN_COLUMNS.map((column) => `t.${column}`).join(', ')}, l.synced, l.line_count
    FROM tracks t
    LEFT JOIN lyrics l ON l.track_id = t.id
    WHERE t.album_id = ?
    ORDER BY t."no", t.id`;

const creditsOf = (row: TrackRow): TrackCredits =>
    Object.fromEntries(
        CREDIT_FIELDS.map((field) => [field, row[field]]),
    ) as unknown as TrackCredits;

export const toTrack = (row: TrackRow) => ({
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
