/*
 * catalog_state（Technical Spec「catalog_state」，得一行 id = 1）嘅讀寫，同埋 API 回應入面嘅 `catalog`。
 * `CatalogStatus` 係唯一嘅形狀（backlog B-046 ②）：GET /api/albums 嘅 `catalog`、每個寫入回應嘅 `catalog`、
 * POST /api/catalog/rebuild 嘅回應（加 `unchanged`）都係佢。
 * hash / generatedAt / albumCount / trackCount = 而家 R2 嗰份 catalog.json 嘅值（失敗時保留上一份；未成功過係 null）；
 * updatedAt = 最近一次嘗試；error = 最近一次失敗嘅種類（成功係 null）
 */
import { ERROR_CODE } from '../config';

export type CatalogFailure =
    typeof ERROR_CODE.invalidDocument | typeof ERROR_CODE.catalogWriteFailed;

export interface CatalogStatus {
    ok: boolean;
    hash: string | null;
    generatedAt: string | null;
    albumCount: number | null;
    trackCount: number | null;
    updatedAt: string;
    /** CatalogFailure；生成步驟意外 throw（api/afterWrite.ts）係 INTERNAL */
    error: string | null;
}

/** 一份成功生成（或者內容冇變）嘅 catalog.json */
export interface LiveCatalog {
    hash: string;
    generatedAt: string;
    albumCount: number;
    trackCount: number;
}

/** 邊個、幾時嘗試生成（updated_by：admin email 或者 seed） */
export interface Attempt {
    updatedAt: string;
    actor: string;
}

interface StateRow {
    status: 'ok' | 'failed';
    hash: string | null;
    generated_at: string | null;
    album_count: number | null;
    track_count: number | null;
    updated_at: string;
    error: string | null;
}

const STATE_COLUMNS = 'status, hash, generated_at, album_count, track_count, updated_at, error';

const toStatus = (row: StateRow): CatalogStatus => ({
    ok: row.status === 'ok',
    hash: row.hash,
    generatedAt: row.generated_at,
    albumCount: row.album_count,
    trackCount: row.track_count,
    updatedAt: row.updated_at,
    error: row.error,
});

/** 未嘗試過生成 → null */
export const readCatalogStatus = async (db: D1Database): Promise<CatalogStatus | null> => {
    const row = await db
        .prepare(`SELECT ${STATE_COLUMNS} FROM catalog_state WHERE id = 1`)
        .first<StateRow>();
    return row ? toStatus(row) : null;
};

/**
 * 記低成功。兩個生成同時完成時，舊嗰份唔可以蓋過新嗰份嘅值：generated_at 只會向前行
 *（R2 條件寫入保證後寫入嘅一份係後生成嘅，見 rebuild.ts）
 */
export const recordSuccess = async (
    db: D1Database,
    live: LiveCatalog,
    { updatedAt, actor }: Attempt,
): Promise<void> => {
    await db
        .prepare(
            `INSERT INTO catalog_state (id, status, hash, generated_at, album_count, track_count,
                 updated_at, updated_by, error)
             VALUES (1, 'ok', ?1, ?2, ?3, ?4, ?5, ?6, NULL)
             ON CONFLICT (id) DO UPDATE SET status = 'ok', hash = excluded.hash,
                 generated_at = excluded.generated_at, album_count = excluded.album_count,
                 track_count = excluded.track_count, updated_at = excluded.updated_at,
                 updated_by = excluded.updated_by, error = NULL
             WHERE catalog_state.generated_at IS NULL
                 OR catalog_state.generated_at <= excluded.generated_at`,
        )
        .bind(live.hash, live.generatedAt, live.albumCount, live.trackCount, updatedAt, actor)
        .run();
};

/** 記低失敗，保留上一份嘅 hash / 時間 / 數目；回寫入之後嗰行 */
export const recordFailure = async (
    db: D1Database,
    error: CatalogFailure,
    { updatedAt, actor }: Attempt,
): Promise<CatalogStatus> => {
    const row = await db
        .prepare(
            `INSERT INTO catalog_state (id, status, updated_at, updated_by, error)
             VALUES (1, 'failed', ?1, ?2, ?3)
             ON CONFLICT (id) DO UPDATE SET status = 'failed', updated_at = excluded.updated_at,
                 updated_by = excluded.updated_by, error = excluded.error
             RETURNING ${STATE_COLUMNS}`,
        )
        .bind(updatedAt, actor, error)
        .first<StateRow>();
    // RETURNING 一定有一行（INSERT 或者 UPDATE）
    return toStatus(row as StateRow);
};

/** 生成步驟意外 throw（連 catalog_state 都寫唔到）：唔知上一份嘅值，同一個形狀照回 */
export const internalFailure = (updatedAt: string): CatalogStatus => ({
    ok: false,
    hash: null,
    generatedAt: null,
    albumCount: null,
    trackCount: null,
    updatedAt,
    error: ERROR_CODE.internal,
});
