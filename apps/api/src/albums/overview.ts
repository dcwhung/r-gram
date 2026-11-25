/*
 * API-010 嘅讀取：每張專輯嘅完整度（一條 GROUP BY，Technical Spec「性能考量 → D1」）、
 * 全站統計（FR-114；項目照 Functional Spec D35 嘅建議，等管理端設計稿第 2 版確認）、catalog 生成狀態
 */
import { ALBUM_COLUMNS, toAlbum, type AlbumRow } from './rows';

interface OverviewRow extends AlbumRow {
    track_count: number;
    audio_count: number;
    mv_count: number;
    lyrics_count: number;
}

/** 每個欄位加 `a.` 前綴（同 tracks 嘅欄名撞） */
const QUALIFIED_ALBUM_COLUMNS = ALBUM_COLUMNS.split(', ')
    .map((column) => `a.${column}`)
    .join(', ');

/** 空字串 key 當冇音檔 / MV（同生成 catalog 時「空字串轉 null」一致） */
const OVERVIEW_SQL = `
    SELECT ${QUALIFIED_ALBUM_COLUMNS},
        COUNT(t.id) AS track_count,
        COUNT(NULLIF(t.audio_key, '')) AS audio_count,
        COUNT(NULLIF(t.mv_key, '')) AS mv_count,
        COUNT(l.track_id) AS lyrics_count
    FROM albums a
    LEFT JOIN tracks t ON t.album_id = a.id
    LEFT JOIN lyrics l ON l.track_id = t.id
    GROUP BY a.id
    ORDER BY a.sort_order, a.id`;

const toListItem = (row: OverviewRow) => ({
    ...toAlbum(row),
    completeness: {
        tracks: row.track_count,
        audio: row.audio_count,
        mv: row.mv_count,
        lyrics: row.lyrics_count,
    },
});

type ListItem = ReturnType<typeof toListItem>;

const sum = (items: readonly ListItem[], pick: (item: ListItem) => number) =>
    items.reduce((total, item) => total + pick(item), 0);

/** D35：全站專輯數、歌曲數；有音檔 / 歌詞 / MV 嘅歌數；有封面嘅專輯數 */
export const siteStats = (items: readonly ListItem[]) => ({
    albums: items.length,
    tracks: sum(items, (item) => item.completeness.tracks),
    tracksWithAudio: sum(items, (item) => item.completeness.audio),
    tracksWithLyrics: sum(items, (item) => item.completeness.lyrics),
    tracksWithMv: sum(items, (item) => item.completeness.mv),
    albumsWithCover: items.filter((item) => item.cover !== null && item.cover !== '').length,
});

interface CatalogStateRow {
    status: 'ok' | 'failed';
    generated_at: string | null;
    updated_at: string;
    error: string | null;
}

/** catalog_state（T-026 寫）；未生成過 → null */
const catalogState = async (db: D1Database) => {
    const row = await db
        .prepare('SELECT status, generated_at, updated_at, error FROM catalog_state WHERE id = 1')
        .first<CatalogStateRow>();
    if (!row) return null;
    const { status, generated_at: generatedAt, updated_at: updatedAt, error } = row;
    return { status, generatedAt, updatedAt, error };
};

export const albumOverview = async (db: D1Database) => {
    const rows = await db.prepare(OVERVIEW_SQL).all<OverviewRow>();
    const albums = rows.results.map(toListItem);
    return { albums, stats: siteStats(albums), catalog: await catalogState(db) };
};
