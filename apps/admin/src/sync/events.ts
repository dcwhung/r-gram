/* 同步 runner 發出嘅事件（頁面逐條變成記錄）同最後嘅總結 */
import type { CoverKind, PendingRemoval } from '@r-gram/catalog';
import type { CheckItem, FailedTrack, SiteStats } from '../api/types';

export type SyncEvent =
    | { type: 'started'; folders: number }
    | { type: 'invalidFolder'; folder: string; code: string }
    | { type: 'duplicateId'; id: string; folders: string[] }
    | { type: 'truncated' }
    | { type: 'retry'; folder: string | null; attempt: number; code: string }
    | {
          type: 'folderDone';
          folder: string;
          created: boolean;
          added: number;
          updated: number;
          unchanged: number;
          failed: FailedTrack[];
          checks: CheckItem[];
      }
    | { type: 'folderProblem'; folder: string; code: string }
    | { type: 'coverDone'; folder: string; slot: CoverKind; upscaled: boolean; notSquare: boolean }
    | { type: 'coverProblem'; folder: string; slot: CoverKind; code: string }
    | { type: 'removal'; folder: string; removal: PendingRemoval }
    | { type: 'stopped'; code: string }
    | { type: 'finished'; summary: SyncSummary };

export interface SyncSummary {
    /** 同步完全站統計（API-010）；讀唔到 = null */
    stats: SiteStats | null;
    /** 叫過 API-034 嘅資料夾數 */
    folders: number;
    failedFolders: number;
    coversDone: number;
    coverProblems: number;
    /** 各資料夾嘅檢查結果總數 */
    checks: number;
    /** 待確認移除（資料夾入面 + 已不在媒體資料夾嘅專輯）；呢頁唔會自己移除 */
    pendingRemovals: number;
    /** 中途停咗嘅原因（例如 UNAUTHORIZED）；冇停 = null */
    stopped: string | null;
}

export type Emit = (event: SyncEvent) => void;
