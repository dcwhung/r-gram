/*
 * 歌曲 API，掛喺 /api/tracks（Technical Spec API-021、022、040、041；CR-003：冇上下架、冇草稿，儲存即生效）。
 * 喺 api/routes.ts 嘅 session + same-origin 守門之後（backlog B-019 ①）；寫入成功之後生成 catalog
 * 係 api/afterWrite.ts 嘅後置步驟（T-026）
 */
import { formatSongText } from '@r-gram/catalog';
import { Hono, type Context } from 'hono';
import type { AppEnv } from '../app';
import { FORCE_CONFIRMED } from '../config';
import { readIfMatch, readJsonObject } from '../lib/http';
import {
    ifMatchRequired,
    numberTaken,
    trackError,
    trackNotAnObject,
    trackValidationError,
} from './errors';
import { dropLyricsLater, dropUnusedLyrics } from './lyricsCleanup';
import { toTrack } from './rows';
import { savedResponse, songFieldsOf } from './saved';
import { putLyrics, songFromRequest, type ReadSong } from './songText';
import * as store from './store';
import { missingMediaIssues, parseTrackFields } from './validate';

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

/** 改歌號撞咗同碟另一首歌（D1 UNIQUE）→ 'numberTaken'；其他錯誤照拋 */
const updateFields = async (...args: Parameters<typeof store.updateTrackFields>) => {
    try {
        return await store.updateTrackFields(...args);
    } catch (error) {
        if (store.isNumberTaken(error)) return 'numberTaken' as const;
        throw error;
    }
};

trackRoutes.patch('/:id', async (c) => {
    const id = c.req.param('id');
    const expected = readIfMatch(c);
    const body = await readJsonObject(c);
    if (!body) return trackNotAnObject(c);
    if (expected === undefined) return ifMatchRequired(c);
    const { fields, issues } = parseTrackFields(body);
    // 格式啱晒先問 R2：唔會為咗一個 `../x` 去 head
    if (issues.length === 0) issues.push(...(await missingMediaIssues(c.env.MEDIA, fields)));
    if (issues.length > 0) return trackValidationError(c, issues);
    const row = await updateFields(c.env.DB, id, fields, expected);
    if (row === 'numberTaken') return numberTaken(c);
    return row ? c.json(toTrack(row)) : notWritten(c, id);
});

trackRoutes.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const track = await store.findTrackText(c.env.DB, id);
    if (!track) return trackError(c, 'notFound');
    if (!isConfirmed(c)) return trackError(c, 'idRemoved', [{ type: 'track', id }]);
    if (!(await store.deleteTrack(c.env.DB, id))) return trackError(c, 'notFound');
    dropLyricsLater(c, [track.json_name]);
    return c.json({ deleted: { trackId: id, albumId: track.album_id } });
});
