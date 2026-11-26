/*
 * tracks 表嘅行 ⇄ API 物件（camelCase）。API-012 專輯頁嘅歌曲列表同歌曲 API 嘅回應用同一個形狀；
 * 唔包歌詞原文：lyrics 表只拎 synced 同行數。CR-007（D71）：冇副題、手動指定、參考欄；
 * `audio` = null 係 info.txt 列咗而冇音檔嘅歌（灰色行，D70）；`textKey` = 嗰首歌嘅歌曲文字檔
 */
import { CREDIT_FIELDS, type TrackCredits } from '@r-gram/catalog';

export interface TrackRow extends Record<(typeof CREDIT_FIELDS)[number], string | null> {
    id: string;
    no: number;
    title: string;
    audio_key: string | null;
    mv_key: string | null;
    text_key: string | null;
    updated_at: string;
    synced: number | null;
    line_count: number | null;
}

/** tracks 自己嘅欄（SELECT 同 RETURNING 共用；欄位名只嚟自呢度） */
const OWN_COLUMNS = [
    'id',
    '"no"',
    'title',
    'audio_key',
    'mv_key',
    'text_key',
    'composer',
    'lyricist',
    'arranger',
    'producer',
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
    audio: row.audio_key,
    mv: row.mv_key,
    textKey: row.text_key,
    credits: creditsOf(row),
    lyrics: row.synced === null ? null : { synced: row.synced === 1, lineCount: row.line_count },
    updatedAt: row.updated_at,
});

export const tracksOf = async (db: D1Database, albumId: string) => {
    const rows = await db.prepare(TRACKS_SQL).bind(albumId).all<TrackRow>();
    return rows.results.map(toTrack);
};
