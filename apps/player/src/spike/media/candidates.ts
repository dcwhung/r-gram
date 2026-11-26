/*
 * 媒體 bucket 冇列目錄：由 info.txt 嘅曲目砌可能嘅檔名（`NN 歌名.<副檔名>`，同掃描嘅分類一樣，
 * packages/catalog `classifyFile`），逐個問。
 */
import { type AlbumInfoTrack, mediaUrl } from '@r-gram/catalog';

export type MediaKind = 'audio' | 'mv';

/** 先試常用嗰個 */
export const EXTENSIONS: Readonly<Record<MediaKind, readonly string[]>> = {
    audio: ['m4a', 'mp3'],
    mv: ['mp4', 'm4v'],
};
export const COVER_NAMES: readonly string[] = ['cover.jpg', 'cover.png'];
export const INFO_FILE = 'info.txt';

const NUMBER_DIGITS = 2;

/** `01` 先，再試冇補零嘅 `1`（兩個一樣就得一個） */
const numberPrefixes = (no: number): string[] => [
    ...new Set([String(no).padStart(NUMBER_DIGITS, '0'), String(no)]),
];

export const candidateNames = (track: AlbumInfoTrack, kind: MediaKind): string[] =>
    numberPrefixes(track.no).flatMap((prefix) =>
        EXTENSIONS[kind].map((extension) => `${prefix} ${track.title}.${extension}`),
    );

/** 資料夾入面一個檔嘅網址：每段各自 percent-encode（空格、中文、`[]`、`#`、`?`） */
export const folderFileUrl = (base: string, folder: string, name: string): string =>
    mediaUrl(base, `${folder}/${name}`);
