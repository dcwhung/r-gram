/*
 * `info.txt` parser（Functional Spec D68、FR-128；Technical Spec「CR-007 → packages/catalog」）。
 * 寬鬆：唔 throw、唔擋，有問題嘅行略過，逐項出檢查結果（D77）。格式：
 *   標籤行 `唱片名稱：…`（亦收 `專輯名稱`）、`發行年份：…`（亦收 `年份`、`發行日期`），冒號全形半形都得；同一個標籤用第一個
 *   `曲目：` 一行可有可冇；曲目行 = 歌號（1–999，`1`、`01`、`001` 一樣）+ 分隔 + 歌名；按歌號排、可以跳號；同一個歌號用第一個
 *   空行唔理；其他行 = INFO_UNKNOWN_LINE。CRLF、CR、BOM 都得（同歌曲文字一樣拆行）
 */
import { byteLength, charCount, TITLE_MAX_CHARS } from '../song-text/limits';
import { songLines } from '../song-text/lines';
import { checkOf, type Check } from '../sync/checks';
import { cleanTitle, readInfoLabel, readTrackLine, readYear, type InfoField } from './lines';
import { INFO_TEXT_MAX_BYTES, INFO_TEXT_MAX_LINES } from './limits';
import type { AlbumInfo } from './types';

interface ReadState {
    seen: Set<InfoField>;
    title: string | null;
    /** 碟名有寫但太長：已經出咗 INFO_TOO_LONG，唔再出 INFO_NO_TITLE */
    titleTooLong: boolean;
    year: number | null;
    tracks: Map<number, AlbumInfo['tracks'][number]>;
    checks: Check[];
}

/**
 * 太大：用唔到（D68、S-164），每次一個新物件（呼叫者可以改）。Worker 讀檔之前睇大細都用佢（S-168：一個定義）
 */
export const infoTooLarge = (): AlbumInfo => ({
    usable: false,
    title: null,
    year: null,
    tracks: [],
    checks: [
        checkOf(
            'INFO_TOO_LARGE',
            {},
            { maxBytes: INFO_TEXT_MAX_BYTES, maxLines: INFO_TEXT_MAX_LINES },
        ),
    ],
});

/**
 * 拆行之前先擋（W-038）：UTF-16 code unit 數大過 byte 上限 = UTF-8 byte 數一定更大，唔使逐字計、唔使拆行
 *（20 MB 全部係換行嘅文字即刻回）；之後先逐字計 byte
 */
const isTooManyBytes = (text: string): boolean =>
    text.length > INFO_TEXT_MAX_BYTES || byteLength(text) > INFO_TEXT_MAX_BYTES;

/** 檔尾嘅換行之後嗰個空位唔算一行（S-160）：`formatAlbumInfo()` 一定喺檔尾加換行，上限嗰度都要 round-trip */
const FINAL_LINE_BREAK = /(?:\r\n?|\n)$/u;

const contentLineCount = (text: string, lines: readonly string[]): number =>
    FINAL_LINE_BREAK.test(text) ? lines.length - 1 : lines.length;

/** 空（包括淨係睇唔到嘅字元，S-158）= 冇碟名，最尾出 INFO_NO_TITLE */
const readTitle = (raw: string, line: number, state: ReadState): void => {
    const value = cleanTitle(raw);
    if (value === '') return;
    if (charCount(value) <= TITLE_MAX_CHARS) {
        state.title = value;
        return;
    }
    state.titleTooLong = true;
    state.checks.push(checkOf('INFO_TOO_LONG', { line }, { max: TITLE_MAX_CHARS }));
};

/** 冇值 = 冇年份（唔係錯，D63）；讀唔到 = 冇年份 + 提示 */
const readYearValue = (value: string, line: number, state: ReadState): void => {
    if (value === '') return;
    state.year = readYear(value);
    if (state.year === null) state.checks.push(checkOf('INFO_BAD_YEAR', { line }));
};

const applyLabel = (field: InfoField, value: string, line: number, state: ReadState): void => {
    if (field === 'tracks' && value !== '') {
        state.checks.push(checkOf('INFO_UNKNOWN_LINE', { line }));
        return;
    }
    if (state.seen.has(field)) {
        state.checks.push(checkOf('INFO_DUPLICATE_LABEL', { line }));
        return;
    }
    state.seen.add(field);
    if (field === 'title') readTitle(value, line, state);
    if (field === 'year') readYearValue(value, line, state);
};

const applyTrack = (no: number, title: string, line: number, state: ReadState): void => {
    if (state.tracks.has(no)) {
        state.checks.push(checkOf('INFO_DUPLICATE_NUMBER', { line, no }, { no }));
        return;
    }
    if (charCount(title) > TITLE_MAX_CHARS) {
        state.checks.push(checkOf('INFO_TOO_LONG', { line, no }, { max: TITLE_MAX_CHARS }));
        return;
    }
    state.tracks.set(no, { no, title, line });
};

const readLine = (raw: string, line: number, state: ReadState): void => {
    const text = raw.trim();
    if (text === '') return;
    const label = readInfoLabel(text);
    if (label) return applyLabel(label.field, label.value, line, state);
    const track = readTrackLine(text);
    if (track) return applyTrack(track.no, track.title, line, state);
    state.checks.push(checkOf('INFO_UNKNOWN_LINE', { line }));
};

/** 按行號排（sort 係 stable）；冇行號嘅（講成個檔）排最尾 */
const byLine = (a: Check, b: Check): number =>
    (a.line ?? Number.MAX_SAFE_INTEGER) - (b.line ?? Number.MAX_SAFE_INTEGER);

export const parseAlbumInfo = (text: string): AlbumInfo => {
    if (isTooManyBytes(text)) return infoTooLarge();
    const lines = songLines(text);
    if (contentLineCount(text, lines) > INFO_TEXT_MAX_LINES) return infoTooLarge();
    const state: ReadState = {
        seen: new Set(),
        title: null,
        titleTooLong: false,
        year: null,
        tracks: new Map(),
        checks: [],
    };
    lines.forEach((raw, index) => readLine(raw, index + 1, state));
    if (state.title === null && !state.titleTooLong) state.checks.push(checkOf('INFO_NO_TITLE'));
    const tracks = [...state.tracks.values()].sort((a, b) => a.no - b.no);
    const { title, year } = state;
    return { usable: true, title, year, tracks, checks: state.checks.sort(byLine) };
};
