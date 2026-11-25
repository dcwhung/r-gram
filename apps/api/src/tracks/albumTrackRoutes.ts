/*
 * 一張專輯入面嘅歌：掛喺 /api/albums/:albumId/tracks（Technical Spec API-020 新增、API-023 排序）。
 * 新增嘅 body 同 API-041 一樣係 `{ text }`；加喺最尾，歌號 = 次序
 */
import type { SongText } from '@r-gram/catalog';
import { Hono, type Context } from 'hono';
import { readOrder } from '../albums/order';
import { findAlbum, trackIdsOf } from '../albums/store';
import type { AppEnv } from '../app';
import { HTTP_STATUS } from '../config';
import { readJsonObject } from '../lib/http';
import { trackError, trackValidationError } from './errors';
import { newTrackId } from './ids';
import { dropUnusedLyrics } from './lyricsCleanup';
import { savedResponse } from './saved';
import { putLyrics, songFromRequest, type StoredLyrics } from './songText';
import * as store from './store';

export const albumTrackRoutes = new Hono<AppEnv>();

/** 隨機 id 撞咗（36^6 個可能）就換一個再試；試完都唔得當伺服器錯誤 */
const TRACK_ID_ATTEMPTS = 3;
const UNIQUE_VIOLATION = 'UNIQUE constraint failed';

const albumIdOf = (c: Context) => c.req.param('albumId') ?? '';

const isUniqueViolation = (error: unknown) =>
    error instanceof Error && error.message.includes(UNIQUE_VIOLATION);

const insertWithFreshId = async (
    db: D1Database,
    albumId: string,
    song: SongText,
    lyrics: StoredLyrics | null,
) => {
    for (let attempt = 1; ; attempt += 1) {
        try {
            return await store.insertTrack(db, { id: newTrackId(albumId), albumId }, song, lyrics);
        } catch (error) {
            if (attempt >= TRACK_ID_ATTEMPTS || !isUniqueViolation(error)) throw error;
        }
    }
};

albumTrackRoutes.post('/', async (c) => {
    const albumId = albumIdOf(c);
    const read = await songFromRequest(c);
    if (read instanceof Response) return read;
    if (!(await findAlbum(c.env.DB, albumId))) return trackError(c, 'albumNotFound');
    const lyrics = read.song.lyrics ? await putLyrics(c.env.CATALOG, read.song.lyrics) : null;
    const row = await insertWithFreshId(c.env.DB, albumId, read.song, lyrics);
    if (!row) {
        // 檢查之後張碟被刪咗
        await dropUnusedLyrics(c.env, [lyrics?.jsonName]);
        return trackError(c, 'albumNotFound');
    }
    return c.json(savedResponse(row, read, lyrics), HTTP_STATUS.created);
});

/**
 * `{ ids }` 要啱啱好係張碟而家嘅歌（唔係 → 409，管理端重新載入）。檢查同寫入唔喺同一個 transaction，
 * 但寫入嘅 batch 以 COMPACT 收尾：中間有歌被加 / 刪，歌號仍然由 1 連續（見 store.ts）
 */
albumTrackRoutes.put('/order', async (c) => {
    const albumId = albumIdOf(c);
    const ids = readOrder(await readJsonObject(c));
    if (!ids) return trackValidationError(c, [{ path: 'ids', reason: 'INVALID_LIST' }]);
    if (!(await findAlbum(c.env.DB, albumId))) return trackError(c, 'albumNotFound');
    const current = await trackIdsOf(c.env.DB, albumId);
    const sameSet = ids.length === current.length && current.every((id) => ids.includes(id));
    if (!sameSet) return trackError(c, 'orderChanged');
    if (ids.length > 0) await store.writeTrackOrder(c.env.DB, albumId, ids);
    return c.json({ ids });
});
