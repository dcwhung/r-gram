/*
 * API-031 body 嘅形狀（T-025；Technical Spec API-031、CR-006「掃描建立歌曲」）：
 * `{ media?, songTexts?, create?, clearAudio? }`，每個都係 list，最多 SCAN_APPLY_MAX_ITEMS 項；
 * 每項嘅欄位逐個驗（path = `create[0].no` 呢類），錯誤一次過列晒。呢度只驗形狀；
 * 「喺唔喺呢張碟嘅資料夾」「屬唔屬呢張碟」等等喺 applyContext.ts
 */
import { isTrackNo, type MediaKind } from '@r-gram/catalog';
import { SCAN_APPLY_MAX_ITEMS } from '../config';
import { ok, parseFieldsWith, type Rule } from '../lib/fields';
import { isJsonObject, type JsonObject } from '../lib/http';
import type { ScanDetail, ScanReason } from './errors';

export interface MediaItem {
    trackId: string;
    kind: MediaKind;
    key: string;
}

export interface TextItem {
    trackId: string;
    key: string;
    etag: string;
    force: boolean;
}

export interface TextRef {
    key: string;
    etag: string;
}

export interface CreateItem {
    no: number;
    audioKey: string;
    mvKey: string | null;
    text: TextRef | null;
}

export interface ClearItem {
    trackId: string;
    audioKey: string;
}

export interface ApplyBody {
    media: MediaItem[];
    songTexts: TextItem[];
    create: CreateItem[];
    clearAudio: ClearItem[];
}

export type ListName = keyof ApplyBody;

/** 驗證同回應嘅次序 */
export const LIST_NAMES: readonly ListName[] = ['media', 'songTexts', 'create', 'clearAudio'];

type Check = (value: unknown) => ScanReason | undefined;

const isText = (value: unknown): value is string => typeof value === 'string' && value !== '';

const textCheck: Check = (value) => (isText(value) ? undefined : 'INVALID_VALUE');
const kindCheck: Check = (value) =>
    value === 'audio' || value === 'mv' ? undefined : 'INVALID_VALUE';
const forceCheck: Check = (value) => (typeof value === 'boolean' ? undefined : 'INVALID_VALUE');
const numberCheck: Check = (value) => (isTrackNo(value) ? undefined : 'INVALID_NUMBER');
const nullableText: Check = (value) => (value === null ? undefined : textCheck(value));
const textRefCheck: Check = (value) =>
    value === null ||
    (isJsonObject(value) &&
        isText(value.key) &&
        isText(value.etag) &&
        Object.keys(value).length === 2)
        ? undefined
        : 'INVALID_VALUE';

interface ItemSchema {
    required: Readonly<Record<string, Check>>;
    optional: Readonly<Record<string, Check>>;
}

const SCHEMAS: Readonly<Record<ListName, ItemSchema>> = {
    media: { required: { trackId: textCheck, kind: kindCheck, key: textCheck }, optional: {} },
    songTexts: {
        required: { trackId: textCheck, key: textCheck, etag: textCheck },
        optional: { force: forceCheck },
    },
    create: {
        required: { no: numberCheck, audioKey: textCheck },
        optional: { mvKey: nullableText, text: textRefCheck },
    },
    clearAudio: { required: { trackId: textCheck, audioKey: textCheck }, optional: {} },
};

const fieldIssues = (item: JsonObject, schema: ItemSchema, path: string): ScanDetail[] => {
    const issues: ScanDetail[] = [];
    for (const [field, check] of Object.entries(schema.required)) {
        const reason = field in item ? check(item[field]) : 'REQUIRED';
        if (reason) issues.push({ path: `${path}.${field}`, reason });
    }
    for (const field of Object.keys(item)) {
        if (field in schema.required) continue;
        const check = schema.optional[field];
        const reason = check ? check(item[field]) : 'NOT_EDITABLE';
        if (reason) issues.push({ path: `${path}.${field}`, reason });
    }
    return issues;
};

const listIssues = (name: ListName, value: unknown): ScanDetail[] => {
    if (value === undefined) return [];
    if (!Array.isArray(value)) return [{ path: name, reason: 'NOT_A_LIST' }];
    if (value.length > SCAN_APPLY_MAX_ITEMS) return [{ path: name, reason: 'TOO_MANY_ITEMS' }];
    return value.flatMap((item: unknown, index) => {
        const path = `${name}[${index}]`;
        if (!isJsonObject(item)) return [{ path, reason: 'NOT_AN_OBJECT' as const }];
        return fieldIssues(item, SCHEMAS[name], path);
    });
};

const KNOWN_LISTS: Readonly<Record<ListName, Rule<never>>> = {
    media: ok,
    songTexts: ok,
    create: ok,
    clearAudio: ok,
};

/** 形狀啱晒先回 body（未知嘅頂層欄 = NOT_EDITABLE） */
export const readApplyShape = (raw: JsonObject): ApplyBody | ScanDetail[] => {
    // 未知欄位：同其他內容 API 一樣嘅上限同截短（lib/fields.ts）
    const unknown = parseFieldsWith(KNOWN_LISTS, raw).issues;
    const issues = [...unknown, ...LIST_NAMES.flatMap((name) => listIssues(name, raw[name]))];
    if (issues.length > 0) return issues;
    const list = <T>(name: ListName) => (raw[name] ?? []) as T[];
    return {
        media: list<MediaItem>('media'),
        songTexts: list<Omit<TextItem, 'force'> & { force?: boolean }>('songTexts').map((item) => ({
            ...item,
            force: item.force ?? false,
        })),
        create: list<Partial<CreateItem> & Pick<CreateItem, 'no' | 'audioKey'>>('create').map(
            (item) => ({
                no: item.no,
                audioKey: item.audioKey,
                mvKey: item.mvKey ?? null,
                text: item.text ?? null,
            }),
        ),
        clearAudio: list<ClearItem>('clearAudio'),
    };
};
