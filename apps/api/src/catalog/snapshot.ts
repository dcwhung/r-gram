/*
 * 生成 catalog 要讀嘅 D1 資料：全部專輯同全部歌（歌號次序）連歌詞檔名。專輯次序由 buildDocument 按 albumOrder() 排。
 * 兩句喺同一個 batch（一個 transaction）讀：專輯同歌係同一刻嘅資料，唔會一半新一半舊。
 * folder、來源 ETag、info_etag、檢查結果、text_key 係管理用，唔入 catalog，唔讀
 */
import { CREDIT_FIELDS, type ReleaseCategory } from '@r-gram/catalog';

export interface AlbumSnapshot {
    id: string;
    title: string;
    year: number | null;
    category: ReleaseCategory;
    category_no: number;
    accent: string;
    cover: string | null;
    thumb: string | null;
    /** CR-005（D55）：第二張封面；佢嘅來源 ETag（cover2_source_etag）同第一張嗰個一樣唔讀 */
    cover2: string | null;
    thumb2: string | null;
}

export interface TrackSnapshot extends Record<(typeof CREDIT_FIELDS)[number], string | null> {
    id: string;
    album_id: string;
    no: number;
    title: string;
    audio_key: string | null;
    mv_key: string | null;
    json_name: string | null;
}

export interface CatalogSnapshot {
    albums: AlbumSnapshot[];
    tracks: TrackSnapshot[];
}

const ALBUMS_SQL = `
    SELECT id, title, year, category, category_no, accent, cover, thumb, cover2, thumb2
    FROM albums`;

const TRACKS_SQL = `
    SELECT t.id, t.album_id, t."no", t.title,
        ${CREDIT_FIELDS.map((field) => `t.${field}`).join(', ')},
        t.audio_key, t.mv_key, l.json_name
    FROM tracks t
    LEFT JOIN lyrics l ON l.track_id = t.id
    ORDER BY t.album_id, t."no", t.id`;

export const readCatalogSnapshot = async (db: D1Database): Promise<CatalogSnapshot> => {
    const [albums, tracks] = await db.batch([db.prepare(ALBUMS_SQL), db.prepare(TRACKS_SQL)]);
    return {
        albums: (albums?.results ?? []) as AlbumSnapshot[],
        tracks: (tracks?.results ?? []) as TrackSnapshot[],
    };
};
