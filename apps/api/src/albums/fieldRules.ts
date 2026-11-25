/*
 * 專輯欄位逐個驗證 + 正規化（Technical Spec API-013、「數據庫設計 → albums」）。
 * 規則同 packages/catalog parseCatalogDocument 對齊（儲存得到 = 生成 catalog 時驗得過），再加長度同控制字元上限。
 * 封面 / 縮圖喺唔喺 assets 要查 D1，喺 validate.ts 做
 */
import { TITLE_MAX_CHARS } from '@r-gram/catalog';
import type { zhHant } from '../i18n/zh-Hant';

export type Reason = keyof typeof zhHant.albums.reasons;

export type RuleResult = { ok: true; value: unknown } | { ok: false; reason: Reason };

type Rule = (value: unknown) => RuleResult;

/** 碟名、類型、唱片公司、資料夾名：同歌名一樣嘅上限 */
const TEXT_MAX_CHARS = TITLE_MAX_CHARS;
/** 字母盤標記最多兩個字（同 catalog validator） */
const WHEEL_KEY_MAX_CHARS = 2;
const ACCENT = /^#[0-9a-f]{6}$/i;
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
/**
 * 文字欄同字母盤標記共用嘅字元規則：控制字元（Cc：換行、tab）、格式字元（Cf：零寬空格、RTL override、BOM）、
 * 行分隔（Zl，U+2028）、段分隔（Zp，U+2029）。畫面上睇唔到或者會亂排版，亦可以砌出假 log 行。
 * 普通空格同全形空格（Zs）照收
 */
const HIDDEN_CHARACTER = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;
/**
 * 資料夾名係 R2 key 嘅 prefix，亦會砌入播放端網址（MEDIA_BASE + key）：
 * 斜線 / 反斜線會變多層，`?` `#` `%` 令網址斷開或者被解碼（Technical Spec「安全設計 → R2 key 驗證」）
 */
const UNSAFE_IN_FOLDER = /[/\\?#%]/;
/** `.` / `..`：網址正規化會當成「本層 / 上一層」，跳出 MEDIA_BASE 嘅 path */
const DOT_SEGMENT = /^\.{1,2}$/;

const ok = (value: unknown): RuleResult => ({ ok: true, value });
const fail = (reason: Reason): RuleResult => ({ ok: false, reason });

/** 按字（code point）計，中文字同 emoji 都當一個字 */
const charCount = (value: string): number => [...value].length;

/** `YYYY-MM-DD` 而且真有其日（`2008-02-30` 唔收） */
export const isCalendarDate = (value: string): boolean => {
    const match = CALENDAR_DATE.exec(value);
    if (!match) return false;
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
};

/** 文字欄：trim 之後存；`required` = 唔可以係空 */
const text =
    (required: boolean): Rule =>
    (value) => {
        if (typeof value !== 'string' || HIDDEN_CHARACTER.test(value)) return fail('INVALID_TEXT');
        const trimmed = value.trim();
        if (required && trimmed === '') return fail('REQUIRED');
        return charCount(trimmed) > TEXT_MAX_CHARS ? fail('TOO_LONG') : ok(trimmed);
    };

const nullable =
    (rule: Rule): Rule =>
    (value) =>
        value === null ? ok(null) : rule(value);

const wheelKey: Rule = (value) => {
    const valid =
        typeof value === 'string' &&
        value !== '' &&
        value.trim() === value &&
        !HIDDEN_CHARACTER.test(value) &&
        charCount(value) <= WHEEL_KEY_MAX_CHARS;
    return valid ? ok(value) : fail('INVALID_WHEEL_KEY');
};

const releaseDate: Rule = (value) =>
    typeof value === 'string' && isCalendarDate(value) ? ok(value) : fail('INVALID_DATE');

/** 存細楷：同一隻色只有一個寫法 */
const accent: Rule = (value) =>
    typeof value === 'string' && ACCENT.test(value)
        ? ok(value.toLowerCase())
        : fail('INVALID_COLOUR');

/** 喺唔喺 assets 之後再查；呢度只擋唔係字串 / 空字串 */
const assetName: Rule = (value) =>
    typeof value === 'string' && value !== '' ? ok(value) : fail('UNKNOWN_ASSET');

/** R2 資料夾名（掃描用 `<folder>/` 做 prefix）：一層、唔可以空、唔可以係 `.` / `..`；null = 用專輯 id */
const folder: Rule = (value) => {
    const result = text(true)(value);
    if (!result.ok) return result.reason === 'TOO_LONG' ? result : fail('INVALID_FOLDER');
    const name = result.value as string;
    return UNSAFE_IN_FOLDER.test(name) || DOT_SEGMENT.test(name) ? fail('INVALID_FOLDER') : result;
};

/** 管理端可以改嘅欄位（API-013）；冇 `enabled`（CR-003）、`id` 建立後不變、`year` 跟 releaseDate */
export const FIELD_RULES = {
    title: text(true),
    wheelKey,
    releaseDate: nullable(releaseDate),
    type: text(false),
    label: text(false),
    accent,
    cover: nullable(assetName),
    thumb: nullable(assetName),
    folder: nullable(folder),
} satisfies Record<string, Rule>;

export type EditableField = keyof typeof FIELD_RULES;

export const isEditableField = (key: string): key is EditableField =>
    Object.hasOwn(FIELD_RULES, key);
