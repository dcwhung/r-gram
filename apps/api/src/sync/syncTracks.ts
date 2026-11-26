/*
 * 同步：一批歌（Technical Spec「同步嘅設計」API-034、「每個請求嘅操作上限」）。
 * 「有嘢做」嘅歌（要寫 D1 或者要讀 `.txt`）由歌號 `from` 起，每次最多 SYNC_TRACKS_MAX 首；仲有就回 more / nextFrom。
 * `.txt` 一齊讀（每個讀取各自保護），之後逐首寫；一首出 exception = 嗰首 INTERNAL，其他照做（W-035）
 */
import { textChecks, type Check, type PlannedTrack } from '@r-gram/catalog';
import type { Context } from 'hono';
import type { AppEnv } from '../app';
import { SYNC_TRACKS_MAX } from '../config';
import { guardItem } from '../media/applyGuard';
import { readSongTextFile, type TextRead } from '../media/songTextFile';
import { failedItem, type ItemCode } from './errors';
import type { StoredTrack } from './folderState';
import { titleOf, writeTrack, type WriteResult } from './trackWrite';

interface TrackItem {
    trackId: string;
    no: number;
    title: string;
}

export interface TracksOutcome {
    added: TrackItem[];
    updated: TrackItem[];
    failed: { no: number; trackId: string | null; code: ItemCode; message: string }[];
    unchanged: number;
    checks: Check[];
    /** 今次讀咗嘅 `.txt`（其餘嘅檢查結果照搬上次） */
    readKeys: Set<string>;
    more: boolean;
    nextFrom: number | null;
}

const READ_FAILED = 'readFailed' as const;
type ReadOutcome = TextRead | null | typeof READ_FAILED;

const hasWork = (track: PlannedTrack): boolean => track.changed || track.read !== null;

export const batchOf = (tracks: readonly PlannedTrack[], from: number) => {
    const work = tracks.filter((track) => track.no >= from && hasWork(track));
    const next = work[SYNC_TRACKS_MAX];
    return {
        batch: work.slice(0, SYNC_TRACKS_MAX),
        more: next !== undefined,
        nextFrom: next?.no ?? null,
    };
};

const readAll = (bucket: R2Bucket, batch: readonly PlannedTrack[]): Promise<ReadOutcome[]> =>
    Promise.all(
        batch.map(({ read }) =>
            read ? guardItem(() => readSongTextFile(bucket, read), READ_FAILED) : null,
        ),
    );

const summaryOf = (read: TextRead) => ({
    title: read.song?.title ?? null,
    errors: read.errors.map(({ line, reason }) => ({ line, reason })),
    hints: read.hints,
});

const failure = (planned: PlannedTrack, code: ItemCode) => ({
    no: planned.no,
    trackId: planned.trackId,
    code,
    message: failedItem(code).message,
});

const record = (
    outcome: TracksOutcome,
    result: WriteResult,
    item: TrackItem,
    planned: PlannedTrack,
) => {
    if (result === 'added') outcome.added.push(item);
    else if (result === 'updated') outcome.updated.push(item);
    else if (result === 'unchanged') outcome.unchanged += 1;
    else outcome.failed.push(failure(planned, 'STALE'));
};

interface Job {
    albumId: string;
    planned: PlannedTrack;
    stored: StoredTrack | undefined;
}

const addTextChecks = (outcome: TracksOutcome, planned: PlannedTrack, read: TextRead) => {
    if (!planned.read) return;
    const { key } = planned.read;
    outcome.readKeys.add(key);
    const { no, compareTitle } = planned;
    outcome.checks.push(...textChecks({ no, key, compareTitle, read: summaryOf(read) }));
};

const runOne = async (c: Context<AppEnv>, job: Job, read: ReadOutcome, outcome: TracksOutcome) => {
    const { planned } = job;
    if (read === READ_FAILED) return void outcome.failed.push(failure(planned, 'INTERNAL'));
    if (read) addTextChecks(outcome, planned, read);
    const fullJob = { ...job, read };
    const written = await guardItem(() => writeTrack(c, fullJob), null);
    if (!written) return void outcome.failed.push(failure(planned, 'INTERNAL'));
    const item = { trackId: written.trackId ?? '', no: planned.no, title: titleOf(fullJob) };
    record(outcome, written.result, item, planned);
};

export const syncTracks = async (
    c: Context<AppEnv>,
    albumId: string,
    tracks: { planned: readonly PlannedTrack[]; stored: readonly StoredTrack[] },
    from: number,
): Promise<TracksOutcome> => {
    const { batch, more, nextFrom } = batchOf(tracks.planned, from);
    const stored = new Map(tracks.stored.map((track) => [track.no, track]));
    const idle = tracks.planned.filter((track) => !hasWork(track)).length;
    const outcome: TracksOutcome = {
        added: [],
        updated: [],
        failed: [],
        unchanged: idle,
        checks: [],
        readKeys: new Set(),
        more,
        nextFrom,
    };
    const reads = await readAll(c.env.MEDIA, batch);
    for (const [index, planned] of batch.entries())
        await runOne(
            c,
            { albumId, planned, stored: stored.get(planned.no) },
            reads[index] ?? null,
            outcome,
        );
    return outcome;
};
