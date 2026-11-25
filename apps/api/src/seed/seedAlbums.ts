/*
 * T-027 初始資料：只入專輯（Technical Spec「CR-006 → 初始資料只入專輯」、Functional Spec D59、D64）。
 * discography.json 嘅 albums[] → D1（id、碟名、字母、類別、序號、年份、唱片公司、次序；專輯色中性灰；
 * folder、封面欄 NULL）。唔入歌、credit、封面。之後生成一次 catalog（updated_by = seed）。
 * 由 src/seed/worker.ts 行（scripts/seed.mjs 用 wrangler 喺本機開佢，同 `wrangler dev` 同一份本機 D1 / R2）
 */
import {
    NEUTRAL_ACCENT,
    planAlbumSeed,
    type ExistingAlbum,
    type OrdinalTaken,
    type SeedAlbum,
} from '@r-gram/catalog';
import { rebuildCatalog, statusOf, type RebuildEnv } from '../catalog/rebuild';
import type { CatalogStatus } from '../catalog/state';

/** catalog_state.updated_by（Technical Spec「catalog_state」） */
export const SEED_ACTOR = 'seed';

export interface SeedReport {
    inserted: string[];
    /** id 已經有，唔郁（包括同時被其他請求建立嘅） */
    existing: string[];
    ordinalTaken: OrdinalTaken[];
    catalog: CatalogStatus;
}

/**
 * 已有 id 唔寫（ON CONFLICT DO NOTHING）；同類別序號有人用都唔寫（NOT EXISTS）。
 * 兩樣喺 planAlbumSeed() 已經揀過，呢度係同一句 SQL 嘅保險（讀同寫之間有人改）
 */
const INSERT_SQL = `
    INSERT INTO albums (id, title, wheel_key, year, category, category_no, label, accent,
        sort_order, created_at, updated_at)
    SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10
    WHERE NOT EXISTS (SELECT 1 FROM albums WHERE category = ?5 AND category_no = ?6)
    ON CONFLICT (id) DO NOTHING`;

const readExisting = async (db: D1Database): Promise<ExistingAlbum[]> => {
    const rows = await db
        .prepare('SELECT id, category, category_no AS categoryNo FROM albums')
        .all<ExistingAlbum>();
    return rows.results;
};

const insertStatement = (db: D1Database, album: SeedAlbum, now: string) =>
    db
        .prepare(INSERT_SQL)
        .bind(
            album.id,
            album.title,
            album.wheelKey,
            album.year,
            album.category,
            album.categoryNo,
            album.label,
            NEUTRAL_ACCENT,
            album.order,
            now,
        );

/** 一個 batch（transaction）；回真係寫咗嘅 id */
const insertAlbums = async (db: D1Database, albums: readonly SeedAlbum[]): Promise<string[]> => {
    // D1 batch 唔收空陣列
    if (albums.length === 0) return [];
    const now = new Date().toISOString();
    const results = await db.batch(albums.map((album) => insertStatement(db, album, now)));
    return albums.filter((_, index) => (results[index]?.meta.changes ?? 0) > 0).map(({ id }) => id);
};

export const seedAlbums = async (
    env: RebuildEnv,
    albums: readonly SeedAlbum[],
): Promise<SeedReport> => {
    const plan = planAlbumSeed(albums, await readExisting(env.DB));
    const inserted = await insertAlbums(env.DB, plan.insert);
    const raced = plan.insert.map(({ id }) => id).filter((id) => !inserted.includes(id));
    const catalog = statusOf(await rebuildCatalog(env, SEED_ACTOR));
    return {
        inserted,
        existing: [...plan.existing, ...raced],
        ordinalTaken: plan.ordinalTaken,
        catalog,
    };
};
