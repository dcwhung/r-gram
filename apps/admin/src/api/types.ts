/*
 * 管理端用到嘅 Worker 回應形狀（Technical Spec API-004、API-010、API-017、API-033、API-034、API-050；
 * 實際形狀以 apps/api 為準：CR-008「實作對齊」）。只列同步頁用到嘅欄
 */
import type { CheckCode, CheckLevel, CoverJob, CoverKind, PendingRemoval } from '@r-gram/catalog';

/** 檢查結果（Worker 已經砌好 message） */
export interface CheckItem {
    level: CheckLevel;
    code: CheckCode;
    key?: string;
    no?: number;
    line?: number;
    message: string;
}

export interface SyncFolderItem {
    folder: string;
    id: string;
    category: string;
    categoryNo: number;
    status: 'new' | 'known' | 'duplicate';
}

/** API-033 嘅專輯移除候選 */
export interface MissingAlbum {
    kind: 'album';
    albumId: string;
    folder: string;
    title: string;
}

/** API-033 GET /api/sync */
export interface SyncOverview {
    folders: SyncFolderItem[];
    invalid: { folder: string; code: string; message: string }[];
    duplicateIds: { id: string; folders: string[] }[];
    missingAlbums: MissingAlbum[];
    truncated: boolean;
    /** 媒體 bucket 嘅公開網址（`/` 結尾）：封面來源 = mediaBase + key */
    mediaBase: string;
}

export interface FailedTrack {
    no: number;
    trackId: string | null;
    code: string;
    message: string;
}

/** API-034 POST /api/sync/folders/:folder */
export interface FolderSyncResult {
    album: { id: string; folder: string; title: string; created: boolean };
    added: { no: number }[];
    updated: { no: number }[];
    unchanged: number;
    failed: FailedTrack[];
    checks: CheckItem[];
    pendingRemovals: PendingRemoval[];
    coverJobs: CoverJob[];
    more: boolean;
    nextFrom: number | null;
    truncated: boolean;
}

/** API-050 PUT /api/assets */
export interface UploadedImage {
    name: string;
}

/** API-017 PUT /api/albums/:id/cover 嘅 body */
export interface CoverResultBody {
    slot: CoverKind;
    cover: string;
    thumb: string;
    sourceKey: string;
    sourceEtag: string;
    /** 只喺第一張封面（D69） */
    accent?: string;
    notSquare: boolean;
}

/** API-010 嘅全站統計 */
export interface SiteStats {
    albums: number;
    tracks: number;
    tracksWithAudio: number;
    tracksWithLyrics: number;
    tracksWithMv: number;
    albumsWithCover: number;
}
