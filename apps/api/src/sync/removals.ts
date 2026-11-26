/*
 * API-035 POST /api/sync/removals（T-105；Functional Spec D73、D76；Technical Spec API-035）：管理員確認咗嘅移除。
 * 驗形狀（400）→ 逐項：D1 對唔對得上（冇 = NOT_FOUND；連結唔係確認嗰個 = STALE）→ 再對 bucket
 *（list 唔齊 = STALE；檔或者資料夾仍然喺度 = STILL_PRESENT，唔刪）→ 刪專輯／刪歌／清連結／清封面 → 逐項回結果。
 * 一項出 exception = 嗰項 INTERNAL，其他照做。有刪到嘢先經 api/afterWrite.ts 生成 catalog；
 * 冇人用嘅歌詞檔等生成成功先刪（W-021、backlog B-048）。永遠唔刪媒體 bucket 嘅檔
 */
import type { Context } from 'hono';
import { findAlbum } from '../albums/store';
import type { AppEnv } from '../app';
import { readJsonObject } from '../lib/http';
import { guardItem } from '../media/applyGuard';
import { dropLyricsLater } from '../tracks/lyricsCleanup';
import { failedItem, syncNotAnObject, syncValidationError, type FailedItem } from './errors';
import { hasFile, removalContext, type RemovalContext } from './removalContext';
import { readRemovals, type RemovalItem } from './removalShape';
import {
    clearCover,
    clearTrackFile,
    deleteAlbum,
    deleteTrack,
    findRemovalTrack,
    type RemovalTrack,
    type TrackFileKind,
} from './removalStore';

type Result = { ok: true } | FailedItem;

const DONE: Result = { ok: true };

type Handler = (c: Context<AppEnv>, context: RemovalContext, item: RemovalItem) => Promise<Result>;

const removeAlbum: Handler = async (c, context, item) => {
    const album = await findAlbum(c.env.DB, item.albumId);
    if (!album) return failedItem('NOT_FOUND');
    const root = await context.root();
    if (root.truncated) return failedItem('STALE');
    if (root.folders.some(({ id }) => id === album.id)) return failedItem('STILL_PRESENT');
    dropLyricsLater(c, await deleteAlbum(c.env.DB, album.id));
    return DONE;
};

const trackOf = async (c: Context<AppEnv>, item: RemovalItem): Promise<RemovalTrack | null> => {
    const track = await findRemovalTrack(c.env.DB, item.trackId ?? '');
    return track && track.album_id === item.albumId ? track : null;
};

const removeTrack: Handler = async (c, context, item) => {
    const track = await trackOf(c, item);
    if (!track) return failedItem('NOT_FOUND');
    if ((await context.folder(track.folder)).truncated) return failedItem('STALE');
    if ((await context.listedNumbers(track.folder)).has(track.no))
        return failedItem('STILL_PRESENT');
    await deleteTrack(c.env.DB, track.id);
    dropLyricsLater(c, [track.json_name]);
    return DONE;
};

const LINK: Readonly<Record<TrackFileKind, keyof RemovalTrack>> = {
    audio: 'audio_key',
    mv: 'mv_key',
    text: 'text_key',
};

const clearFile =
    (kind: TrackFileKind): Handler =>
    async (c, context, item) => {
        const track = await trackOf(c, item);
        if (!track) return failedItem('NOT_FOUND');
        if (track[LINK[kind]] !== item.key) return failedItem('STALE');
        const listing = await context.folder(track.folder);
        if (listing.truncated) return failedItem('STALE');
        if (hasFile(listing.files, kind, track.no)) return failedItem('STILL_PRESENT');
        if (!(await clearTrackFile(c.env.DB, track, kind, item.key ?? '')))
            return failedItem('STALE');
        if (kind !== 'mv') dropLyricsLater(c, [track.json_name]);
        return DONE;
    };

const removeCover: Handler = async (c, context, item) => {
    const album = await findAlbum(c.env.DB, item.albumId);
    const slot = item.slot ?? 'cover';
    if (!album) return failedItem('NOT_FOUND');
    const listing = await context.folder(album.folder);
    if (listing.truncated) return failedItem('STALE');
    if (hasFile(listing.files, slot)) return failedItem('STILL_PRESENT');
    return (await clearCover(c.env.DB, album.id, slot)) ? DONE : failedItem('STALE');
};

const HANDLERS: Readonly<Record<RemovalItem['kind'], Handler>> = {
    album: removeAlbum,
    track: removeTrack,
    audio: clearFile('audio'),
    mv: clearFile('mv'),
    text: clearFile('text'),
    cover: removeCover,
};

/** 結果帶返項目嘅身份（唔帶 key） */
const echo = ({ kind, albumId, trackId, slot }: RemovalItem) => ({
    kind,
    albumId,
    ...(trackId !== undefined && { trackId }),
    ...(slot !== undefined && { slot }),
});

export const removalsRoute = async (c: Context<AppEnv>) => {
    const raw = await readJsonObject(c);
    if (!raw) return syncNotAnObject(c);
    const read = readRemovals(raw);
    if ('issues' in read) return syncValidationError(c, read.issues);
    const context = removalContext(c.env);
    const results = [];
    for (const item of read.items) {
        const run = () => HANDLERS[item.kind](c, context, item);
        results.push({ ...echo(item), ...(await guardItem(run, failedItem('INTERNAL'))) });
    }
    const applied = results.filter(({ ok }) => ok).length;
    if (applied === 0) c.set('skipPostWrite', true);
    return c.json({ results, applied });
};
