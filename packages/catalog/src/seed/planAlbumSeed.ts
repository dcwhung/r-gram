/*
 * 初始資料只入專輯（T-027；Technical Spec「CR-006 → 初始資料只入專輯」、Functional Spec D59）：
 * 揀出要新增嘅專輯。id 已經有 = 唔郁（唔蓋走管理端改過嘅內容）；同類別序號已經有其他專輯用（管理端改過）=
 * 跳過並報告。純函數：Worker 讀現有專輯、寫 D1，呢度只決定
 */
import type { ReleaseCategory } from '../schema/releaseCategory';
import type { SeedAlbum } from './types';

/** D1 入面已有嘅專輯（只要判斷用嘅欄） */
export interface ExistingAlbum {
    id: string;
    category: ReleaseCategory;
    categoryNo: number;
}

/** 因為序號撞咗而冇新增嘅專輯；`takenBy` = 用緊嗰個序號嘅專輯 id */
export interface OrdinalTaken {
    id: string;
    category: ReleaseCategory;
    categoryNo: number;
    takenBy: string;
}

export interface AlbumSeedPlan {
    insert: SeedAlbum[];
    /** id 已經存在，唔郁 */
    existing: string[];
    ordinalTaken: OrdinalTaken[];
}

const ordinalKey = (category: string, categoryNo: number) => `${category}:${categoryNo}`;

/** 次序跟 `albums`；兩張初始專輯撞號（唔應該發生）就第一張先 */
export const planAlbumSeed = (
    albums: readonly SeedAlbum[],
    existing: readonly ExistingAlbum[],
): AlbumSeedPlan => {
    const ids = new Set(existing.map(({ id }) => id));
    const owners = new Map(
        existing.map((row) => [ordinalKey(row.category, row.categoryNo), row.id]),
    );
    const plan: AlbumSeedPlan = { insert: [], existing: [], ordinalTaken: [] };
    for (const album of albums) {
        const { id, category, categoryNo } = album;
        const key = ordinalKey(category, categoryNo);
        const takenBy = owners.get(key);
        if (ids.has(id)) plan.existing.push(id);
        else if (takenBy !== undefined)
            plan.ordinalTaken.push({ id, category, categoryNo, takenBy });
        else {
            plan.insert.push(album);
            owners.set(key, id);
        }
    }
    return plan;
};
