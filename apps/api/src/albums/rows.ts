/* albums 表嘅行 ⇄ API 物件（camelCase）；欄位名對照集中喺度，SQL 只用呢度嘅常數砌欄位名 */
import { expectedFolder, type ReleaseCategory } from '@r-gram/catalog';
import type { EditableField } from './fieldRules';

export interface AlbumRow {
    id: string;
    title: string;
    wheel_key: string;
    year: number | null;
    category: ReleaseCategory;
    category_no: number;
    label: string;
    accent: string;
    cover: string | null;
    cover_source_etag: string | null;
    thumb: string | null;
    cover2: string | null;
    thumb2: string | null;
    cover2_source_etag: string | null;
    folder: string | null;
    updated_at: string;
}

/** API-013 欄位 → D1 欄位 */
export const COLUMN_OF: Record<EditableField, string> = {
    title: 'title',
    wheelKey: 'wheel_key',
    year: 'year',
    category: 'category',
    categoryNo: 'category_no',
    coverSourceEtag: 'cover_source_etag',
    label: 'label',
    accent: 'accent',
    cover: 'cover',
    thumb: 'thumb',
    cover2: 'cover2',
    thumb2: 'thumb2',
    cover2SourceEtag: 'cover2_source_etag',
    folder: 'folder',
};

export const ALBUM_COLUMNS = [
    'id, title, wheel_key, year, category, category_no',
    'label, accent, cover, cover_source_etag, thumb, cover2, thumb2, cover2_source_etag',
    'folder, updated_at',
].join(', ');

export const toAlbum = (row: AlbumRow) => ({
    id: row.id,
    title: row.title,
    wheelKey: row.wheel_key,
    year: row.year,
    category: row.category,
    categoryNo: row.category_no,
    label: row.label,
    accent: row.accent,
    cover: row.cover,
    coverSourceEtag: row.cover_source_etag,
    thumb: row.thumb,
    // CR-005（D55）：第二張封面；專輯色只跟第一張，冇第二張專輯色
    cover2: row.cover2,
    thumb2: row.thumb2,
    cover2SourceEtag: row.cover2_source_etag,
    // folder：手動改綁嘅名（NULL = 用預期資料夾名）；expectedFolder：計出嚟，唔可以改（CR-004）
    folder: row.folder,
    expectedFolder: expectedFolder(row.category, row.category_no, row.id),
    updatedAt: row.updated_at,
});

export type Album = ReturnType<typeof toAlbum>;
