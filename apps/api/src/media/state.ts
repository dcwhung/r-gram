/*
 * 掃描要嘅 D1 狀態：專輯（資料夾、封面來源 ETag）同佢啲歌（歌號、音檔 / MV、手動旗、text_source_etag、
 * 歌曲文字嘅欄位連歌詞原文：預覽同已儲存內容比較用）。一句讀晒；另一句讀 `<albumId>-` 開頭嘅歌 id（新歌 id 撞唔撞）
 */
import {
    expectedFolder,
    type ScanAlbumState,
    type ScanTrackState,
    type SongTextFields,
} from '@r-gram/catalog';
import type { AlbumRow } from '../albums/rows';
import { songFieldsOf, type SongTextColumns } from '../tracks/saved';

interface StateRow extends SongTextColumns {
    id: string;
    no: number;
    audio_key: string | null;
    audio_manual: number;
    mv_key: string | null;
    mv_manual: number;
    text_source_etag: string | null;
    updated_at: string;
}

export interface ScanTrack extends ScanTrackState {
    stored: SongTextFields;
    updatedAt: string;
}

export interface ScanState {
    folder: string;
    expectedFolder: string;
    album: ScanAlbumState;
    tracks: ScanTrack[];
    takenIds: Set<string>;
}

const STATE_SQL = `
    SELECT t.id, t."no", t.title, t.subtitle, t.composer, t.lyricist, t.arranger, t.producer,
        t.audio_key, t.audio_manual, t.mv_key, t.mv_manual, t.text_source_etag, t.updated_at,
        l.source
    FROM tracks t LEFT JOIN lyrics l ON l.track_id = t.id
    WHERE t.album_id = ?
    ORDER BY t."no", t.id`;

/** trackIdFor() 嘅 `<albumId>-<NN>` 同隨機 id 都用呢個分隔 */
const TRACK_ID_SEPARATOR = '-';

/** 歌 id 開頭係 `<albumId>-`（album id 只有細楷英數同 `-`，冇 LIKE 嘅萬用字元，但用 substr 更清楚） */
const TAKEN_IDS_SQL = 'SELECT id FROM tracks WHERE substr(id, 1, length(?1)) = ?1';

const toScanTrack = (row: StateRow): ScanTrack => ({
    id: row.id,
    no: row.no,
    title: row.title,
    audioKey: row.audio_key,
    audioManual: row.audio_manual === 1,
    mvKey: row.mv_key,
    mvManual: row.mv_manual === 1,
    textSourceEtag: row.text_source_etag,
    stored: songFieldsOf(row),
    updatedAt: row.updated_at,
});

const albumStateOf = (row: AlbumRow): ScanAlbumState => ({
    coverSourceEtag: row.cover_source_etag,
    cover2SourceEtag: row.cover2_source_etag,
    hasCover: row.cover !== null,
    hasCover2: row.cover2 !== null,
});

export const readScanState = async (db: D1Database, album: AlbumRow): Promise<ScanState> => {
    const [tracks, taken] = await db.batch([
        db.prepare(STATE_SQL).bind(album.id),
        db.prepare(TAKEN_IDS_SQL).bind(`${album.id}${TRACK_ID_SEPARATOR}`),
    ]);
    const expected = expectedFolder(album.category, album.category_no, album.id);
    return {
        folder: album.folder ?? expected,
        expectedFolder: expected,
        album: albumStateOf(album),
        tracks: ((tracks?.results ?? []) as StateRow[]).map(toScanTrack),
        takenIds: new Set(((taken?.results ?? []) as { id: string }[]).map(({ id }) => id)),
    };
};
