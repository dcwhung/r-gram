/*
 * 似係標籤但會當歌詞嘅行（backlog B-038）：照 D31，標籤段遇到第一個空行就完，
 * 所以「歌名、空行、曲：…」入面嘅「曲：」會冇聲冇氣咁變成歌詞。呢度唔改規則、唔擋儲存，
 * 只係搵出呢啲行（歌詞開頭連續嘅標籤樣行），畀 API 回應同管理端即時檢查做提示
 */
import { readLabel } from './labels';
import { songLines } from './lines';

const isBlank = (line: string): boolean => line === '';
const looksLikeLabel = (line: string): boolean => readLabel(line.trim()) !== null;

/** 由 `start` 起跳過符合 `skip` 嘅行，回第一個唔符合嘅 index */
const skipWhile = (lines: string[], start: number, skip: (line: string) => boolean): number => {
    let index = start;
    while (index < lines.length && skip(lines[index] ?? '')) index += 1;
    return index;
};

/** 回行號（由 1 開始，同 `parseSongText()` 嘅錯誤一樣計）；冇就回空陣列 */
export const labelLinesAfterGap = (text: string): number[] => {
    const lines = songLines(text);
    const title = lines.findIndex((line) => !isBlank(line));
    if (title < 0) return [];
    const labelsEnd = skipWhile(lines, title + 1, looksLikeLabel);
    if (!isBlank(lines[labelsEnd] ?? 'end')) return [];
    const lyricsStart = skipWhile(lines, labelsEnd, isBlank);
    const lyricsLabelsEnd = skipWhile(lines, lyricsStart, looksLikeLabel);
    return Array.from({ length: lyricsLabelsEnd - lyricsStart }, (_, i) => lyricsStart + i + 1);
};
