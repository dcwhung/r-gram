/*
 * 同步嘅檢查結果：歌曲文字檔讀完之後嘅結果、上次結果照搬、排次序同上限（Functional Spec D72、D77；
 * Technical Spec「CR-007 → 同步嘅設計」步驟 7）
 */
import type { SongTextHintCode } from '../song-text/types';
import { checkOf, CHECKS_MAX, type Check, type CheckCode } from './checks';
import { titleKey } from './titleKey';

/** 讀咗嘅 `.txt`：有錯 = title null；`reason` = 歌曲文字錯誤碼或者檔案層面嘅碼（第 0 行） */
export interface TextReadSummary {
    title: string | null;
    errors: readonly { line: number; reason: string }[];
    hints: readonly { line: number; code: SongTextHintCode }[];
}

export interface TextCheckInput {
    no: number;
    key: string;
    /** 同 `.txt` 第一行比較嘅歌名；null = 唔比 */
    compareTitle: string | null;
    read: TextReadSummary;
}

/** 檔案層面嘅錯誤（太大、唔係 UTF-8、搵唔到）喺第 0 行：唔寫行號 */
const FILE_LINE = 0;

const errorChecks = ({ no, key, read }: TextCheckInput): Check[] =>
    read.errors.map(({ line, reason }) =>
        checkOf('TEXT_INVALID', line === FILE_LINE ? { key, no } : { key, no, line }, {
            no,
            reason,
        }),
    );

const mismatchChecks = ({ no, key, compareTitle, read }: TextCheckInput): Check[] => {
    const { title } = read;
    if (title === null || compareTitle === null || titleKey(title) === titleKey(compareTitle))
        return [];
    return [checkOf('TITLE_MISMATCH', { key, no }, { no, title: compareTitle, other: title })];
};

export const textChecks = (input: TextCheckInput): Check[] => [
    ...errorChecks(input),
    ...mismatchChecks(input),
    ...input.read.hints.map(({ line, code }) =>
        checkOf(code, { key: input.key, no: input.no, line }, { no: input.no }),
    ),
];

/** 由檔案內容出嘅檢查結果：個檔冇重新讀（ETag 冇變）就照搬上次嘅 */
const CONTENT_CODES: ReadonlySet<CheckCode> = new Set<CheckCode>([
    'INFO_BAD_ENCODING',
    'INFO_TOO_LARGE',
    'INFO_UNKNOWN_LINE',
    'INFO_DUPLICATE_LABEL',
    'INFO_DUPLICATE_NUMBER',
    'INFO_BAD_YEAR',
    'INFO_NO_TITLE',
    'INFO_TOO_LONG',
    'TEXT_INVALID',
    'TITLE_MISMATCH',
    'SUBTITLE_IGNORED',
    'COVER_FAILED',
    'COVER_NOT_SQUARE',
]);

export const carriedChecks = (stored: readonly Check[], keys: ReadonlySet<string>): Check[] =>
    stored.filter(({ key, code }) => key !== undefined && keys.has(key) && CONTENT_CODES.has(code));

/** 專輯層面（冇歌號）排先 */
const ALBUM_LEVEL = -1;

const compareText = (a: string, b: string): number => {
    if (a === b) return 0;
    return a < b ? -1 : 1;
};

const byPlace = (a: Check, b: Check): number =>
    (a.no ?? ALBUM_LEVEL) - (b.no ?? ALBUM_LEVEL) ||
    compareText(a.key ?? '', b.key ?? '') ||
    (a.line ?? Number.MAX_SAFE_INTEGER) - (b.line ?? Number.MAX_SAFE_INTEGER);

/** 專輯層面 → 歌號 → 檔 → 行號（講成個檔嘅排嗰個檔最尾）；最多 CHECKS_MAX 條（albums.checks） */
export const sortChecks = (checks: readonly Check[]): Check[] =>
    [...checks].sort(byPlace).slice(0, CHECKS_MAX);
