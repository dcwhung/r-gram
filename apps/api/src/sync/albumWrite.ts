/*
 * 同步寫 albums（parameterised）：
 * - ensureAlbum：寫歌之前。冇 = 建立（專輯色 = 中性灰、checks '[]'、info_etag NULL；同時另一個同步建立咗就照更新）；
 *   有而碟名、年份、類別、序號、資料夾唔同 = 更新（資料夾改名而 id 不變，D67）。info_used 同碟名一齊寫（W-046：
 *   套用咗 `info.txt` 就記，唔等成個同步完成）；淨係佢唔同 = 只寫佢（唔入 catalog，唔改 updated_at、唔生成）
 * - finishAlbum：寫完歌之後。檢查結果同 info_etag 唔同先寫（唔入 catalog，所以唔使生成）
 */
import { NEUTRAL_ACCENT } from '@r-gram/catalog';
import type { AlbumRow } from '../albums/rows';
import { nextUpdatedAt } from '../lib/updatedAt';
import type { FolderTarget } from './folderTarget';

export interface AlbumFields {
    title: string;
    year: number | null;
    /** albums.info_used（FolderPlan.infoUsed） */
    infoUsed: boolean;
}

const INSERT_SQL = `
    INSERT INTO albums (id, title, year, category, category_no, accent, folder, info_used,
        created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)
    ON CONFLICT (id) DO UPDATE SET title = excluded.title, year = excluded.year,
        category = excluded.category, category_no = excluded.category_no, folder = excluded.folder,
        info_used = excluded.info_used, updated_at = excluded.updated_at`;

const UPDATE_SQL = `
    UPDATE albums SET title = ?1, year = ?2, category = ?3, category_no = ?4, folder = ?5, info_used = ?6,
        updated_at = ?7
    WHERE id = ?8`;

const MARK_SQL = 'UPDATE albums SET info_used = ?1 WHERE id = ?2';

/** albums.info_used 係 0 / 1 */
const flagOf = (value: boolean): number => (value ? 1 : 0);

const isSame = (row: AlbumRow, target: FolderTarget, fields: AlbumFields): boolean =>
    row.title === fields.title &&
    row.year === fields.year &&
    row.category === target.category &&
    row.category_no === target.categoryNo &&
    row.folder === target.folder;

/** 有冇寫（建立或者更新）：寫咗 = 要生成 catalog */
export const ensureAlbum = async (
    db: D1Database,
    row: AlbumRow | null,
    target: FolderTarget,
    fields: AlbumFields,
): Promise<boolean> => {
    const { title, year } = fields;
    const { id, category, categoryNo, folder } = target;
    const used = flagOf(fields.infoUsed);
    if (!row) {
        const now = new Date().toISOString();
        const values = [id, title, year, category, categoryNo, NEUTRAL_ACCENT, folder, used, now];
        await db
            .prepare(INSERT_SQL)
            .bind(...values)
            .run();
        return true;
    }
    if (isSame(row, target, fields)) {
        if (row.info_used !== used) await db.prepare(MARK_SQL).bind(used, id).run();
        return false;
    }
    const next = nextUpdatedAt(row.updated_at);
    const values = [title, year, category, categoryNo, folder, used, next, id];
    await db
        .prepare(UPDATE_SQL)
        .bind(...values)
        .run();
    return true;
};

export interface AlbumFinish {
    checks: string;
    infoEtag: string | null;
}

/** 上次記低嘅（新專輯 = 建立時嘅值） */
export const storedFinish = (row: AlbumRow | null): AlbumFinish => ({
    checks: row?.checks ?? '[]',
    infoEtag: row?.info_etag ?? null,
});

export const finishAlbum = async (
    db: D1Database,
    id: string,
    stored: AlbumFinish,
    next: AlbumFinish,
): Promise<void> => {
    if (stored.checks === next.checks && stored.infoEtag === next.infoEtag) return;
    await db
        .prepare('UPDATE albums SET checks = ?1, info_etag = ?2 WHERE id = ?3')
        .bind(next.checks, next.infoEtag, id)
        .run();
};
