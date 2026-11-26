/*
 * 全 bucket 同步（Technical Spec「CR-007 → 同步嘅設計 → 管理端（T-055）點樣行」；T-116 暫用頁同 T-055 共用）：
 * API-033 → 逐個資料夾（照 API-033 次序）API-034（`more` 再叫）→ 嗰個資料夾嘅 coverJobs → 下一個。
 * 一個資料夾失敗：記錄、下一個照做（連唔到或者 server 出錯先再試）；session 過期就停。
 * 待確認移除只列出（資料夾入面嘅 + API-033 嘅 missingAlbums）：永遠唔叫 API-035，要管理員剔選確認先做（D73、D76）。
 * 中途閂頁：做完嘅資料夾已經生效；再㩒一次 = 由頭再同步，冇改嘅資料夾好快過
 */
import type { PendingRemoval } from '@r-gram/catalog';
import type { SyncOverview } from '../api/types';
import { contextOf, type SyncContext, type SyncDeps } from './context';
import { runCoverJobs, type CoverTally } from './coverPass';
import type { Emit, SyncSummary } from './events';
import { syncFolderPages } from './folderPass';
import { problemCode } from './problem';
import { withRetry } from './retry';
import { isUnauthorized } from './stop';

export type { SyncDeps } from './context';
export type { SyncEvent, SyncSummary } from './events';

interface Tally extends CoverTally {
    folders: number;
    failedFolders: number;
    checks: number;
    removals: { folder: string; removal: PendingRemoval }[];
}

const announce = ({ folders, invalid, duplicateIds, truncated }: SyncOverview, emit: Emit) => {
    emit({ type: 'started', folders: folders.length });
    for (const { folder, code } of invalid) emit({ type: 'invalidFolder', folder, code });
    for (const { id, folders: names } of duplicateIds)
        emit({ type: 'duplicateId', id, folders: names });
    if (truncated) emit({ type: 'truncated' });
};

/** 一個資料夾嘅 API-034（全部批次）；失敗 = 記錄、回 null（session 過期就成個停） */
const tryFolder = async (context: SyncContext, folder: string, tally: Tally) => {
    tally.folders += 1;
    try {
        return await syncFolderPages(context, folder);
    } catch (error) {
        if (isUnauthorized(error)) throw error;
        context.emit({ type: 'folderProblem', folder, code: problemCode(error) });
        tally.failedFolders += 1;
        return null;
    }
};

const syncOne = async (context: SyncContext, mediaBase: string, folder: string, tally: Tally) => {
    const outcome = await tryFolder(context, folder, tally);
    if (!outcome) return;
    const { last, created, added, updated, failed } = outcome;
    const { unchanged, checks } = last;
    const done = { folder, created, added, updated, unchanged, failed, checks };
    context.emit({ type: 'folderDone', ...done });
    tally.checks += checks.length;
    tally.removals.push(...last.pendingRemovals.map((removal) => ({ folder, removal })));
    const target = { mediaBase, albumId: last.album.id, folder };
    await runCoverJobs(context, target, last.coverJobs, tally);
};

const syncAll = async (context: SyncContext, tally: Tally) => {
    const { api } = context.deps;
    const onRetry = (attempt: number, error: unknown) => context.retried(null, attempt, error);
    const overview = await withRetry(() => api.syncOverview(), context.wait, onRetry);
    announce(overview, context.emit);
    for (const { folder } of overview.folders)
        await syncOne(context, overview.mediaBase, folder, tally);
    const missing = overview.missingAlbums.map((album) => ({
        folder: album.folder,
        removal: album,
    }));
    for (const item of [...tally.removals, ...missing]) context.emit({ type: 'removal', ...item });
    return tally.removals.length + missing.length;
};

const readStats = async (context: SyncContext) => {
    try {
        return await context.deps.api.stats();
    } catch {
        return null;
    }
};

type Outcome = Pick<SyncSummary, 'stats' | 'pendingRemovals' | 'stopped'>;

const finish = async (context: SyncContext, tally: Tally): Promise<Outcome> => {
    try {
        const pendingRemovals = await syncAll(context, tally);
        return { pendingRemovals, stats: await readStats(context), stopped: null };
    } catch (error) {
        const code = problemCode(error);
        context.emit({ type: 'stopped', code });
        return { pendingRemovals: 0, stats: null, stopped: code };
    }
};

export const runSync = async (deps: SyncDeps, emit: Emit): Promise<SyncSummary> => {
    const context = contextOf(deps, emit);
    const tally: Tally = {
        folders: 0,
        failedFolders: 0,
        checks: 0,
        done: 0,
        problems: 0,
        removals: [],
    };
    const outcome = await finish(context, tally);
    const { folders, failedFolders, checks, done, problems } = tally;
    const counts = { folders, failedFolders, checks, coversDone: done, coverProblems: problems };
    const summary = { ...outcome, ...counts };
    emit({ type: 'finished', summary });
    return summary;
};
