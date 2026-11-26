/*
 * `info.txt` 嘅行（Functional Spec D68）：標籤行（`標籤：值`）同曲目行（`歌號 + 分隔 + 歌名`）。
 * 每行之前已經 trim（連全形空格）。數字收半形同全形（人手打嘅檔，`１２.` 同 `12.` 一樣）；歌名照原文，唔轉全形半形
 */
import { isTrackNo } from '../schema/ids';
import { isAlbumYear } from '../schema/year';
import { withoutHiddenCharacters } from '../text/hiddenCharacters';

export type InfoField = 'title' | 'year' | 'tracks';

/** 標籤同別名（D68）；改呢個表就得。`曲目` 係曲目表嘅開頭，冇值 */
export const INFO_LABELS: ReadonlyMap<string, InfoField> = new Map([
    ['唱片名稱', 'title'],
    ['專輯名稱', 'title'],
    ['發行年份', 'year'],
    ['年份', 'year'],
    ['發行日期', 'year'],
    ['曲目', 'tracks'],
]);

/** `formatAlbumInfo()` 用嘅標籤（每個欄嘅第一個名）同冒號 */
export const INFO_LABEL_OF: Readonly<Record<InfoField, string>> = {
    title: '唱片名稱',
    year: '發行年份',
    tracks: '曲目',
};
export const INFO_COLON = '：';

const DIGIT = '[0-9０-９]';
const LABEL_LINE = new RegExp(`^(${[...INFO_LABELS.keys()].join('|')})\\s*(?:[：:](.*))?$`, 'u');
/**
 * 歌號 1–3 位，之後一定要有分隔（`.`、`、`、`)`、冒號，半形全形都得；S-161：`-`、`–`、`—` 亦得，
 * 例如 `01 - 歌名`）或者空白，再係歌名
 */
const TRACK_LINE = new RegExp(`^(${DIGIT}{1,3})(?:\\s*[.．、､)）:：\\-–—]|\\s)\\s*(.+)$`, 'u');
/** 開頭四位數字，後面唔可以再係數字（`2026年`、`2026-11-27` 得；`20261` 唔得） */
const LEADING_YEAR = new RegExp(`^(${DIGIT}{4})(?!${DIGIT})`, 'u');

/** 全形數字（U+FF10–FF19）同半形差 0xFEE0 */
const FULL_WIDTH_OFFSET = 0xfee0;
const toAsciiDigits = (digits: string): string =>
    digits.replace(/[０-９]/gu, (d) => String.fromCharCode(d.charCodeAt(0) - FULL_WIDTH_OFFSET));

/** 標籤行；`曲目` 之外冇冒號唔算。值 = 第一個冒號之後成段（trim） */
export const readInfoLabel = (line: string): { field: InfoField; value: string } | null => {
    const match = LABEL_LINE.exec(line);
    const field = INFO_LABELS.get(match?.[1] ?? '');
    const value = match?.[2];
    if (!field || (value === undefined && field !== 'tracks')) return null;
    return { field, value: (value ?? '').trim() };
};

/** 歌名、碟名：去走睇唔到嘅字元（S-158）再 trim；淨係得呢啲字 = 空 */
export const cleanTitle = (value: string): string => withoutHiddenCharacters(value).trim();

/** 曲目行；歌號唔喺 1–999 或者冇歌名（包括淨係睇唔到嘅字元）→ null */
export const readTrackLine = (line: string): { no: number; title: string } | null => {
    const match = TRACK_LINE.exec(line);
    if (!match) return null;
    const no = Number(toAsciiDigits(match[1] ?? ''));
    const title = cleanTitle(match[2] ?? '');
    return isTrackNo(no) && title !== '' ? { no, title } : null;
};

/** 年份值（已 trim、唔係空）；讀唔到或者唔喺範圍 → null */
export const readYear = (value: string): number | null => {
    const digits = LEADING_YEAR.exec(value)?.[1];
    const year = Number(toAsciiDigits(digits ?? ''));
    return digits !== undefined && isAlbumYear(year) ? year : null;
};
