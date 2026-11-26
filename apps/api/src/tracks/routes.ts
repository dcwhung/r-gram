/*
 * 歌曲 API，掛喺 /api/tracks（Technical Spec API-040、041；CR-003：冇上下架、冇草稿，儲存即生效）。
 * 喺 api/routes.ts 嘅 session + same-origin 守門之後（backlog B-019 ①）；寫入成功之後生成 catalog
 * 係 api/afterWrite.ts 嘅後置步驟（T-026）。CR-007：改歌號、參考欄、手動指定（API-021）同刪歌（API-022）取消；
 * 歌曲文字改為讀寫媒體 bucket 係 T-106
 */
import { formatSongText } from '@r-gram/catalog';
import { Hono, type Context } from 'hono';
import type { AppEnv } from '../app';
import { FORCE_CONFIRMED } from '../config';
import { readIfMatch } from '../lib/http';
import { ifMatchRequired, trackError } from './errors';
import { dropLyricsLater, dropUnusedLyrics } from './lyricsCleanup';
import { savedResponse, songFieldsOf } from './saved';
import { putLyrics, songFromRequest, type ReadSong } from './songText';
import * as store from './store';

export const trackRoutes = new Hono<AppEnv>();

const isConfirmed = (c: Context) => c.req.query('force') === FORCE_CONFIRMED;

/** 寫唔到：歌仲喺度 = If-Match 過時（包括同時另一個請求先改咗），唔喺度 = 404 */
const notWritten = async (c: Context<AppEnv>, id: string) =>
    trackError(c, (await store.findTrackText(c.env.DB, id)) ? 'stale' : 'notFound');

trackRoutes.get('/:id/text', async (c) => {
    const row = await store.findTrackText(c.env.DB, c.req.param('id'));
    if (!row) return trackError(c, 'notFound');
    const text = formatSongText(songFieldsOf(row));
    return c.json({ trackId: row.id, text, updatedAt: row.updated_at });
});

/** 歌詞 JSON 先寫 R2，再寫 D1（Technical Spec API-041 嘅次序）；寫唔到就即刻收返啱啱寫嘅檔（未入過 catalog） */
const saveSong = async (c: Context<AppEnv>, current: store.TrackTextRow, read: ReadSong) => {
    const { id, updated_at: expected } = current;
    const lyrics = read.song.lyrics ? await putLyrics(c.env.CATALOG, read.song.lyrics) : null;
    const row = await store.saveSongText(c.env.DB, id, expected, read.song, lyrics);
    if (!row) {
        await dropUnusedLyrics(c.env, [lyrics?.jsonName]);
        return notWritten(c, id);
    }
    // 舊檔等 catalog 生成成功先刪（W-021）
    dropLyricsLater(c, [current.json_name]);
    return c.json(savedResponse(row, read, lyrics));
};

trackRoutes.put('/:id/text', async (c) => {
    const id = c.req.param('id');
    const expected = readIfMatch(c);
    if (expected === undefined) return ifMatchRequired(c);
    const read = await songFromRequest(c);
    if (read instanceof Response) return read;
    const current = await store.findTrackText(c.env.DB, id);
    if (!current) return trackError(c, 'notFound');
    if (current.updated_at !== expected) return trackError(c, 'stale');
    // D30：儲存會清走成段現有歌詞 → 要確認（同 ID 守衛一樣帶 ?force=1 再叫）
    if (current.json_name !== null && !read.song.lyrics && !isConfirmed(c)) {
        const details = [{ type: 'lyrics', trackId: id, lineCount: current.line_count }];
        return trackError(c, 'lyricsRemoved', details);
    }
    return saveSong(c, current, read);
});
