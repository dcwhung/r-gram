/*
 * 專輯欄位逐個驗證 + 正規化（Technical Spec API-013、「數據庫設計 → albums」、「資料夾名同發行類別」）。
 * 規則同 packages/catalog parseCatalogDocument 對齊（儲存得到 = 生成 catalog 時驗得過），再加長度同控制字元上限。
 * 封面 / 縮圖喺唔喺 assets 要查 D1，喺 validate.ts 做
 */
import { isReleaseCategory, TITLE_MAX_CHARS } from '@r-gram/catalog';
import type { zhHant } from '../i18n/zh-Hant';
import {
    charCount,
    fail,
    HIDDEN_CHARACTER,
    nullable,
    ok,
    text as textRule,
    type Rule as FieldRule,
    type RuleResult as FieldRuleResult,
} from '../lib/fields';

export type Reason = keyof typeof zhHant.albums.reasons;

export type RuleResult = FieldRuleResult<Reason>;

type Rule = FieldRule<Reason>;

/** 碟名、類型、唱片公司、資料夾名：同歌名一樣嘅上限 */
const TEXT_MAX_CHARS = TITLE_MAX_CHARS;
/** 字母盤標記最多兩個字（同 catalog validator） */
const WHEEL_KEY_MAX_CHARS = 2;
const ACCENT = /^#[0-9a-f]{6}$/i;
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
/**
 * 資料夾名係 R2 key 嘅 prefix，亦會砌入播放端網址（MEDIA_BASE + key）：
 * 斜線 / 反斜線會變多層，`?` `#` `%` 令網址斷開或者被解碼（Technical Spec「安全設計 → R2 key 驗證」）
 */
const UNSAFE_IN_FOLDER = /[/\\?#%]/;
/** `.` / `..`：網址正規化會當成「本層 / 上一層」，跳出 MEDIA_BASE 嘅 path */
const DOT_SEGMENT = /^\.{1,2}$/;
/** 任何位置嘅 `..` 都唔收：同手動指定媒體 key 嘅規則一致（backlog B-045 ①、B-049 ②） */
const PARENT_DIRECTORY = '..';
/** `_` 開頭嘅資料夾（例如 `_fonts/`）保留，唔係專輯資料夾（Functional Spec D43） */
const RESERVED_FOLDER_PREFIX = '_';
/** 類別內序號上限：資料夾名最少兩位，三位數已經遠超任何類別嘅發行數 */
export const CATEGORY_NO_MAX = 999;
/** R2 ETag（md5 hex，分段上載會多個 `-N`）；預留引號同將來格式 */
export const SOURCE_ETAG_MAX_CHARS = 128;

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

/** 碟名、類型、唱片公司、資料夾名 */
const text = (required: boolean): Rule => textRule(required, TEXT_MAX_CHARS);

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

/**
 * R2 資料夾名（掃描用 `<folder>/` 做 prefix）：一層、唔可以空、唔可以有 `..`、唔可以 `_` 開頭；
 * null = 用預期資料夾名（`expectedFolder()`，CR-004）
 */
const folder: Rule = (value) => {
    const result = text(true)(value);
    if (!result.ok) return result.reason === 'TOO_LONG' ? result : fail('INVALID_FOLDER');
    const name = result.value as string;
    const unsafe =
        UNSAFE_IN_FOLDER.test(name) ||
        DOT_SEGMENT.test(name) ||
        name.includes(PARENT_DIRECTORY) ||
        name.startsWith(RESERVED_FOLDER_PREFIX);
    return unsafe ? fail('INVALID_FOLDER') : result;
};

/** 六個短名之一（packages/catalog RELEASE_CATEGORIES）；唔可以清走 */
const category: Rule = (value) => (isReleaseCategory(value) ? ok(value) : fail('INVALID_CATEGORY'));

/** 類別內序號：1 至 CATEGORY_NO_MAX 嘅整數；同類別唔重覆喺寫入時驗（store.ts） */
const categoryNo: Rule = (value) =>
    Number.isInteger(value) && (value as number) >= 1 && (value as number) <= CATEGORY_NO_MAX
        ? ok(value)
        : fail('INVALID_ORDINAL');

/**
 * 管理端可以改嘅欄位（API-013）；冇 `enabled`（CR-003）、`id` 建立後不變、`year` 跟 releaseDate。
 * CR-004：`coverSourceEtag` 由管理端喺掃描套用封面之後帶（Functional Spec D41），null = 清走。
 * CR-005（D55）：第二張封面 `cover2` / `thumb2` / `cover2SourceEtag`，逐個欄嘅規則同第一張一樣；
 * 成對、要有第一張要睇改完之後嘅狀態，喺 validate.ts 嘅 secondCoverIssues() 驗
 */
export const FIELD_RULES = {
    title: text(true),
    wheelKey,
    releaseDate: nullable(releaseDate),
    type: text(false),
    category,
    categoryNo,
    coverSourceEtag: nullable(textRule(true, SOURCE_ETAG_MAX_CHARS)),
    label: text(false),
    accent,
    cover: nullable(assetName),
    thumb: nullable(assetName),
    cover2: nullable(assetName),
    thumb2: nullable(assetName),
    cover2SourceEtag: nullable(textRule(true, SOURCE_ETAG_MAX_CHARS)),
    folder: nullable(folder),
} satisfies Record<string, Rule>;

export type EditableField = keyof typeof FIELD_RULES;
