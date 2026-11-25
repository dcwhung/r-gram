/*
 * 一張專輯入面嘅歌：掛喺 /api/albums/:albumId/tracks（Technical Spec API-020 新增）。
 * body `{ no?, text }`（text 同 API-041 一樣）。CR-006（Functional Spec D60、D61）：歌號跟檔名、可以跳號，
 * 冇畀 = 最大歌號 + 1；id = trackIdFor(albumId, no)，已經有人用（舊歌改過歌號）先用隨機 id。
 * API-023（拖動排序）取消：改歌號經 API-021
 */
import { TRACK_NO_MAX } from '@r-gram/catalog';
import { Hono, type Context } from 'hono';
import { findAlbum } from '../albums/store';
import type { AppEnv } from '../app';
import { HTTP_STATUS } from '../config';
import { numberTaken, trackError, trackValidationError } from './errors';
import { CREATE_FIELD_RULES } from './fieldRules';
import { insertNumbered, type Inserted, type NewTrack } from './insertNumbered';
import { dropUnusedLyrics } from './lyricsCleanup';
import type { TrackRow } from './rows';
import { savedResponse } from './saved';
import { putLyrics, songFromRequest } from './songText';
import * as store from './store';

export const albumTrackRoutes = new Hono<AppEnv>();

/** 冇畀歌號時，同時另一個請求攞咗同一個號就重新計；最多試幾次 */
const AUTO_NUMBER_ATTEMPTS = 3;

const albumIdOf = (c: Context) => c.req.param('albumId') ?? '';

/** 冇畀歌號：最大歌號 + 1；過咗上限 → 'exhausted' */
const insertAutoNumbered = async (track: NewTrack): Promise<Inserted> => {
    for (let attempt = 1; ; attempt += 1) {
        const no = await store.nextTrackNo(track.db, track.albumId);
        if (no > TRACK_NO_MAX) return 'exhausted';
        const result = await insertNumbered(track, no);
        if (result !== 'numberTaken' || attempt >= AUTO_NUMBER_ATTEMPTS) return result;
    }
};

const notInserted = (c: Context, result: Exclude<Inserted, TrackRow>) => {
    if (result === 'numberTaken') return numberTaken(c);
    if (result === 'exhausted')
        return trackValidationError(c, [{ path: 'no', reason: 'NUMBER_EXHAUSTED' }]);
    return trackError(c, 'albumNotFound');
};

albumTrackRoutes.post('/', async (c) => {
    const albumId = albumIdOf(c);
    const read = await songFromRequest(c, CREATE_FIELD_RULES);
    if (read instanceof Response) return read;
    if (!(await findAlbum(c.env.DB, albumId))) return trackError(c, 'albumNotFound');
    const lyrics = read.song.lyrics ? await putLyrics(c.env.CATALOG, read.song.lyrics) : null;
    const track = { db: c.env.DB, albumId, song: read.song, lyrics };
    const no = read.fields.no as number | undefined;
    const result = await (no === undefined ? insertAutoNumbered(track) : insertNumbered(track, no));
    if (result === null || typeof result === 'string') {
        // 寫唔到：啱啱寫嘅歌詞檔未入過 catalog，即刻收返
        await dropUnusedLyrics(c.env, [lyrics?.jsonName]);
        return notInserted(c, result);
    }
    return c.json(savedResponse(result, read, lyrics), HTTP_STATUS.created);
});
