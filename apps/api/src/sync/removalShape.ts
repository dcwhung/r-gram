/*
 * API-035 body 嘅形狀（Technical Spec API-035）：`{ items: [{ kind, albumId, trackId?, key?, slot? }] }`，
 * 最多 SYNC_REMOVALS_MAX 項。每類要嘅欄：album = albumId；track = + trackId；audio / mv / text = + trackId、key
 *（D1 而家記住嘅連結）；cover = + slot。API-033 / 034 回應入面顯示用嘅 `no`、`title`、`folder` 照收（唔用），
 * 所以管理端可以原樣傳返 pendingRemovals / missingAlbums。其他欄 = NOT_EDITABLE；錯誤一次過列晒（path = `items[0].kind`）
 */
import type { CoverKind, RemovalKind } from '@r-gram/catalog';
import { SYNC_REMOVALS_MAX } from '../config';
import { ok, parseFieldsWith, type Rule } from '../lib/fields';
import { isJsonObject, type JsonObject } from '../lib/http';
import type { SyncDetail, SyncReason } from './errors';

export interface RemovalItem {
    kind: RemovalKind;
    albumId: string;
    trackId?: string;
    key?: string;
    slot?: CoverKind;
}

const ITEMS = 'items';
const KINDS: readonly RemovalKind[] = ['album', 'track', 'audio', 'mv', 'text', 'cover'];
const SLOTS: readonly CoverKind[] = ['cover', 'cover2'];

type Check = (value: unknown) => SyncReason | undefined;

const isText = (value: unknown): value is string => typeof value === 'string' && value !== '';
const textCheck: Check = (value) => (isText(value) ? undefined : 'INVALID_VALUE');
const slotCheck: Check = (value) =>
    SLOTS.includes(value as CoverKind) ? undefined : 'INVALID_VALUE';
const anything: Check = () => undefined;

const FILE_FIELDS = { trackId: textCheck, key: textCheck };

/** 每類嘅必填欄（albumId 一定要） */
const REQUIRED: Readonly<Record<RemovalKind, Readonly<Record<string, Check>>>> = {
    album: {},
    track: { trackId: textCheck },
    audio: FILE_FIELDS,
    mv: FILE_FIELDS,
    text: FILE_FIELDS,
    cover: { slot: slotCheck },
};

/** 顯示用、照收唔用 */
const DISPLAY: Readonly<Record<string, Check>> = {
    no: anything,
    title: anything,
    folder: anything,
};

const fieldIssues = (item: JsonObject, path: string): SyncDetail[] => {
    const issue = (field: string, reason: SyncReason | undefined): SyncDetail[] =>
        reason ? [{ path: `${path}.${field}`, reason }] : [];
    const kind = item.kind as RemovalKind;
    const kindIssues = issue('kind', KINDS.includes(kind) ? undefined : 'INVALID_VALUE');
    const idIssues =
        'albumId' in item
            ? issue('albumId', textCheck(item.albumId))
            : issue('albumId', 'REQUIRED');
    if (kindIssues.length > 0) return [...kindIssues, ...idIssues];
    const required = REQUIRED[kind];
    const missing = Object.keys(required).flatMap((field) =>
        field in item ? issue(field, required[field]?.(item[field])) : issue(field, 'REQUIRED'),
    );
    const known = new Set(['kind', 'albumId', ...Object.keys(required), ...Object.keys(DISPLAY)]);
    const unknown = Object.keys(item).flatMap((field) =>
        known.has(field) ? [] : issue(field, 'NOT_EDITABLE'),
    );
    return [...idIssues, ...missing, ...unknown];
};

const itemsIssues = (value: unknown): SyncDetail[] => {
    if (value === undefined) return [{ path: ITEMS, reason: 'REQUIRED' }];
    if (!Array.isArray(value)) return [{ path: ITEMS, reason: 'NOT_A_LIST' }];
    if (value.length > SYNC_REMOVALS_MAX) return [{ path: ITEMS, reason: 'TOO_MANY_ITEMS' }];
    return value.flatMap((item: unknown, index) => {
        const path = `${ITEMS}[${index}]`;
        return isJsonObject(item)
            ? fieldIssues(item, path)
            : [{ path, reason: 'NOT_AN_OBJECT' as const }];
    });
};

const KNOWN: Readonly<Record<typeof ITEMS, Rule<never>>> = { items: ok };

const toItem = (raw: JsonObject): RemovalItem => {
    const { kind, albumId, trackId, key, slot } = raw as unknown as RemovalItem;
    return {
        kind,
        albumId,
        ...(trackId && { trackId }),
        ...(key && { key }),
        ...(slot && { slot }),
    };
};

/** 形狀啱晒先回 items */
export const readRemovals = (
    raw: JsonObject,
): { items: RemovalItem[] } | { issues: SyncDetail[] } => {
    const unknown = parseFieldsWith(KNOWN, raw).issues;
    const issues = [...unknown, ...itemsIssues(raw[ITEMS])];
    if (issues.length > 0) return { issues };
    return { items: (raw[ITEMS] as JsonObject[]).map(toItem) };
};
