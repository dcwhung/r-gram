/*
 * API-034 嘅資料夾參數（Functional Spec D67；Technical Spec「安全設計 → 同步嘅 folder 參數」）：
 * 一定要過 parseAlbumFolder()（冇 `/`、`..`、`_` 開頭、大楷）→ 400 INVALID_FOLDER。
 * 再對 bucket 第一層：同一個 id 有幾個資料夾 → D1 用緊嘅嗰個照同步（加 DUPLICATE_ALBUM_ID 檢查結果），
 * 其他 → 409，唔寫（未有嘅專輯：全部 409，直到改好）；同類別同序號嘅其他資料夾 → DUPLICATE_ORDINAL 提示；
 * 資料夾唔喺 bucket → 404 FOLDER_EMPTY（list 唔齊就由 list 個資料夾決定）
 */
import { checkOf, parseAlbumFolder, type AlbumFolder, type Check } from '@r-gram/catalog';
import { findAlbum } from '../albums/store';
import type { Env } from '../env';
import type { SyncSituation } from './errors';
import { listAlbumFolders, type BucketFolder } from './folders';

export interface FolderTarget extends AlbumFolder {
    folder: string;
    /** 資料夾層面嘅檢查結果（同 id、同序號） */
    checks: Check[];
}

const FOLDER_LIST_SEPARATOR = ', ';

const ordinalChecks = (target: BucketFolder, folders: readonly BucketFolder[]): Check[] =>
    folders
        .filter(
            (item) =>
                item.id !== target.id &&
                item.category === target.category &&
                item.categoryNo === target.categoryNo,
        )
        .map(({ folder }) => checkOf('DUPLICATE_ORDINAL', {}, { other: folder }));

const duplicateCheck = (id: string, sameId: readonly BucketFolder[]): Check =>
    checkOf(
        'DUPLICATE_ALBUM_ID',
        {},
        { id, folders: sameId.map(({ folder }) => folder).join(FOLDER_LIST_SEPARATOR) },
    );

export const resolveFolder = async (
    env: Pick<Env, 'DB' | 'MEDIA'>,
    folder: string,
): Promise<FolderTarget | SyncSituation> => {
    const parsed = parseAlbumFolder(folder);
    if (!parsed) return 'invalidFolder';
    const target = { folder, ...parsed };
    const listed = await listAlbumFolders(env.MEDIA);
    const sameId = listed.folders.filter(({ id }) => id === parsed.id);
    if (!listed.truncated && !sameId.some((item) => item.folder === folder)) return 'folderEmpty';
    const checks = ordinalChecks(target, listed.folders);
    if (sameId.length < 2) return { ...target, checks };
    const stored = await findAlbum(env.DB, parsed.id);
    if (stored?.folder !== folder) return 'duplicateAlbumId';
    return { ...target, checks: [duplicateCheck(parsed.id, sameId), ...checks] };
};
