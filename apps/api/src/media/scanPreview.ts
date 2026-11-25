/*
 * API-030 GET /api/albums/:albumId/scan（T-025）：列專輯資料夾（`albums.folder`，NULL = 預期資料夾名）→ planScan()
 * → `.txt` 讀取（分批）→ 手動指定嘅檔仲喺唔喺度（manualMissing：只係提示）。唔寫 D1、唔寫 R2。
 * Query `from`（歌號，預設 1）：由邊個歌號起讀 `.txt`（上一次回 `more: true` 時用佢嘅 `nextFrom`）
 */
import { planScan, TRACK_NO_MIN, isTrackNo, type ScanFile, type ScanPlan } from '@r-gram/catalog';
import type { Context } from 'hono';
import { findAlbum } from '../albums/store';
import type { AppEnv } from '../app';
import { scanError, scanValidationError, withReasonMessages } from './errors';
import { isDirectChild, listFolder } from './listing';
import { newTrackView, readTexts, songTextView, type ReadBatch } from './preview';
import { readScanState, type ScanState } from './state';

const FROM_QUERY = 'from';

/** `from` 冇畀 = 1；唔係歌號 → undefined */
const readFrom = (c: Context): number | undefined => {
    const raw = c.req.query(FROM_QUERY);
    if (raw === undefined) return TRACK_NO_MIN;
    const value = Number(raw);
    return /^\d+$/.test(raw) && isTrackNo(value) ? value : undefined;
};

/** 手動指定嘅檔：喺呢個資料夾就睇 list，其他資料夾就 head（只限呢張碟，數量少） */
const manualMissingOf = async (
    bucket: R2Bucket,
    state: ScanState,
    plan: ScanPlan,
    files: ScanFile[],
) => {
    const listed = new Set(files.map(({ key }) => key));
    const exists = await Promise.all(
        plan.manualKept.map(async ({ key }) =>
            isDirectChild(key, state.folder) ? listed.has(key) : (await bucket.head(key)) !== null,
        ),
    );
    return plan.manualKept.filter((_, index) => !exists[index]);
};

const previewBody = (state: ScanState, plan: ScanPlan, batch: ReadBatch) => {
    const tracks = new Map(state.tracks.map((track) => [track.id, track]));
    return {
        folder: state.folder,
        expectedFolder: state.expectedFolder,
        cover: plan.cover,
        cover2: plan.cover2,
        newTracks: plan.newTracks.map((track) => newTrackView(track, batch.reads)),
        songTexts: plan.songTexts.map((text) =>
            songTextView(text, tracks.get(text.trackId), batch.reads),
        ),
        matched: plan.matched,
        audioMissing: plan.audioMissing,
        manualKept: plan.manualKept,
        skipped: withReasonMessages(plan.skipped),
        conflicts: plan.conflicts,
        unmatchedFiles: withReasonMessages(plan.unmatchedFiles),
        tracksWithoutAudio: plan.tracksWithoutAudio,
        more: batch.more,
        nextFrom: batch.nextFrom,
    };
};

export const scanPreview = async (c: Context<AppEnv>, albumId: string) => {
    const from = readFrom(c);
    if (from === undefined)
        return scanValidationError(c, [{ path: FROM_QUERY, reason: 'INVALID_NUMBER' }]);
    const album = await findAlbum(c.env.DB, albumId);
    if (!album) return scanError(c, 'notFound');
    const state = await readScanState(c.env.DB, album);
    const files = await listFolder(c.env.MEDIA, state.folder);
    if (files.length === 0) return scanError(c, 'folderEmpty');
    const plan = planScan({ albumId, files, ...state });
    const batch = await readTexts(c.env.MEDIA, plan, from);
    const manualMissing = await manualMissingOf(c.env.MEDIA, state, plan, files);
    return c.json({ ...previewBody(state, plan, batch), manualMissing });
};
