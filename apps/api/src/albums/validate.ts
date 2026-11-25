/*
 * 新增（API-011）/ 修改（API-013）專輯嘅 body 驗證：錯誤一次過列晒（path + reason），
 * 管理端可以喺對應欄位旁邊顯示（US-102「驗證錯誤顯示喺對應欄位旁邊」）
 */
import { isAlbumId } from '@r-gram/catalog';
import type { JsonObject } from '../lib/http';
import { FIELD_RULES, isEditableField, type EditableField, type Reason } from './fieldRules';

export interface FieldIssue {
    path: string;
    reason: Reason;
}

export type AlbumFields = Partial<Record<EditableField, unknown>>;

export interface ParsedFields {
    fields: AlbumFields;
    issues: FieldIssue[];
}

/** 專輯 id 上限：歌 id 係 `<albumId>-<6 位>`，亦會出現喺 R2 key 同網址；64 已經好鬆 */
export const ALBUM_ID_MAX_CHARS = 64;
const ID_KEY = 'id';
/** 未知欄位名原樣回傳做 details[].path 時嘅上限：100 KB 嘅 key 唔可以變成 100 KB 嘅錯誤回應 */
export const UNKNOWN_KEY_MAX_CHARS = 64;

/** 按字（code point）截短，唔會切開 emoji / 罕見字嘅 surrogate pair */
const boundedPath = (key: string): string => [...key].slice(0, UNKNOWN_KEY_MAX_CHARS).join('');

/** body 入面除咗 `skip` 之外嘅 key：可以改嘅就驗，其他（包括 `enabled`）一律 NOT_EDITABLE */
export const parseFields = (body: JsonObject, skip: readonly string[] = []): ParsedFields => {
    const fields: AlbumFields = {};
    const issues: FieldIssue[] = [];
    for (const [key, value] of Object.entries(body)) {
        if (skip.includes(key)) continue;
        if (!isEditableField(key)) {
            issues.push({ path: boundedPath(key), reason: 'NOT_EDITABLE' });
            continue;
        }
        const result = FIELD_RULES[key](value);
        if (result.ok) fields[key] = result.value;
        else issues.push({ path: key, reason: result.reason });
    }
    return { fields, issues };
};

const idIssue = (id: unknown): FieldIssue | undefined => {
    if (id === undefined || id === '') return { path: ID_KEY, reason: 'REQUIRED' };
    const valid = typeof id === 'string' && id.length <= ALBUM_ID_MAX_CHARS && isAlbumId(id);
    return valid ? undefined : { path: ID_KEY, reason: 'INVALID_ID' };
};

/** 新增：id、title 必填；其他欄同修改一樣 */
export const parseCreate = (body: JsonObject): ParsedFields & { id: string } => {
    const issue = idIssue(body[ID_KEY]);
    const parsed = parseFields(body, [ID_KEY]);
    const issues = issue ? [issue, ...parsed.issues] : parsed.issues;
    if (body.title === undefined) issues.push({ path: 'title', reason: 'REQUIRED' });
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
