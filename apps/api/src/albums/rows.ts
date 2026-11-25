/* albums 表嘅行 ⇄ API 物件（camelCase）；欄位名對照集中喺度，SQL 只用呢度嘅常數砌欄位名 */
import type { EditableField } from './fieldRules';

export interface AlbumRow {
    id: string;
    title: string;
    wheel_key: string;
    release_date: string | null;
    year: number | null;
    type: string;
    label: string;
    accent: string;
    cover: string | null;
    thumb: string | null;
    folder: string | null;
    updated_at: string;
}

/** API-013 欄位 → D1 欄位（`year` 唔喺度：跟 releaseDate 計） */
export const COLUMN_OF: Record<EditableField, string> = {
    title: 'title',
    wheelKey: 'wheel_key',
    releaseDate: 'release_date',
    type: 'type',
    label: 'label',
    accent: 'accent',
    cover: 'cover',
    thumb: 'thumb',
    folder: 'folder',
};

export const ALBUM_COLUMNS =
    'id, title, wheel_key, release_date, year, type, label, accent, cover, thumb, folder, updated_at';

/** 顯示用年份 = 發行日期嘅年；冇日期就冇年份 */
const YEAR_DIGITS = 4;
export const yearOf = (releaseDate: unknown): number | null =>
    typeof releaseDate === 'string' ? Number(releaseDate.slice(0, YEAR_DIGITS)) : null;

export const toAlbum = (row: AlbumRow) => ({
    id: row.id,
    title: row.title,
    wheelKey: row.wheel_key,
    releaseDate: row.release_date,
    year: row.year,
    type: row.type,
    label: row.label,
    accent: row.accent,
    cover: row.cover,
    thumb: row.thumb,
    folder: row.folder,
    updatedAt: row.updated_at,
});

export type Album = ReturnType<typeof toAlbum>;
