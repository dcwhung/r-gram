/*
 * API-034 POST /api/sync/folders/:folder?from=<no>（T-105；Technical Spec「CR-007 → 同步嘅設計」）：同步一個資料夾。
 * 次序：資料夾名（400 INVALID_FOLDER）→ bucket 第一層（同 id 409、冇呢個資料夾 404）→ list 資料夾 → D1 狀態 →
 * `info.txt`（ETag 同上次一樣唔讀）→ planFolderSync() → 專輯（冇就建立）→ 一批歌（syncTracks.ts，分批）→
 * 檢查結果同 info_etag → 回應。移除只係列出（API-035 確認先做）。
 * 冇寫到專輯或者歌 = 唔生成 catalog（skipPostWrite）；寫咗就經 api/afterWrite.ts 生成一次，回應加 `catalog`。
 * `info.txt` 嘅 ETag 只喺曲目表完整套用咗先記低（冇待確認移除嘅歌、冇失敗、冇下一批、前面幾批冇漏）：唔記 = 下次再讀
 */
import {
    carriedChecks,
    isTrackNo,
    planFolderSync,
    sortChecks,
    TRACK_NO_MIN,
    type FolderPlan,
    type SyncInfo,
} from '@r-gram/catalog';
import type { Context } from 'hono';
import type { AppEnv } from '../app';
import { listFolder } from '../media/listing';
import { ensureAlbum, finishAlbum, storedFinish } from './albumWrite';
import { withCheckMessages } from './checkMessages';
import { syncError, syncValidationError } from './errors';
import { readFolderState, syncAlbumStateOf, type FolderState } from './folderState';
import { resolveFolder, type FolderTarget } from './folderTarget';
import { readSyncInfo } from './infoFile';
import { syncTracks, type TracksOutcome } from './syncTracks';

const FROM_QUERY = 'from';
const DIGITS = /^\d+$/;

/** `from` 冇畀 = 1；唔係歌號 → undefined */
const readFrom = (c: Context): number | undefined => {
    const raw = c.req.query(FROM_QUERY);
    if (raw === undefined) return TRACK_NO_MIN;
    const value = Number(raw);
    return DIGITS.test(raw) && isTrackNo(value) ? value : undefined;
};

/** 冇重新讀嘅 `.txt`（ETag 冇變、今批冇做）：上次嘅內容檢查結果照搬 */
const unreadTextKeys = (plan: FolderPlan, outcome: TracksOutcome): Set<string> =>
    new Set(
        plan.tracks
            .filter(({ audioKey, textKey }) => audioKey !== null && textKey !== null)
            .map(({ textKey }) => textKey as string)
            .filter((key) => !outcome.readKeys.has(key)),
    );

const checksOf = (
    target: FolderTarget,
    plan: FolderPlan,
    state: FolderState,
    outcome: TracksOutcome,
) => {
    const stored = syncAlbumStateOf(state.album)?.checks ?? [];
    const carried = carriedChecks(stored, unreadTextKeys(plan, outcome));
    return sortChecks([...target.checks, ...plan.checks, ...outcome.checks, ...carried]);
};

/**
 * 成個曲目表套用咗（W-040）：今批冇失敗、冇下一批，而且前面幾批嘅歌（歌號 < from）喺 D1 已經同計劃一樣
 *（前一批失敗嘅歌而家仲係 changed）。用 changed 唔用 read：有格式錯誤、每次都再讀嘅 `.txt` 唔會令 ETag 永遠記唔到
 */
const isComplete = (plan: FolderPlan, outcome: TracksOutcome, from: number): boolean =>
    plan.infoSettled &&
    !outcome.more &&
    outcome.failed.length === 0 &&
    plan.tracks.every((track) => track.no >= from || !track.changed);

const infoEtagOf = (info: SyncInfo, complete: boolean, stored: string | null) => {
    if (info.kind === 'none') return null;
    return complete ? info.etag : stored;
};

interface Synced {
    target: FolderTarget;
    plan: FolderPlan;
    created: boolean;
    outcome: TracksOutcome;
    checks: ReturnType<typeof sortChecks>;
    truncated: boolean;
}

const responseOf = ({ target, plan, created, outcome, checks, truncated }: Synced) => ({
    album: {
        id: target.id,
        folder: target.folder,
        title: plan.album.title,
        year: plan.album.year,
        category: target.category,
        categoryNo: target.categoryNo,
        created,
    },
    added: outcome.added,
    updated: outcome.updated,
    unchanged: outcome.unchanged,
    failed: outcome.failed,
    checks: withCheckMessages(checks),
    pendingRemovals: plan.pendingRemovals,
    coverJobs: plan.coverJobs,
    more: outcome.more,
    nextFrom: outcome.nextFrom,
    truncated,
});

const syncTarget = async (c: Context<AppEnv>, target: FolderTarget, from: number) => {
    const { DB: db, MEDIA: bucket } = c.env;
    const listing = await listFolder(bucket, target.folder);
    if (listing.files.length === 0) return syncError(c, 'folderEmpty');
    const state = await readFolderState(db, target.id);
    const info = await readSyncInfo(bucket, listing.files, state.album?.info_etag ?? null);
    const album = syncAlbumStateOf(state.album);
    const input = { albumId: target.id, files: listing.files, info, album, tracks: state.tracks };
    const plan = planFolderSync({ ...input, truncated: listing.truncated });
    const albumWritten = await ensureAlbum(db, state.album, target, plan.album);
    const outcome = await syncTracks(
        c,
        target.id,
        { planned: plan.tracks, stored: state.tracks },
        from,
    );
    const checks = checksOf(target, plan, state, outcome);
    const stored = storedFinish(state.album);
    const infoEtag = infoEtagOf(info, isComplete(plan, outcome, from), stored.infoEtag);
    await finishAlbum(db, target.id, stored, { checks: JSON.stringify(checks), infoEtag });
    const wrote = albumWritten || outcome.added.length > 0 || outcome.updated.length > 0;
    if (!wrote) c.set('skipPostWrite', true);
    const synced = { target, plan, created: state.album === null, outcome, checks };
    return c.json(responseOf({ ...synced, truncated: listing.truncated }));
};

export const syncFolderRoute = async (c: Context<AppEnv>) => {
    const from = readFrom(c);
    if (from === undefined)
        return syncValidationError(c, [{ path: FROM_QUERY, reason: 'INVALID_NUMBER' }]);
    const target = await resolveFolder(c.env, c.req.param('folder') ?? '');
    if (typeof target === 'string') return syncError(c, target);
    return syncTarget(c, target, from);
};
