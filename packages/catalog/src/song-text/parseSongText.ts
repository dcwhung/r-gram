/*
 * 歌曲文字 parser（Functional Spec D31、D32、D37；Technical Spec「parseSongText() 嘅規則」）。
 * 管理端即時逐行檢查同 API 儲存驗證用同一份。格式：
 *   第一個非空白行 = 歌名（必填）
 *   之後嘅標籤段：曲 / 詞 / 編 / 監 + `：` 或 `:`，次序隨意，各自最多一次。歌名之後同標籤之間嘅空行
 *   （連淨係得睇唔到字元嘅行，S-285）都跳過
 *   （擁有人決定 2026-11-27：標籤認 prefix，「歌名、空行、曲：…」照讀到 credit）；第一個非空白又唔係標籤嘅行就完。
 *   歌詞入面再出現似標籤嘅行照當歌詞（只有歌名之後嗰段先算）
 *   `副題` 行（CR-007，D72）：照認做標籤，值唔用，每行一個 SUBTITLE_IGNORED 提示（唔擋、唔查長度同重複）
 *   之後全部 = 歌詞（可以冇）：全部行有時間標記 = 同步；全部冇 = 純文字；混埋 = 逐行報錯
 */
import { startsWithTimestamp } from '../lrc/parseLrc';
import { CREDIT_FIELDS, type CreditField, type TrackCredits } from '../schema/types';
import { withoutHiddenCharacters } from '../text/hiddenCharacters';
import { readLabel } from './labels';
import {
    byteLength,
    charCount,
    CREDIT_MAX_CHARS,
    SONG_TEXT_MAX_BYTES,
    SONG_TEXT_MAX_LINES,
    TITLE_MAX_CHARS,
} from './limits';
import { songLines } from './lines';
import { readLyrics } from './lyrics';
import type { SongText, SongTextError, SongTextHint, SongTextResult } from './types';

type LabelValues = Partial<Record<CreditField, string | null>>;

const EMPTY_SONG: SongTextResult = {
    title: '',
    credits: null,
    lyrics: null,
    errors: [],
    hints: [],
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
    // S-158：睇唔到嘅字元唔入歌名；淨係得呢啲字 = 冇歌名（嗰行唔當標籤或者歌詞）
    const title = withoutHiddenCharacters(text).trim();
    if (title === '') errors.push({ line: index + 1, code: 'TITLE_REQUIRED', text });
    if (charCount(title) > TITLE_MAX_CHARS)
        errors.push({ line: index + 1, code: 'TITLE_TOO_LONG', text });
    return { title, next: index + 1 };
};

const isTooLong = (value: string | null): boolean =>
    value !== null && charCount(value) > CREDIT_MAX_CHARS;

interface LabelOutput {
    values: LabelValues;
    errors: SongTextError[];
    hints: SongTextHint[];
}

/** 一行標籤：副題 → 提示；credit → 值（重複留第一次、太長報錯） */
const applyLabel = (
    label: NonNullable<ReturnType<typeof readLabel>>,
    line: number,
    text: string,
    out: LabelOutput,
) => {
    if (label.field === 'subtitle') {
        out.hints.push({ line, code: 'SUBTITLE_IGNORED' });
        return;
    }
    if (Object.hasOwn(out.values, label.field)) {
        out.errors.push({ line, code: 'DUPLICATE_LABEL', text }); // 留第一次嘅值
        return;
    }
    out.values[label.field] = label.value;
    if (isTooLong(label.value)) out.errors.push({ line, code: 'CREDIT_TOO_LONG', text });
};

/**
 * 標籤段入面嘅一行（review S-285）：去走睇唔到嘅字元（S-158 範圍）之後冇嘢 = 空行；
 * 照原文唔係標籤先用去走之後嘅文字再認（行頭夾住零寬字元，常見於由網頁複製），平時嘅值唔變
 */
const isBlankInBlock = (text: string): boolean => withoutHiddenCharacters(text).trim() === '';
const labelInBlock = (text: string) =>
    readLabel(text) ?? readLabel(withoutHiddenCharacters(text).trim());

/** 由 `start` 起讀標籤段（空行跳過）；回傳歌詞開始嘅 index = 第一個非空白又唔係標籤嘅行（冇就係行數） */
const readLabels = (lines: string[], start: number, out: LabelOutput): number => {
    let index = start;
    for (; index < lines.length; index += 1) {
        const text = (lines[index] ?? '').trim();
        if (isBlankInBlock(text)) continue;
        const label = labelInBlock(text);
        if (!label) break;
        applyLabel(label, index + 1, text, out);
    }
    return index;
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
    const lines = songLines(text);
    const sizeError = checkSize(text, lines.length);
    if (sizeError) return { ...EMPTY_SONG, errors: [sizeError] };
    const out: LabelOutput = { values: {}, errors: [], hints: [] };
    const { errors, hints } = out;
    const { title, next } = readTitle(lines, errors);
    const lyricsStart = readLabels(lines, next, out);
    const lyrics = readLyrics(lines, lyricsStart, errors);
    const credits = creditsOf(out.values);
    // sort 係 stable：同一行嘅錯保持發現次序
    errors.sort((a, b) => a.line - b.line);
    return { title, credits, lyrics, errors, hints };
};

/** 解析結果入面要儲存嘅部分（去走 `errors`、`hints`） */
export const songOf = ({ title, credits, lyrics }: SongTextResult): SongText => ({
    title,
    credits,
    lyrics,
});
