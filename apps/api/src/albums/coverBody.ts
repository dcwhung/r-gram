/*
 * API-017 嘅 body（T-106；Technical Spec API-017）：
 * `{ slot: 'cover'｜'cover2', cover, thumb, sourceKey, sourceEtag, accent?, notSquare? }`。
 * cover / thumb = API-050 回嘅圖檔名（`<hash>.<ext>`）；sourceKey / sourceEtag = 同步 coverJobs 嘅 key 同 etag；
 * accent（#rrggbb）只收第一張（D69：專輯色只跟第一張封面）；notSquare = 管理端置中裁切咗（COVER_NOT_SQUARE 提示）。
 * 其他欄 = NOT_EDITABLE；錯誤一次過列晒
 */
import type { CoverKind } from '@r-gram/catalog';
import { formatOfImageName } from '../assets/imageName';
import { ok, parseFieldsWith, type FieldIssue, type Rule } from '../lib/fields';
import type { JsonObject } from '../lib/http';
import { MEDIA_ETAG } from '../media/writeText';
import type { AlbumReason } from './errors';

export interface CoverBody {
    slot: CoverKind;
    cover: string;
    thumb: string;
    sourceKey: string;
    sourceEtag: string;
    /** 冇 = 專輯色唔郁 */
    accent: string | null;
    notSquare: boolean;
}

type Field = 'slot' | 'cover' | 'thumb' | 'sourceKey' | 'sourceEtag' | 'accent' | 'notSquare';

const SLOTS: readonly unknown[] = ['cover', 'cover2'];
const ACCENT = /^#[0-9a-f]{6}$/i;
/** key 長度上限（R2 key 最長 1024 bytes） */
const SOURCE_KEY_MAX_CHARS = 1024;
const REQUIRED: readonly Field[] = ['slot', 'cover', 'thumb', 'sourceKey', 'sourceEtag'];

const when =
    (test: (value: unknown) => boolean): Rule<AlbumReason> =>
    (value) =>
        test(value) ? ok(value) : { ok: false, reason: 'INVALID_VALUE' };

const isText = (value: unknown): value is string => typeof value === 'string';

const RULES: Readonly<Record<Field, Rule<AlbumReason>>> = {
    slot: when((value) => SLOTS.includes(value)),
    cover: when((value) => isText(value) && formatOfImageName(value) !== undefined),
    thumb: when((value) => isText(value) && formatOfImageName(value) !== undefined),
    sourceKey: when(
        (value) => isText(value) && value !== '' && value.length <= SOURCE_KEY_MAX_CHARS,
    ),
    sourceEtag: when((value) => isText(value) && MEDIA_ETAG.test(value)),
    accent: when((value) => isText(value) && ACCENT.test(value)),
    notSquare: when((value) => typeof value === 'boolean'),
};

const shapeIssues = (raw: JsonObject): FieldIssue<AlbumReason>[] => {
    const { issues } = parseFieldsWith(RULES, raw);
    const missing = REQUIRED.filter((field) => !(field in raw)).map(
        (path): FieldIssue<AlbumReason> => ({ path, reason: 'REQUIRED' }),
    );
    const accentOnSecond =
        raw.slot === 'cover2' && 'accent' in raw
            ? [{ path: 'accent', reason: 'NOT_EDITABLE' as const }]
            : [];
    return [...missing, ...issues, ...accentOnSecond];
};

export const readCoverBody = (
    raw: JsonObject,
): { body: CoverBody } | { issues: FieldIssue<AlbumReason>[] } => {
    const issues = shapeIssues(raw);
    if (issues.length > 0) return { issues };
    const fields = raw as unknown as CoverBody;
    const accent = isText(raw.accent) ? raw.accent.toLowerCase() : null;
    return { body: { ...fields, accent, notSquare: raw.notSquare === true } };
};
