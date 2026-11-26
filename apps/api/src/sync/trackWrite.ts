/*
 * 同步：寫一首歌（Technical Spec「同步嘅設計」API-034；Functional Spec D70、D72）。
 * - 歌名：info 模式 = `info.txt` 嘅；冇 `info.txt` = 讀到有效嘅 `.txt` 第一行，否則計劃嘅歌名（D1 已有或者音檔檔名）
 * - `.txt` 有效而 ETag 同上次匯入唔同 → credit + 歌詞（R2 先寫歌詞 JSON，同 API-041 一樣）+ text_source_etag；
 *   有錯 → 保留上一次成功匯入嘅內容（D72），只係更新 text_key
 * - 新歌：insertNumbered()（`<albumId>-<NN>`，撞咗用隨機 id，D61）；已有：updateSyncedTrack()
 * - 寫唔到（同時另一個同步先改咗、專輯冇咗）→ STALE，啱啱寫嘅歌詞檔即刻收返
 */
import type { PlannedTrack, SongText } from '@r-gram/catalog';
import type { Context } from 'hono';
import type { AppEnv } from '../app';
import { dropLyricsOnThrow } from '../media/applyGuard';
import type { TextRead } from '../media/songTextFile';
import { insertNumbered } from '../tracks/insertNumbered';
import { dropLyricsLater, dropUnusedLyrics } from '../tracks/lyricsCleanup';
import { putLyrics, type StoredLyrics } from '../tracks/songText';
import type { StoredTrack } from './folderState';
import type { TextContent, TrackLinks } from './trackStore';
import { updateSyncedTrack } from './trackStore';

export type WriteResult = 'added' | 'updated' | 'unchanged' | 'stale';

export interface TrackJob {
    albumId: string;
    planned: PlannedTrack;
    stored: StoredTrack | undefined;
    /** 讀咗嘅 `.txt`（冇讀 = null） */
    read: TextRead | null;
}

interface Prepared {
    links: TrackLinks;
    song: SongText | null;
    etag: string | null;
}

/** 同步之後嘅歌名 */
export const titleOf = ({ planned, read }: Pick<TrackJob, 'planned' | 'read'>): string =>
    planned.titleSource === 'file' && read?.song ? read.song.title : planned.title;

const prepare = (job: TrackJob): Prepared => {
    const { planned, stored, read } = job;
    const song = read?.song ?? null;
    const title = titleOf(job);
    const { audioKey, mvKey, textKey } = planned;
    const fresh = song !== null && read?.etag && read.etag !== stored?.textSourceEtag;
    return {
        links: { title, audioKey, mvKey, textKey },
        song: fresh ? { ...song, title } : null,
        etag: fresh ? (read?.etag ?? null) : null,
    };
};

const sameLinks = (links: TrackLinks, stored: StoredTrack): boolean =>
    links.title === stored.title &&
    links.audioKey === stored.audioKey &&
    links.mvKey === stored.mvKey &&
    links.textKey === stored.textKey;

const insertNew = async (
    c: Context<AppEnv>,
    job: TrackJob,
    prepared: Prepared,
    lyrics: StoredLyrics | null,
) => {
    const { links, song, etag } = prepared;
    const files = {
        audioKey: links.audioKey,
        mvKey: links.mvKey,
        textKey: links.textKey,
        textSourceEtag: etag,
    };
    const track = {
        db: c.env.DB,
        albumId: job.albumId,
        song: { title: links.title, credits: song?.credits ?? null, lyrics: song?.lyrics ?? null },
        lyrics,
        files,
    };
    const row = await insertNumbered(track, job.planned.no);
    return row !== null && typeof row === 'object' ? row.id : null;
};

const updateStored = async (
    c: Context<AppEnv>,
    stored: StoredTrack,
    prepared: Prepared,
    lyrics: StoredLyrics | null,
) => {
    const { links, song, etag } = prepared;
    const content: TextContent | null =
        song && etag ? { credits: song.credits, lyrics, etag } : null;
    const written = await updateSyncedTrack(c.env.DB, stored, links, content);
    // 舊歌詞檔等 catalog 生成成功先刪（W-021）
    if (written && content && stored.jsonName !== lyrics?.jsonName)
        dropLyricsLater(c, [stored.jsonName]);
    return written !== null;
};

/** 回結果同（新歌）id */
export const writeTrack = async (
    c: Context<AppEnv>,
    job: TrackJob,
): Promise<{ result: WriteResult; trackId: string | null }> => {
    const prepared = prepare(job);
    const { stored } = job;
    if (stored && !prepared.song && sameLinks(prepared.links, stored))
        return { result: 'unchanged', trackId: stored.id };
    const lyrics = prepared.song?.lyrics
        ? await putLyrics(c.env.CATALOG, prepared.song.lyrics)
        : null;
    const write = () =>
        stored
            ? updateStored(c, stored, prepared, lyrics).then((ok) => (ok ? stored.id : null))
            : insertNew(c, job, prepared, lyrics);
    const trackId = await dropLyricsOnThrow(c.env, lyrics?.jsonName, write);
    if (trackId === null) await dropUnusedLyrics(c.env, [lyrics?.jsonName]);
    if (trackId === null) return { result: 'stale', trackId: stored?.id ?? null };
    return { result: stored ? 'updated' : 'added', trackId };
};
