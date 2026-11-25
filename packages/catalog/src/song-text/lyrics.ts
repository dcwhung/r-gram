/*
 * 歌曲文字嘅歌詞部分（D32）：有任何一行以時間標記開頭 → 同步歌詞，交畀 `parseLrc()`（冇時間標記嘅行逐行報錯）；
 * 全部都冇 → 純文字。行號一律換算返成段文字入面嘅行號。
 */
import {
    parseLrc,
    startsWithTimestamp,
    type LrcErrorCode,
    type PlainLyricLine,
} from '../lrc/parseLrc';
import { charCount, LYRIC_LINE_MAX_CHARS } from './limits';
import type { SongLyrics, SongTextError, SongTextErrorCode } from './types';

/** `EMPTY` 唔會出現：去到 `parseLrc()` 嘅歌詞起碼有一行以時間標記開頭（讀到或者報錯） */
const LRC_ERROR_CODES: Record<LrcErrorCode, SongTextErrorCode> = {
    NO_TIMESTAMP: 'MIXED_TIMESTAMPS',
    INVALID_TIMESTAMP: 'BAD_TIMESTAMP',
    INVALID_OFFSET: 'BAD_OFFSET',
    EMPTY: 'BAD_TIMESTAMP',
};

/** `offset` = 第一行歌詞喺成段文字入面前面有幾多行 */
const readSynced = (section: string[], offset: number, errors: SongTextError[]): SongLyrics => {
    const source = section.join('\n');
    const result = parseLrc(source);
    result.errors.forEach(({ line, code, text }) =>
        errors.push({ line: line + offset, code: LRC_ERROR_CODES[code], text }),
    );
    return { source, synced: true, lines: result.lines };
};

/** 每行 trim；連續空行當一個分段（頭尾已經冇空行） */
const readPlain = (section: string[]): SongLyrics => {
    const lines: PlainLyricLine[] = [];
    section.forEach((raw) => {
        const text = raw.trim();
        if (text === '' && lines.at(-1)?.text === '') return;
        lines.push({ text });
    });
    return { source: section.join('\n'), synced: false, lines };
};

const checkLineLengths = (section: string[], offset: number, errors: SongTextError[]): void =>
    section.forEach((raw, index) => {
        const text = raw.trim();
        if (charCount(text) > LYRIC_LINE_MAX_CHARS)
            errors.push({ line: index + offset + 1, code: 'LINE_TOO_LONG', text });
    });

/**
 * `lines` 係成段文字（已去尾空白），由 `start` 開始係歌詞。頭尾空行刪走；剩低冇嘢 = 冇歌詞（null）。
 */
export const readLyrics = (
    lines: string[],
    start: number,
    errors: SongTextError[],
): SongLyrics | null => {
    const nonBlank = (line: string) => line !== '';
    const first = lines.findIndex((line, index) => index >= start && nonBlank(line));
    if (first < 0) return null;
    const section = lines.slice(first, lines.findLastIndex(nonBlank) + 1);
    const lyrics = section.some(startsWithTimestamp)
        ? readSynced(section, first, errors)
        : readPlain(section);
    checkLineLengths(section, first, errors);
    return lyrics;
};
