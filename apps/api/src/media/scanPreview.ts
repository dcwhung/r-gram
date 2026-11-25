/*
 * API-030 GET /api/albums/:albumId/scan（T-025）：列專輯資料夾（`albums.folder`，NULL = 預期資料夾名）→ planScan()
 * → `.txt` 讀取（分批）→ 手動指定嘅檔仲喺唔喺度（manualMissing：只係提示）。唔寫 D1、唔寫 R2。
 * 操作上限（S-136）：list 最多 SCAN_LIST_PAGES_MAX 頁（唔齊 = listTruncated，唔列 audioMissing：
 * 唔知個檔係咪真係唔見咗）；其他資料夾嘅手動指定檔最多 head SCAN_MANUAL_HEADS_MAX 個，其餘列喺 manualUnchecked。
 * Query `from`（歌號，預設 1）：由邊個歌號起讀 `.txt`（上一次回 `more: true` 時用佢嘅 `nextFrom`）
 */
import { planScan, TRACK_NO_MIN, isTrackNo, type ScanPlan } from '@r-gram/catalog';
import type { Context } from 'hono';
import { findAlbum } from '../albums/store';
import type { AppEnv } from '../app';
import { SCAN_MANUAL_HEADS_MAX } from '../config';
import { scanError, scanValidationError, withReasonMessages } from './errors';
import { isDirectChild, listFolder, type FolderListing } from './listing';
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

type ManualKept = ScanPlan['manualKept'][number];

/** 喺呢個資料夾 = 睇 list（list 唔齊就唔檢查）；其他資料夾 = head，最多 SCAN_MANUAL_HEADS_MAX 個 */
const splitManual = (state: ScanState, plan: ScanPlan, listing: FolderListing) => {
    const inFolder = plan.manualKept.filter(({ key }) => isDirectChild(key, state.folder));
    const elsewhere = plan.manualKept.filter(({ key }) => !isDirectChild(key, state.folder));
    const headed = elsewhere.slice(0, SCAN_MANUAL_HEADS_MAX);
    const unchecked = elsewhere.slice(SCAN_MANUAL_HEADS_MAX);
    return listing.truncated
        ? { inFolder: [], headed, unchecked: [...inFolder, ...unchecked] }
        : { inFolder, headed, unchecked };
};

/** 手動指定嘅檔：manualMissing = 檢查過、唔喺度；manualUnchecked = 到咗上限冇檢查（只係提示） */
const manualChecksOf = async (
    bucket: R2Bucket,
    state: ScanState,
    plan: ScanPlan,
    listing: FolderListing,
) => {
    const { inFolder, headed, unchecked } = splitManual(state, plan, listing);
    const listed = new Set(listing.files.map(({ key }) => key));
    const exists = await Promise.all(
        headed.map(async ({ key }) => (await bucket.head(key)) !== null),
    );
    const missing = new Set<ManualKept>([
        ...inFolder.filter(({ key }) => !listed.has(key)),
        ...headed.filter((_, index) => !exists[index]),
    ]);
    const manualMissing = plan.manualKept.filter((item) => missing.has(item));
    return { manualMissing, manualUnchecked: unchecked };
};

const previewBody = (state: ScanState, plan: ScanPlan, batch: ReadBatch, complete: boolean) => {
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
        audioMissing: complete ? plan.audioMissing : [],
        manualKept: plan.manualKept,
        skipped: withReasonMessages(plan.skipped),
        conflicts: plan.conflicts,
        unmatchedFiles: withReasonMessages(plan.unmatchedFiles),
        tracksWithoutAudio: plan.tracksWithoutAudio,
        more: batch.more,
        nextFrom: batch.nextFrom,
        listTruncated: !complete,
    };
};

export const scanPreview = async (c: Context<AppEnv>, albumId: string) => {
    const from = readFrom(c);
    if (from === undefined)
        return scanValidationError(c, [{ path: FROM_QUERY, reason: 'INVALID_NUMBER' }]);
    const album = await findAlbum(c.env.DB, albumId);
    if (!album) return scanError(c, 'notFound');
    const state = await readScanState(c.env.DB, album);
    const listing = await listFolder(c.env.MEDIA, state.folder);
    if (listing.files.length === 0) return scanError(c, 'folderEmpty');
    const plan = planScan({ albumId, files: listing.files, ...state });
    const batch = await readTexts(c.env.MEDIA, plan, from);
    const manual = await manualChecksOf(c.env.MEDIA, state, plan, listing);
    return c.json({ ...previewBody(state, plan, batch, !listing.truncated), ...manual });
};
