/*
 * albums 表嘅讀寫（全部 parameterised；欄位名只會嚟自 rows.ts 嘅常數）。
 * 並發：修改用 `WHERE updated_at = If-Match` 一句完成（檢查同寫入之間冇空隙）；排序同刪除用 D1 batch（一個 transaction）
 */
import { NEUTRAL_ACCENT, wheelKeyFor } from '@r-gram/catalog';
import { nextUpdatedAt } from '../lib/updatedAt';
import type { AlbumFields } from './validate';
import { ALBUM_COLUMNS, COLUMN_OF, yearOf, type AlbumRow } from './rows';
import type { EditableField } from './fieldRules';

export const findAlbum = (db: D1Database, id: string) =>
    db.prepare(`SELECT ${ALBUM_COLUMNS} FROM albums WHERE id = ?`).bind(id).first<AlbumRow>();

/** 新增：預設字母盤標記按碟名、專輯色用中性灰（上載封面後由 T-024 抽色）；排喺最尾。id 已存在 → false */
export const insertAlbum = async (db: D1Database, id: string, fields: AlbumFields) => {
    const now = new Date().toISOString();
    const title = fields.title as string;
    const result = await db
        .prepare(
            `INSERT INTO albums (id, title, wheel_key, release_date, year, type, label, accent,
                 cover, thumb, folder, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11,
                 (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM albums), ?12, ?12)
             ON CONFLICT (id) DO NOTHING`,
        )
        .bind(
            id,
            title,
            fields.wheelKey ?? wheelKeyFor(title),
            fields.releaseDate ?? null,
            yearOf(fields.releaseDate),
            fields.type ?? '',
            fields.label ?? '',
            fields.accent ?? NEUTRAL_ACCENT,
            fields.cover ?? null,
            fields.thumb ?? null,
            fields.folder ?? null,
            now,
        )
        .run();
    return result.meta.changes > 0;
};

/** SET 子句同佢嘅值：有畀 releaseDate 就連 year 一齊改 */
const assignments = (fields: AlbumFields): { sql: string[]; values: unknown[] } => {
    const keys = Object.keys(fields) as EditableField[];
    const sql = keys.map((key) => `${COLUMN_OF[key]} = ?`);
    const values = keys.map((key) => fields[key]);
    if ('releaseDate' in fields) {
        sql.push('year = ?');
        values.push(yearOf(fields.releaseDate));
    }
    return { sql, values };
};

/** 只喺 updated_at 仲係 `expected` 時改；回新嘅 updated_at，唔啱（或者冇呢張碟）→ undefined */
export const updateAlbum = async (
    db: D1Database,
    id: string,
    fields: AlbumFields,
    expected: string,
): Promise<string | undefined> => {
    const updatedAt = nextUpdatedAt(expected);
    const { sql, values } = assignments(fields);
    const result = await db
        .prepare(
            `UPDATE albums SET ${[...sql, 'updated_at = ?'].join(', ')}
             WHERE id = ? AND updated_at = ?`,
        )
        .bind(...values, updatedAt, id, expected)
        .run();
    return result.meta.changes > 0 ? updatedAt : undefined;
};

export const allAlbumIds = async (db: D1Database): Promise<string[]> => {
    const rows = await db.prepare('SELECT id FROM albums').all<{ id: string }>();
    return rows.results.map((row) => row.id);
};

/** 一個 batch（transaction）寫晒 1..n：同時兩個排序，最後係其中一個嘅完整次序，唔會溝埋。唔郁 updated_at */
export const writeOrder = async (db: D1Database, ids: readonly string[]) => {
    // D1 batch 唔收空陣列（會 throw）；冇專輯 = 冇嘢要寫
    if (ids.length === 0) return;
    const statement = db.prepare('UPDATE albums SET sort_order = ? WHERE id = ?');
    await db.batch(ids.map((id, index) => statement.bind(index + 1, id)));
};

export const trackIdsOf = async (db: D1Database, albumId: string): Promise<string[]> => {
    const rows = await db
        .prepare('SELECT id FROM tracks WHERE album_id = ? ORDER BY "no", id')
        .bind(albumId)
        .all<{ id: string }>();
    return rows.results.map((row) => row.id);
};

/**
 * 刪專輯：歌同歌詞由 ON DELETE CASCADE 帶走。列歌 id 同刪除喺同一個 batch，回應列出嘅就係真係刪咗嘅歌。
 * 已經唔存在（例如同時刪咗）→ undefined
 */
export const deleteAlbum = async (db: D1Database, albumId: string) => {
    const [listed, deleted] = await db.batch<{ id: string }>([
        db.prepare('SELECT id FROM tracks WHERE album_id = ? ORDER BY "no", id').bind(albumId),
        db.prepare('DELETE FROM albums WHERE id = ?').bind(albumId),
    ]);
    if (!deleted || deleted.meta.changes === 0) return undefined;
    return listed?.results.map((row) => row.id) ?? [];
};
