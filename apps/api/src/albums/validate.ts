/*
 * 新增（API-011）/ 修改（API-013）專輯嘅 body 驗證：錯誤一次過列晒（path + reason），
 * 管理端可以喺對應欄位旁邊顯示（US-102「驗證錯誤顯示喺對應欄位旁邊」）
 */
import { isAlbumId } from '@r-gram/catalog';
import type { JsonObject } from '../lib/http';
import {
    parseFieldsWith,
    type FieldIssue as Issue,
    type ParsedFields as Parsed,
} from '../lib/fields';
import { FIELD_RULES, type EditableField, type Reason } from './fieldRules';

export type FieldIssue = Issue<Reason>;

export type AlbumFields = Partial<Record<EditableField, unknown>>;

export type ParsedFields = Parsed<EditableField, Reason>;

/** 專輯 id 上限：歌 id 係 `<albumId>-<6 位>`，亦會出現喺 R2 key 同網址；64 已經好鬆 */
export const ALBUM_ID_MAX_CHARS = 64;
const ID_KEY = 'id';

/** body 入面除咗 `skip` 之外嘅 key：可以改嘅就驗，其他（包括 `enabled`）一律 NOT_EDITABLE */
export const parseFields = (body: JsonObject, skip: readonly string[] = []): ParsedFields =>
    parseFieldsWith(FIELD_RULES, body, skip);

const idIssue = (id: unknown): FieldIssue | undefined => {
    if (id === undefined || id === '') return { path: ID_KEY, reason: 'REQUIRED' };
    const valid = typeof id === 'string' && id.length <= ALBUM_ID_MAX_CHARS && isAlbumId(id);
    return valid ? undefined : { path: ID_KEY, reason: 'INVALID_ID' };
};

/** 新增：id、title、category 必填（CR-004）；其他欄同修改一樣 */
export const parseCreate = (body: JsonObject): ParsedFields & { id: string } => {
    const issue = idIssue(body[ID_KEY]);
    const parsed = parseFields(body, [ID_KEY]);
    const issues = issue ? [issue, ...parsed.issues] : parsed.issues;
    if (body.title === undefined) issues.push({ path: 'title', reason: 'REQUIRED' });
    if (body.category === undefined) issues.push({ path: 'category', reason: 'REQUIRED' });
    return { id: body[ID_KEY] as string, fields: parsed.fields, issues };
};

/** 封面 / 縮圖要係已上載嘅圖（assets 表）；回唔存在嘅欄位 */
export const unknownAssetIssues = async (
    db: D1Database,
    fields: AlbumFields,
): Promise<FieldIssue[]> => {
    const named = (['cover', 'thumb'] as const).filter((key) => typeof fields[key] === 'string');
    if (named.length === 0) return [];
    const names = named.map((key) => fields[key] as string);
    const found = await db
        .prepare(`SELECT name FROM assets WHERE name IN (${names.map(() => '?').join(', ')})`)
        .bind(...names)
        .all<{ name: string }>();
    const existing = new Set(found.results.map((row) => row.name));
    return named
        .filter((key) => !existing.has(fields[key] as string))
        .map((key) => ({ path: key, reason: 'UNKNOWN_ASSET' }));
};
