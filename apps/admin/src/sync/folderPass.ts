/*
 * 一個資料夾（API-034）：`more` 就由 `nextFrom` 再叫，直到做完（大碟分批，Technical Spec「每個請求嘅操作上限」）。
 * 每次叫都會重新計劃成個資料夾，所以檢查結果、封面工作、待確認移除用最後一次嘅回應；新增、更新逐批加埋
 */
import type { FolderSyncResult } from '../api/types';
import type { SyncContext } from './context';
import { withRetry } from './retry';

/** 一個資料夾最多叫幾多批（999 首 ÷ 每批 100 首 = 10；多啲位，防止 Worker 回錯 nextFrom 時無限 loop） */
const FOLDER_PAGES_MAX = 20;

export interface FolderOutcome {
    last: FolderSyncResult;
    created: boolean;
    added: number;
    updated: number;
    failed: FolderSyncResult['failed'];
}

const page = (context: SyncContext, folder: string, from: number | undefined) =>
    withRetry(
        () => context.deps.api.syncFolder(folder, from),
        context.wait,
        (attempt, error) => context.retried(folder, attempt, error),
    );

const merge = (outcome: FolderOutcome | null, result: FolderSyncResult): FolderOutcome => ({
    last: result,
    created: outcome?.created ?? result.album.created,
    added: (outcome?.added ?? 0) + result.added.length,
    updated: (outcome?.updated ?? 0) + result.updated.length,
    failed: [...(outcome?.failed ?? []), ...result.failed],
});

export const syncFolderPages = async (
    context: SyncContext,
    folder: string,
): Promise<FolderOutcome> => {
    let outcome = merge(null, await page(context, folder, undefined));
    for (let pages = 1; pages < FOLDER_PAGES_MAX; pages += 1) {
        const { more, nextFrom } = outcome.last;
        if (!more || nextFrom === null) break;
        outcome = merge(outcome, await page(context, folder, nextFrom));
    }
    return outcome;
};
