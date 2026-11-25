/*
 * 歌曲文字（Functional Spec D31、D32、D37；Technical Spec API-020、API-041）：
 * body → parseSongText()（有錯回逐行 details / 413）→ 歌詞 JSON 寫 R2（內容 hash 檔名）。
 * 逐行 details 唔回出錯嗰行嘅原文：管理端手上有成段文字，按行號標示就得（backlog B-040）
 */
import {
    labelLinesAfterGap,
    parseSongText,
    SONG_TEXT_MAX_BYTES,
    toLyricsJson,
    type SongLyrics,
    type SongText,
} from '@r-gram/catalog';
import type { Context } from 'hono';
import type { AppEnv } from '../app';
import { JSON_CONTENT_TYPE, LYRICS_HASH_HEX_CHARS, LYRICS_KEY_PREFIX } from '../config';
import { sha256Hex } from '../lib/crypto';
import { BODY_TOO_LARGE, readBoundedJsonObject } from '../lib/http';
import {
    hintMessage,
    trackError,
    trackNotAnObject,
    trackValidationError,
    type TrackDetail,
} from './errors';
import { readTextBody } from './validate';

/** 每個字都可以寫成 `\uXXXX`（6 個字元）；加 `{"text":""}` 同空白嘅位。超過一定係太大 */
const JSON_ESCAPE_CHARS = 6;
const BODY_ENVELOPE_CHARS = 1024;
export const SONG_TEXT_BODY_MAX_CHARS =
    SONG_TEXT_MAX_BYTES * JSON_ESCAPE_CHARS + BODY_ENVELOPE_CHARS;

const TEXT_PATH = 'text';

/** 唔擋儲存嘅提示（200 / 201 回應嘅 `hints`） */
export interface Hint {
    path: string;
    line: number;
    reason: 'LABEL_AFTER_BLANK_LINE';
    message: string;
}

export interface ReadSong {
    song: SongText;
    hints: Hint[];
}

/** backlog B-038：歌名之後隔咗空行嘅標籤樣行會當歌詞儲存；照存，但係話畀管理員知 */
const hintsOf = (text: string): Hint[] =>
    labelLinesAfterGap(text).map((line) => ({
        path: TEXT_PATH,
        line,
        reason: 'LABEL_AFTER_BLANK_LINE',
        message: hintMessage('LABEL_AFTER_BLANK_LINE'),
    }));

/** 解析；太大 → 'tooLarge'（parser 第 0 行嘅 TOO_LARGE 轉 413，backlog B-040）；有錯 → details */
const parseText = (text: string): ReadSong | TrackDetail[] | 'tooLarge' => {
    // UTF-16 code unit 數大過 byte 上限 = UTF-8 byte 數一定更大：唔使逐字計（20 MB 貼上即刻回）
    if (text.length > SONG_TEXT_MAX_BYTES) return 'tooLarge';
    const result = parseSongText(text);
    if (result.errors.some(({ code }) => code === 'TOO_LARGE')) return 'tooLarge';
    if (result.errors.length > 0)
        return result.errors.map(({ line, code }) => ({ path: TEXT_PATH, line, reason: code }));
    return { song: result, hints: hintsOf(text) };
};

/** 請求 body → 歌曲；唔得就回錯誤回應（400 / 413） */
export const songFromRequest = async (c: Context<AppEnv>): Promise<ReadSong | Response> => {
    const body = await readBoundedJsonObject(c, SONG_TEXT_BODY_MAX_CHARS);
    if (body === BODY_TOO_LARGE) return trackError(c, 'tooLarge');
    if (!body) return trackNotAnObject(c);
    const { text, issues } = readTextBody(body);
    if (text === undefined || issues.length > 0) return trackValidationError(c, issues);
    const parsed = parseText(text);
    if (parsed === 'tooLarge') return trackError(c, 'tooLarge');
    return Array.isArray(parsed) ? trackValidationError(c, parsed) : parsed;
};

/** 已寫入 R2 嘅歌詞：D1 `lyrics` 一行嘅內容 */
export interface StoredLyrics {
    source: string;
    synced: boolean;
    jsonName: string;
    lineCount: number;
}

export const lyricsKey = (jsonName: string): string => `${LYRICS_KEY_PREFIX}${jsonName}`;

/** 歌詞 JSON（API-072 嘅內容）寫 R2；檔名 = 內容 hash，所以同一段歌詞只有一個檔，重寫冇害 */
export const putLyrics = async (bucket: R2Bucket, lyrics: SongLyrics): Promise<StoredLyrics> => {
    const json = JSON.stringify(toLyricsJson(lyrics));
    const jsonName = `${(await sha256Hex(json)).slice(0, LYRICS_HASH_HEX_CHARS)}.json`;
    await bucket.put(lyricsKey(jsonName), json, {
        httpMetadata: { contentType: JSON_CONTENT_TYPE },
    });
    const { source, synced, lines } = lyrics;
    return { source, synced, jsonName, lineCount: lines.length };
};
