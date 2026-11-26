/*
 * 同步一個資料夾要嘅 D1 狀態：專輯行（冇 = 新專輯）同佢啲歌（歌號、連結、`.txt` 版本、歌詞檔名、updated_at）。
 * 專輯一句、歌一句（同一個 batch）
 */
import type { SyncAlbumState, SyncTrackState } from '@r-gram/catalog';
import { ALBUM_COLUMNS, checksOf, type AlbumRow } from '../albums/rows';

export interface StoredTrack extends SyncTrackState {
    updatedAt: string;
    /** 歌詞 JSON 檔名（冇歌詞 = null）：內容改咗之後舊檔等 catalog 生成成功先刪 */
    jsonName: string | null;
}

export interface FolderState {
    album: AlbumRow | null;
    tracks: StoredTrack[];
}

interface TrackStateRow {
    id: string;
    no: number;
    title: string;
    audio_key: string | null;
    mv_key: string | null;
    text_key: string | null;
    text_source_etag: string | null;
    updated_at: string;
    json_name: string | null;
}

const TRACKS_SQL = `
    SELECT t.id, t."no", t.title, t.audio_key, t.mv_key, t.text_key, t.text_source_etag,
        t.updated_at, l.json_name
    FROM tracks t LEFT JOIN lyrics l ON l.track_id = t.id
    WHERE t.album_id = ?
    ORDER BY t."no", t.id`;

const toStoredTrack = (row: TrackStateRow): StoredTrack => ({
    id: row.id,
    no: row.no,
    title: row.title,
    audioKey: row.audio_key,
    mvKey: row.mv_key,
    textKey: row.text_key,
    textSourceEtag: row.text_source_etag,
    updatedAt: row.updated_at,
    jsonName: row.json_name,
});

export const readFolderState = async (db: D1Database, albumId: string): Promise<FolderState> => {
    const [album, tracks] = await db.batch([
        db.prepare(`SELECT ${ALBUM_COLUMNS} FROM albums WHERE id = ?`).bind(albumId),
        db.prepare(TRACKS_SQL).bind(albumId),
    ]);
    const [row] = (album?.results ?? []) as AlbumRow[];
    return {
        album: row ?? null,
        tracks: ((tracks?.results ?? []) as TrackStateRow[]).map(toStoredTrack),
    };
};

export const syncAlbumStateOf = (row: AlbumRow | null): SyncAlbumState | null =>
    row && {
        title: row.title,
        year: row.year,
        infoUsed: row.info_used === 1,
        coverSourceEtag: row.cover_source_etag,
        cover2SourceEtag: row.cover2_source_etag,
        hasCover: row.cover !== null,
        hasCover2: row.cover2 !== null,
        checks: checksOf(row),
    };
