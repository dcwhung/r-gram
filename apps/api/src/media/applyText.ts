/*
 * API-031 `songTexts`（現有歌）同 `create` 嘅 `.txt`：重新讀檔，ETag 要同預覽時一樣（唔同 → STALE，管理員要再掃描睇過）。
 * 現有歌嘅文字行同 API-041 一樣嘅儲存（tracks/store.ts saveSongText + 歌詞 JSON），加記 text_source_etag：
 * 有錯唔套用（VALIDATION_ERROR + 逐行 details）、會清走現有歌詞而冇 force → LYRICS_REMOVED、歌號冇音檔 → NO_AUDIO
 */
import type { SongText } from '@r-gram/catalog';
import type { Context } from 'hono';
import type { AppEnv } from '../app';
import { dropLyricsLater, dropUnusedLyrics } from '../tracks/lyricsCleanup';
import { putLyrics } from '../tracks/songText';
import { findTrackText, saveSongText, type TrackTextRow } from '../tracks/store';
import type { ApplyContext } from './applyContext';
import { failedItem, type FailedItem } from './applyResult';
import type { TextItem, TextRef } from './applyShape';
import { readSongTextFile, type TextRead } from './songTextFile';

/** 仲喺資料夾、ETag 冇變先讀；讀到嘅版本都要係同一個 ETag */
export const readConfirmedText = async (
    bucket: R2Bucket,
    context: ApplyContext,
    ref: TextRef,
): Promise<TextRead | 'STALE'> => {
    const listed = context.files.get(ref.key);
    if (!listed || listed.etag !== ref.etag) return 'STALE';
    const read = await readSongTextFile(bucket, listed);
    return (read.etag ?? listed.etag) === ref.etag ? read : 'STALE';
};

type Saved = { ok: true } | FailedItem;

const writeText = async (
    c: Context<AppEnv>,
    current: TrackTextRow,
    song: SongText,
    etag: string,
): Promise<Saved> => {
    const lyrics = song.lyrics ? await putLyrics(c.env.CATALOG, song.lyrics) : null;
    const row = await saveSongText(c.env.DB, current.id, current.updated_at, song, lyrics, etag);
    if (!row) {
        await dropUnusedLyrics(c.env, [lyrics?.jsonName]);
        return failedItem('STALE');
    }
    // 舊歌詞檔等 catalog 生成成功先刪（W-021）
    dropLyricsLater(c, [current.json_name]);
    return { ok: true };
};

const saveOne = async (
    c: Context<AppEnv>,
    context: ApplyContext,
    item: TextItem,
): Promise<Saved> => {
    const track = context.tracks.get(item.trackId);
    if (!track) return failedItem('NOT_FOUND');
    if (!context.hasAudio(track.no)) return failedItem('NO_AUDIO');
    const read = await readConfirmedText(c.env.MEDIA, context, item);
    if (read === 'STALE') return failedItem('STALE');
    if (!read.song) return failedItem('VALIDATION_ERROR', read.errors);
    const current = await findTrackText(c.env.DB, track.id);
    if (!current) return failedItem('NOT_FOUND');
    if (current.json_name !== null && !read.song.lyrics && !item.force)
        return failedItem('LYRICS_REMOVED');
    return writeText(c, current, read.song, item.etag);
};

export const applySongTexts = async (
    c: Context<AppEnv>,
    context: ApplyContext,
    items: TextItem[],
) => {
    const results = [];
    for (const item of items)
        results.push({ trackId: item.trackId, ...(await saveOne(c, context, item)) });
    return results;
};
