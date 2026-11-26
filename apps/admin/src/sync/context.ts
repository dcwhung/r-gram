/* runner 各部分共用：依賴、發事件、等待、重試記錄 */
import type { CoverJob } from '@r-gram/catalog';
import type { AdminApi } from '../api/adminApi';
import type { ProcessedCover } from '../covers/processCover';
import type { Emit } from './events';
import { problemCode } from './problem';
import { realWait, type Wait } from './retry';

/** runner 用到嘅 API（刻意冇 API-035 確認移除） */
export type SyncApi = Pick<
    AdminApi,
    'syncOverview' | 'syncFolder' | 'uploadImage' | 'putCover' | 'stats'
>;

export interface SyncDeps {
    api: SyncApi;
    /** 攞封面來源 + 處理（fetchSource + processCover）；mediaBase 由 API-033 嚟 */
    prepareCover: (mediaBase: string, job: CoverJob) => Promise<ProcessedCover>;
    wait?: Wait;
}

export interface SyncContext {
    deps: SyncDeps;
    emit: Emit;
    wait: Wait;
    retried: (folder: string | null, attempt: number, error: unknown) => void;
}

export const contextOf = (deps: SyncDeps, emit: Emit): SyncContext => ({
    deps,
    emit,
    wait: deps.wait ?? realWait,
    retried: (folder, attempt, error) =>
        emit({ type: 'retry', folder, attempt, code: problemCode(error) }),
});
