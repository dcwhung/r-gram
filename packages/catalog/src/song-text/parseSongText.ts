/*
 * 歌曲文字 parser（Functional Spec D31、D32、D37；Technical Spec「parseSongText() 嘅規則」）。
 * 管理端即時逐行檢查同 API 儲存驗證用同一份。格式：
 *   第一個非空白行 = 歌名（必填）
 *   之後嘅標籤行：副題 / 曲 / 詞 / 編 / 監 + `：` 或 `:`，次序隨意，各自最多一次；遇到空行或者第一行唔係標籤行就完
 *   之後全部 = 歌詞（可以冇）：全部行有時間標記 = 同步；全部冇 = 純文字；混埋 = 逐行報錯
 */
import { startsWithTimestamp } from '../lrc/parseLrc';
import { CREDIT_FIELDS, type TrackCredits } from '../schema/types';
import { type LabelField, readLabel } from './labels';
import {
    byteLength,
    charCount,
    CREDIT_MAX_CHARS,
    SONG_TEXT_MAX_BYTES,
    SONG_TEXT_MAX_LINES,
    TITLE_MAX_CHARS,
} from './limits';
import { readLyrics } from './lyrics';
import type { SongTextError, SongTextResult } from './types';

/** CRLF、LF、淨係 CR（舊 Mac 格式）都當換行（backlog B-042 ①） */
const LINE_BREAK = /\r\n?|\n/;
const BYTE_ORDER_MARK = /^\uFEFF/;

type LabelValues = Partial<Record<LabelField, string | null>>;

const EMPTY_SONG: SongTextResult = {
    title: '',
    subtitle: null,
    credits: null,
    lyrics: null,
    errors: [],
};

/** 成段文字太大或者太多行：唔再逐行讀，一個錯（行號 0） */
const checkSize = (text: string, lineCount: number): SongTextError | null => {
    if (byteLength(text) > SONG_TEXT_MAX_BYTES) return { line: 0, code: 'TOO_LARGE', text: '' };
    if (lineCount > SONG_TEXT_MAX_LINES) return { line: 0, code: 'TOO_MANY_LINES', text: '' };
    return null;
};

/**
 * 歌名 = 第一個非空白行。冇，或者係時間標記 / 標籤開頭（似係漏咗歌名）→ `TITLE_REQUIRED`，
 * 而嗰行唔當歌名，照當標籤或者歌詞讀落去（其他錯一樣報到）。回傳歌名同下一行嘅 index。
 */
const readTitle = (lines: string[], errors: SongTextError[]): { title: string; next: number } => {
    const index = lines.findIndex((line) => line.trim() !== '');
    const text = (lines[index] ?? '').trim();
    if (index < 0 || startsWithTimestamp(text) || readLabel(text)) {
        errors.push({ line: Math.max(index, 0) + 1, code: 'TITLE_REQUIRED', text });
        return { title: '', next: index < 0 ? lines.length : index };
    }
    if (charCount(text) > TITLE_MAX_CHARS)
        errors.push({ line: index + 1, code: 'TITLE_TOO_LONG', text });
    return { title: text, next: index + 1 };
};

const lengthError = (field: LabelField, value: string | null): SongTextError['code'] | null => {
    const max = field === 'subtitle' ? TITLE_MAX_CHARS : CREDIT_MAX_CHARS;
    if (value === null || charCount(value) <= max) return null;
    return field === 'subtitle' ? 'TITLE_TOO_LONG' : 'CREDIT_TOO_LONG';
};

/** 由 `start` 起讀標籤行；回傳讀到嘅值同歌詞開始嘅 index */
const readLabels = (lines: string[], start: number, errors: SongTextError[]) => {
    const values: LabelValues = {};
    let index = start;
    for (; index < lines.length; index += 1) {
        const text = (lines[index] ?? '').trim();
        const label = readLabel(text);
        if (!label) break;
        const line = index + 1;
        if (Object.hasOwn(values, label.field)) {
            errors.push({ line, code: 'DUPLICATE_LABEL', text }); // 留第一次嘅值
            continue;
        }
        values[label.field] = label.value;
        const tooLong = lengthError(label.field, label.value);
        if (tooLong) errors.push({ line, code: tooLong, text });
    }
    return { values, lyricsStart: index };
};

const creditsOf = (values: LabelValues): TrackCredits | null => {
    const credits = {
        composer: values.composer ?? null,
        lyricist: values.lyricist ?? null,
        arranger: values.arranger ?? null,
        producer: values.producer ?? null,
    };
    return CREDIT_FIELDS.some((field) => credits[field] !== null) ? credits : null;
};

/**
 * 解析成首歌嘅文字。`errors` 按行號排；有錯就唔可以儲存。CRLF、LF 同淨係 CR 一樣；每行尾嘅空白唔計。
 */
export const parseSongText = (text: string): SongTextResult => {
    const lines = text
        .replace(BYTE_ORDER_MARK, '')
        .split(LINE_BREAK)
        .map((line) => line.trimEnd());
    const sizeError = checkSize(text, lines.length);
    if (sizeError) return { ...EMPTY_SONG, errors: [sizeError] };
    const errors: SongTextError[] = [];
    const { title, next } = readTitle(lines, errors);
    const { values, lyricsStart } = readLabels(lines, next, errors);
    const lyrics = readLyrics(lines, lyricsStart, errors);
    const credits = creditsOf(values);
    // sort 係 stable：同一行嘅錯保持發現次序
    errors.sort((a, b) => a.line - b.line);
    return { title, subtitle: values.subtitle ?? null, credits, lyrics, errors };
};
