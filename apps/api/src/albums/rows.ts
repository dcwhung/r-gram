/*
 * albums 表嘅行 ⇄ API 物件（camelCase）；SQL 只用呢度嘅常數砌欄位名。
 * CR-007（Technical Spec「API 一覽嘅變化」）：唯讀；字母盤標記由碟名計（wheelKeyFor），唔儲存；
 * 檢查結果（albums.checks）喺專輯頁逐項列出，列表只係數目
 */
import { albumOrder, wheelKeyFor, type Check, type ReleaseCategory } from '@r-gram/catalog';

export interface AlbumRow {
    id: string;
    title: string;
    year: number | null;
    category: ReleaseCategory;
    category_no: number;
    accent: string;
    cover: string | null;
    cover_source_etag: string | null;
    thumb: string | null;
    cover2: string | null;
    thumb2: string | null;
    cover2_source_etag: string | null;
    folder: string;
    info_etag: string | null;
    checks: string;
    updated_at: string;
}

export const ALBUM_COLUMNS = [
    'id, title, year, category, category_no, accent',
    'cover, cover_source_etag, thumb, cover2, thumb2, cover2_source_etag',
    'folder, info_etag, checks, updated_at',
].join(', ');

/** 排次序要嘅三個欄（albums 行、catalog snapshot 都有） */
type FolderColumns = Pick<AlbumRow, 'id' | 'category' | 'category_no'>;

const folderOf = (row: FolderColumns) => ({
    category: row.category,
    categoryNo: row.category_no,
    id: row.id,
});

/** CR-007（D69）：固定次序 albumOrder()（類別 → 序號 → id）；API-010 同 catalog 一樣 */
export const byAlbumOrder = (a: FolderColumns, b: FolderColumns): number =>
    albumOrder(folderOf(a), folderOf(b));

/** albums.checks（JSON array）；讀唔到或者唔係 array 當冇（D1 CHECK 已經擋，呢度係最後一道） */
export const checksOf = (row: Pick<AlbumRow, 'checks'>): Check[] => {
    try {
        const parsed: unknown = JSON.parse(row.checks);
        return Array.isArray(parsed) ? (parsed as Check[]) : [];
    } catch {
        return [];
    }
};

/** API-010 同 API-012 共用嘅欄（唔包檢查結果） */
export const toAlbum = (row: AlbumRow) => ({
    id: row.id,
    title: row.title,
    wheelKey: wheelKeyFor(row.title),
    year: row.year,
    category: row.category,
    categoryNo: row.category_no,
    accent: row.accent,
    cover: row.cover,
    coverSourceEtag: row.cover_source_etag,
    thumb: row.thumb,
    // CR-005（D55）：第二張封面；專輯色只跟第一張
    cover2: row.cover2,
    thumb2: row.thumb2,
    cover2SourceEtag: row.cover2_source_etag,
    // CR-007（D67）：實際嘅資料夾名 = 專輯身份
    folder: row.folder,
    // 管理端「專輯頁（未有 info.txt）」用（D80）
    hasInfo: row.info_etag !== null,
    updatedAt: row.updated_at,
});

export type Album = ReturnType<typeof toAlbum>;
