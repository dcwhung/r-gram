/*
 * 歌曲文字（Functional Spec D31、D32、D72；Technical Spec API-041）：
 * 文字 → parseSongText()（有錯回逐行 details / 413）；歌詞 JSON 寫 R2（內容 hash 檔名，同步匯入用）。
 * 逐行 details 唔回出錯嗰行嘅原文：管理端手上有成段文字，按行號標示就得（backlog B-040）
 */
import {
    labelLinesAfterGap,
    parseSongText,
    SONG_TEXT_MAX_BYTES,
    songOf,
    toLyricsJson,
    type SongLyrics,
    type SongText,
    type SongTextResult,
} from '@r-gram/catalog';
import { JSON_CONTENT_TYPE, LYRICS_HASH_HEX_CHARS, LYRICS_KEY_PREFIX } from '../config';
import { sha256Hex } from '../lib/crypto';
import { hintMessage, type TrackDetail } from './errors';

const TEXT_PATH = 'text';

/** 唔擋儲存嘅提示（200 / 201 回應嘅 `hints`） */
export interface Hint {
    path: string;
    line: number;
    reason: 'LABEL_AFTER_BLANK_LINE' | 'SUBTITLE_IGNORED';
    message: string;
}

export interface ReadSong {
    song: SongText;
    hints: Hint[];
}

const hintOf = (line: number, reason: Hint['reason']): Hint => ({
    path: TEXT_PATH,
    line,
    reason,
    message: hintMessage(reason),
});

/**
 * backlog B-038：歌名之後隔咗空行嘅標籤樣行會當歌詞儲存；CR-007（D72）：`副題：` 行唔儲存。
 * 兩樣都照存，但係話畀管理員知；按行號排
 */
const hintsOf = (text: string, song: SongTextResult): Hint[] =>
    [
        ...labelLinesAfterGap(text).map((line) => hintOf(line, 'LABEL_AFTER_BLANK_LINE')),
        ...song.hints.map(({ line, code }) => hintOf(line, code)),
    ].sort((a, b) => a.line - b.line);

/** 解析；太大 → 'tooLarge'（parser 第 0 行嘅 TOO_LARGE 轉 413，backlog B-040）；有錯 → details */
export const parseText = (text: string): ReadSong | TrackDetail[] | 'tooLarge' => {
    // UTF-16 code unit 數大過 byte 上限 = UTF-8 byte 數一定更大：唔使逐字計（20 MB 貼上即刻回）
    if (text.length > SONG_TEXT_MAX_BYTES) return 'tooLarge';
    const result = parseSongText(text);
    if (result.errors.some(({ code }) => code === 'TOO_LARGE')) return 'tooLarge';
    if (result.errors.length > 0)
        return result.errors.map(({ line, code }) => ({ path: TEXT_PATH, line, reason: code }));
    return { song: songOf(result), hints: hintsOf(text, result) };
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
