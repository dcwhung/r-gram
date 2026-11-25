/*
 * albums 表嘅讀寫（全部 parameterised；欄位名只會嚟自 rows.ts 嘅常數）。
 * 並發：修改用 `WHERE updated_at = If-Match` 一句完成（檢查同寫入之間冇空隙）；排序同刪除用 D1 batch（一個 transaction）。
 * 同類別序號唔重覆（CR-004，FR-124）亦喺寫入嗰一句檢查（`NOT EXISTS`），唔係先讀後寫
 */
import { NEUTRAL_ACCENT, wheelKeyFor } from '@r-gram/catalog';
import { nextUpdatedAt } from '../lib/updatedAt';
import type { AlbumFields } from './validate';
import { ALBUM_COLUMNS, COLUMN_OF, yearOf, type AlbumRow } from './rows';
import type { EditableField } from './fieldRules';

export const findAlbum = (db: D1Database, id: string) =>
    db.prepare(`SELECT ${ALBUM_COLUMNS} FROM albums WHERE id = ?`).bind(id).first<AlbumRow>();

/**
 * ?7 = 類別、?8 = 序號（NULL = 嗰個類別最大序號 + 1）。序號已有人用 → `NOT EXISTS` 唔成立，乜都唔寫；
 * `category_no = NULL` 永遠唔成立，所以冇畀序號時一定寫得入。SELECT 一定要有 WHERE，SQLite 先唔會將
 * ON CONFLICT 當成 join 嘅一部分
 */
const INSERT_SQL = `
    INSERT INTO albums (id, title, wheel_key, release_date, year, type, category, category_no,
        label, accent, cover, cover_source_etag, thumb, folder, sort_order, created_at, updated_at)
    SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7,
        COALESCE(?8, (SELECT COALESCE(MAX(category_no), 0) + 1 FROM albums WHERE category = ?7)),
        ?9, ?10, ?11, ?12, ?13, ?14,
        (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM albums), ?15, ?15
    WHERE NOT EXISTS (SELECT 1 FROM albums WHERE category = ?7 AND category_no = ?8)
    ON CONFLICT (id) DO NOTHING`;

/** INSERT_SQL ?1–?14 嘅值；冇畀嘅欄用預設 */
const insertValues = (id: string, fields: AlbumFields): unknown[] => {
    const title = fields.title as string;
    return [
        id,
        title,
        fields.wheelKey ?? wheelKeyFor(title),
        fields.releaseDate ?? null,
        yearOf(fields.releaseDate),
        fields.type ?? '',
        fields.category,
        fields.categoryNo ?? null,
        fields.label ?? '',
        fields.accent ?? NEUTRAL_ACCENT,
        fields.cover ?? null,
        fields.coverSourceEtag ?? null,
        fields.thumb ?? null,
        fields.folder ?? null,
    ];
};

export type InsertOutcome = 'inserted' | 'idTaken' | 'ordinalTaken';

/**
 * 新增：預設字母盤標記按碟名、專輯色用中性灰（上載封面後抽色）、序號接住同類別最大嗰個；排喺最尾。
 * 寫唔入：id 已存在優先報（409），否則係序號已有人用（400）
 */
export const insertAlbum = async (
    db: D1Database,
    id: string,
    fields: AlbumFields,
): Promise<InsertOutcome> => {
    const now = new Date().toISOString();
    const result = await db
        .prepare(INSERT_SQL)
        .bind(...insertValues(id, fields), now)
        .run();
    if (result.meta.changes > 0) return 'inserted';
    return (await findAlbum(db, id)) ? 'idTaken' : 'ordinalTaken';
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

/**
 * 改類別或者序號時：改完之後嘅（類別, 序號）唔可以同另一張碟一樣。冇畀嘅一邊用嗰張碟而家嘅值。
 * 只改其他欄位就唔檢查（就算資料本身已經撞號，都唔會令改碟名失敗）
 */
const ordinalGuard = (fields: AlbumFields): { sql: string; values: unknown[] } =>
    'category' in fields || 'categoryNo' in fields
        ? {
              sql: `AND NOT EXISTS (SELECT 1 FROM albums other
                  WHERE other.id <> albums.id
                  AND other.category = COALESCE(?, albums.category)
                  AND other.category_no = COALESCE(?, albums.category_no))`,
              values: [fields.category ?? null, fields.categoryNo ?? null],
          }
        : { sql: '', values: [] };

/**
 * 只喺 updated_at 仲係 `expected`（同埋序號冇撞）時改；`RETURNING` 喺同一句回改好嘅行（backlog B-043 ①：
 * 寫入之後再讀，中間被刪就會誤報 404）。改唔到（過時、序號已有人用或者冇呢張碟）→ null
 */
export const updateAlbum = (
    db: D1Database,
    id: string,
    fields: AlbumFields,
    expected: string,
): Promise<AlbumRow | null> => {
    const { sql, values } = assignments(fields);
    const guard = ordinalGuard(fields);
    return db
        .prepare(
            `UPDATE albums SET ${[...sql, 'updated_at = ?'].join(', ')}
             WHERE id = ? AND updated_at = ? ${guard.sql}
             RETURNING ${ALBUM_COLUMNS}`,
        )
        .bind(...values, nextUpdatedAt(expected), id, expected, ...guard.values)
        .first<AlbumRow>();
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

export interface DeletedAlbum {
    trackIds: string[];
    /** 刪走嘅歌用過嘅歌詞檔名（之後由 R2 刪走冇其他歌用緊嘅，backlog B-048） */
    lyricsNames: string[];
}

/**
 * 刪專輯：歌同歌詞由 ON DELETE CASCADE 帶走。列歌 id、歌詞檔名同刪除喺同一個 batch，回應列出嘅就係真係刪咗嘅歌。
 * 已經唔存在（例如同時刪咗）→ undefined
 */
export const deleteAlbum = async (
    db: D1Database,
    albumId: string,
): Promise<DeletedAlbum | undefined> => {
    const [listed, lyrics, deleted] = await db.batch<{ id?: string; json_name?: string }>([
        db.prepare('SELECT id FROM tracks WHERE album_id = ? ORDER BY "no", id').bind(albumId),
        db
            .prepare(
                `SELECT l.json_name FROM lyrics l JOIN tracks t ON t.id = l.track_id
                 WHERE t.album_id = ?`,
            )
            .bind(albumId),
        db.prepare('DELETE FROM albums WHERE id = ?').bind(albumId),
    ]);
    if (!deleted || deleted.meta.changes === 0) return undefined;
    return {
        trackIds: listed?.results.map((row) => row.id as string) ?? [],
        lyricsNames: lyrics?.results.map((row) => row.json_name as string) ?? [],
    };
};
