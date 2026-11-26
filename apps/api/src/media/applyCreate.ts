/*
 * API-031 `create`：掃描建立歌曲（Functional Spec D59–D61、FR-126；Technical Spec「CR-006 → 掃描建立歌曲」）。
 * 逐項：歌號仲未有歌（有 → NUMBER_TAKEN）、音檔同 MV 仲喺資料夾（唔喺 → STALE）、`.txt` ETag 冇變（變咗 → STALE）。
 * `.txt` 有錯：歌照建立，歌名用音檔檔名（titleFromFileName），文字唔套用（textApplied: false + details）。
 * id = `<albumId>-<NN>`，撞咗用隨機 id（同 API-020 一樣嘅 insertNumbered）；歌詞同 API-041 一樣寫 R2
 */
import { titleFromFileName, type SongText } from '@r-gram/catalog';
import type { Context } from 'hono';
import type { AppEnv } from '../app';
import { insertNumbered } from '../tracks/insertNumbered';
import { dropUnusedLyrics } from '../tracks/lyricsCleanup';
import { putLyrics } from '../tracks/songText';
import type { ApplyContext } from './applyContext';
import { dropLyricsOnThrow, guardItem } from './applyGuard';
import { failedItem, type FailedItem } from './applyResult';
import type { CreateItem } from './applyShape';
import { readConfirmedText } from './applyText';
import type { TextError } from './errors';

interface Prepared {
    song: SongText;
    /** 套用咗 `.txt` 先有 */
    textEtag: string | null;
    errors: readonly TextError[];
}

const titleOnly = (title: string): SongText => ({
    title,
    credits: null,
    lyrics: null,
});

const prepare = async (
    c: Context<AppEnv>,
    context: ApplyContext,
    item: CreateItem,
): Promise<Prepared | FailedItem> => {
    const taken = [...context.tracks.values()].some(({ no }) => no === item.no);
    if (taken) return failedItem('NUMBER_TAKEN');
    const filesGone = [item.audioKey, item.mvKey].some(
        (key) => key !== null && !context.files.has(key),
    );
    if (filesGone) return failedItem('STALE');
    const read = item.text ? await readConfirmedText(c.env.MEDIA, context, item.text) : null;
    if (read === 'STALE') return failedItem('STALE');
    const fallback = titleOnly(titleFromFileName(item.audioKey));
    if (!read?.song) return { song: fallback, textEtag: null, errors: read?.errors ?? [] };
    return { song: read.song, textEtag: item.text?.etag ?? null, errors: [] };
};

const createOne = async (c: Context<AppEnv>, context: ApplyContext, item: CreateItem) => {
    const prepared = await prepare(c, context, item);
    if ('ok' in prepared) return prepared;
    const { song, textEtag, errors } = prepared;
    const lyrics = song.lyrics ? await putLyrics(c.env.CATALOG, song.lyrics) : null;
    const files = { audioKey: item.audioKey, mvKey: item.mvKey, textSourceEtag: textEtag };
    const track = { db: c.env.DB, albumId: context.albumId, song, lyrics, files };
    const result = await dropLyricsOnThrow(c.env, lyrics?.jsonName, () =>
        insertNumbered(track, item.no),
    );
    if (result === null || typeof result === 'string') {
        // 寫唔到：啱啱寫嘅歌詞檔未入過 catalog，即刻收返
        await dropUnusedLyrics(c.env, [lyrics?.jsonName]);
        return failedItem(result === 'numberTaken' ? 'NUMBER_TAKEN' : 'STALE');
    }
    const textApplied = textEtag !== null;
    return {
        ok: true as const,
        trackId: result.id,
        textApplied,
        ...(errors.length > 0 && { details: errors }),
    };
};

export const applyCreate = async (
    c: Context<AppEnv>,
    context: ApplyContext,
    items: CreateItem[],
) => {
    const results = [];
    for (const item of items) {
        const result = await guardItem(() => createOne(c, context, item), failedItem('INTERNAL'));
        results.push({ no: item.no, ...result });
    }
    return results;
};
