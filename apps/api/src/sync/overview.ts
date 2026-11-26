/*
 * API-033 GET /api/sync（T-105；Technical Spec「CR-007 → 同步嘅設計」）：bucket 第一層 + D1 專輯，唔寫嘢。
 * - folders：啱格式嘅資料夾（albumOrder 次序 = 管理端逐個叫 API-034 嘅次序）；status：new（D1 未有）、known、
 *   duplicate（同一個 id 有幾個資料夾，而呢個唔係 D1 用緊嗰個：API-034 會回 409，D67）
 * - invalid：名唔啱格式（檢查結果 INVALID_FOLDER_NAME）；duplicateIds：同一個 id 嘅資料夾
 * - missingAlbums：D1 有而 bucket 冇呢個 id 嘅資料夾 = 專輯移除候選（list 唔齊就唔列）
 * - mediaBase：媒體 bucket 公開網址（T-116）：管理端由 mediaBase + coverJobs 嘅 key 攞封面來源
 */
import { albumOrder } from '@r-gram/catalog';
import type { Context } from 'hono';
import type { AppEnv } from '../app';
import { checkMessage } from './checkMessages';
import { listAlbumFolders, type BucketFolder } from './folders';

interface StoredAlbum {
    id: string;
    folder: string;
    title: string;
}

const STORED_SQL = 'SELECT id, folder, title FROM albums ORDER BY id';

const groupById = (folders: readonly BucketFolder[]) => {
    const groups = new Map<string, string[]>();
    for (const { id, folder } of folders) groups.set(id, [...(groups.get(id) ?? []), folder]);
    return groups;
};

const statusOf = (
    item: BucketFolder,
    groups: Map<string, string[]>,
    stored: Map<string, StoredAlbum>,
) => {
    const storedFolder = stored.get(item.id)?.folder;
    if ((groups.get(item.id) ?? []).length > 1)
        return storedFolder === item.folder ? 'known' : 'duplicate';
    return storedFolder === undefined ? 'new' : 'known';
};

const invalidItem = (folder: string) => ({
    folder,
    code: 'INVALID_FOLDER_NAME' as const,
    message: checkMessage({ level: 'error', code: 'INVALID_FOLDER_NAME', params: { folder } }),
});

export const syncOverview = async (c: Context<AppEnv>) => {
    const listed = await listAlbumFolders(c.env.MEDIA);
    const rows = (await c.env.DB.prepare(STORED_SQL).all<StoredAlbum>()).results;
    const stored = new Map(rows.map((row) => [row.id, row]));
    const sorted = [...listed.folders].sort(albumOrder);
    const groups = groupById(sorted);
    const folders = sorted.map((item) => ({
        folder: item.folder,
        id: item.id,
        category: item.category,
        categoryNo: item.categoryNo,
        status: statusOf(item, groups, stored),
    }));
    const duplicateIds = [...groups].filter(([, names]) => names.length > 1);
    const missing = listed.truncated ? [] : rows.filter(({ id }) => !groups.has(id));
    return c.json({
        folders,
        invalid: listed.invalid.map(invalidItem),
        duplicateIds: duplicateIds.map(([id, names]) => ({ id, folders: names })),
        missingAlbums: missing.map(({ id, folder, title }) => ({
            kind: 'album',
            albumId: id,
            folder,
            title,
        })),
        truncated: listed.truncated,
        mediaBase: c.env.MEDIA_BASE,
    });
};
