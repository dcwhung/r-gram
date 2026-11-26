/*
 * 掃描嘅檔案分類（Technical Spec「CR-004 → 掃描嘅設計 → 檔案分類」、CR-005、CR-006）：純函數，按檔名（唔計資料夾、
 * 唔分大細楷）。歌號 = 檔名開頭 1–3 位數字（後面唔可以再係數字：`2008 remaster` 唔係第 200 首），1 至 999。
 * 其他（`cover.jpeg`、`cover.webp`、`.lrc` 等）= UNKNOWN_EXTENSION（v1 唔擴大）
 */
import { isTrackNo } from '../schema/ids';

/** 有歌號嘅三類 */
export type NumberedKind = 'audio' | 'mv' | 'text';
export type CoverKind = 'cover' | 'cover2';
export type UnmatchedReason = 'UNKNOWN_EXTENSION' | 'NO_TRACK_NUMBER';

export type FileClass =
    | { kind: NumberedKind; no: number }
    | { kind: CoverKind }
    | { kind: 'info' }
    | { kind: 'unmatched'; reason: UnmatchedReason };

/** 用 Map：plain object 會查到 `Object.prototype` 嘅 property（`.constructor`、`.__proto__`） */
const KIND_BY_EXTENSION: ReadonlyMap<string, NumberedKind> = new Map([
    ['m4a', 'audio'],
    ['mp3', 'audio'],
    ['mp4', 'mv'],
    ['m4v', 'mv'],
    ['txt', 'text'],
]);

const COVER_BY_NAME: ReadonlyMap<string, CoverKind> = new Map([
    ['cover.jpg', 'cover'],
    ['cover.png', 'cover'],
    ['cover2.jpg', 'cover2'],
    ['cover2.png', 'cover2'],
]);

/** CR-007（D68）：專輯資料檔，資料夾第一層，唔分大細楷 */
const INFO_FILE_NAME = 'info.txt';

const LEADING_TRACK_NUMBER = /^(\d{1,3})(?!\d)/;

export const fileNameOf = (key: string): string => key.slice(key.lastIndexOf('/') + 1);

export const extensionOf = (name: string): string => {
    const dot = name.lastIndexOf('.');
    return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
};

/** 檔名開頭嘅歌號；冇或者唔喺 1 至 999 → undefined */
export const trackNoOf = (name: string): number | undefined => {
    const digits = LEADING_TRACK_NUMBER.exec(name)?.[1];
    const no = Number(digits);
    return digits !== undefined && isTrackNo(no) ? no : undefined;
};

export const classifyFile = (key: string): FileClass => {
    const name = fileNameOf(key);
    if (name.toLowerCase() === INFO_FILE_NAME) return { kind: 'info' };
    const cover = COVER_BY_NAME.get(name.toLowerCase());
    if (cover) return { kind: cover };
    const kind = KIND_BY_EXTENSION.get(extensionOf(name));
    if (!kind) return { kind: 'unmatched', reason: 'UNKNOWN_EXTENSION' };
    const no = trackNoOf(name);
    return no === undefined ? { kind: 'unmatched', reason: 'NO_TRACK_NUMBER' } : { kind, no };
};
