/*
 * 一個資料夾嘅 coverJobs（Technical Spec「管理端（T-055）點樣行」）：第一張先（第二張要有第一張）→
 * 攞來源、處理 → API-050 × 2（1200、320）→ API-017（第一張連專輯色；裁走咗兩邊 = notSquare）。
 * 失敗 = 記錄入面嘅問題，ETag 冇記低，下次同步再試（COVER_FAILED 而家冇 endpoint 儲存，backlog B-081 ③：只喺頁面顯示）
 */
import type { CoverJob } from '@r-gram/catalog';
import { isUnauthorized } from './stop';
import type { SyncContext } from './context';
import { problemCode } from './problem';
import { withRetry } from './retry';

export interface CoverTally {
    done: number;
    problems: number;
}

const SLOT_ORDER: Readonly<Record<CoverJob['slot'], number>> = { cover: 0, cover2: 1 };

interface CoverTarget {
    mediaBase: string;
    albumId: string;
    folder: string;
}

const store = async (context: SyncContext, target: CoverTarget, job: CoverJob) => {
    const { api, prepareCover } = context.deps;
    const { albumId, folder } = target;
    const retry = <T>(call: () => Promise<T>) =>
        withRetry(call, context.wait, (attempt, error) => context.retried(folder, attempt, error));
    const result = await prepareCover(target.mediaBase, job);
    const cover = await retry(() => api.uploadImage(result.cover));
    const thumb = await retry(() => api.uploadImage(result.thumb));
    const accent = job.slot === 'cover' && result.accent ? { accent: result.accent } : {};
    const source = { sourceKey: job.key, sourceEtag: job.etag };
    const body = { slot: job.slot, cover: cover.name, thumb: thumb.name, ...source, ...accent };
    await retry(() => api.putCover(albumId, { ...body, notSquare: result.notSquare }));
    return result;
};

export const runCoverJobs = async (
    context: SyncContext,
    target: CoverTarget,
    jobs: readonly CoverJob[],
    tally: CoverTally,
): Promise<void> => {
    const ordered = [...jobs].sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]);
    const { folder } = target;
    for (const job of ordered) {
        try {
            const { upscaled, notSquare } = await store(context, target, job);
            context.emit({ type: 'coverDone', folder, slot: job.slot, upscaled, notSquare });
            tally.done += 1;
        } catch (error) {
            if (isUnauthorized(error)) throw error;
            context.emit({
                type: 'coverProblem',
                folder,
                slot: job.slot,
                code: problemCode(error),
            });
            tally.problems += 1;
        }
    }
};
