/*
 * 一個專輯資料夾嘅同步計劃（planFolderSync()；Technical Spec「CR-007 → 同步嘅設計」、Functional Spec D67–D77）
 * 嘅輸入同輸出。純資料：Worker 負責 list、讀 `info.txt`、讀 `.txt`、寫 D1
 */
import type { AlbumInfo } from '../album-info/types';
import type { CoverKind } from '../scan/classifyFile';
import type { ScanFile } from '../scan/scanFiles';
import type { Check } from './checks';

/** D1 入面呢張碟嘅一首歌 */
export interface SyncTrackState {
    id: string;
    no: number;
    title: string;
    audioKey: string | null;
    mvKey: string | null;
    /** 嗰首歌嘅 `.txt` key（就算內容有錯都記，文字框要開得返嚟改） */
    textKey: string | null;
    /** 上次成功匯入嘅 `.txt` 版本；NULL = 未匯入過 */
    textSourceEtag: string | null;
}

/** D1 入面嘅專輯（新專輯 = null） */
export interface SyncAlbumState {
    title: string;
    year: number | null;
    infoEtag: string | null;
    coverSourceEtag: string | null;
    cover2SourceEtag: string | null;
    hasCover: boolean;
    hasCover2: boolean;
    /** 上次同步嘅檢查結果（冇重新讀嘅檔嘅結果照搬） */
    checks: readonly Check[];
}

/**
 * `info.txt`：none = 資料夾冇；unchanged = ETag 同 albums.info_etag 一樣，冇讀（曲目表 = D1 嘅歌）；
 * read = 讀咗（用唔到嘅檔 = `info.usable` false，例如太大、唔係 UTF-8）
 */
export type SyncInfo =
    | { kind: 'none' }
    | { kind: 'unchanged'; key: string; etag: string }
    | { kind: 'read'; key: string; etag: string; info: AlbumInfo };

export interface SyncInput {
    albumId: string;
    /** 資料夾第一層嘅檔（list 結果） */
    files: readonly ScanFile[];
    info: SyncInfo;
    album: SyncAlbumState | null;
    tracks: readonly SyncTrackState[];
    /** list 唔齊：唔可以判斷「檔冇咗」，唔出移除 */
    truncated: boolean;
}

/** 一個要讀嘅 `.txt` */
export interface TextSource {
    key: string;
    etag: string;
    bytes: number;
}

/**
 * 曲目表入面嘅一首歌（同步之後嘅樣）。`titleSource`：info = `info.txt` 嘅歌名；
 * file = 冇 `info.txt`：讀到有效嘅 `.txt` 就用佢第一行，否則用 `title`（D1 已有嘅歌名或者音檔檔名）
 */
export interface PlannedTrack {
    no: number;
    /** D1 嘅 id；null = 新歌 */
    trackId: string | null;
    title: string;
    titleSource: 'info' | 'file';
    audioKey: string | null;
    mvKey: string | null;
    textKey: string | null;
    /** 要讀嘅 `.txt`（ETag 同上次匯入唔同、換咗檔或者歌名改咗）；唔使讀 = null */
    read: TextSource | null;
    /** 比較 `.txt` 第一行嘅歌名：info 模式 = `info.txt` 歌名；冇 `info.txt` = 音檔檔名 */
    compareTitle: string | null;
    /** 同 D1 比有冇欄位要改（新歌 = true；`.txt` 內容由讀檔決定） */
    changed: boolean;
}

export type RemovalKind = 'album' | 'track' | 'audio' | 'mv' | 'text' | 'cover';

/** 待確認移除（Functional Spec D73、D76）：API-035 嘅一項，加顯示用嘅資料 */
export interface PendingRemoval {
    kind: RemovalKind;
    albumId: string;
    trackId?: string;
    /** audio / mv / text：D1 而家記住嘅 key（確認時要一樣） */
    key?: string;
    slot?: CoverKind;
    no?: number;
    title?: string;
}

/** 封面來源要喺管理端處理（Technical Spec API-017；T-055） */
export interface CoverJob {
    slot: CoverKind;
    key: string;
    etag: string;
    bytes: number;
}

export interface FolderPlan {
    album: { title: string; year: number | null };
    /** 曲目表嘅歌，按歌號 */
    tracks: PlannedTrack[];
    pendingRemovals: PendingRemoval[];
    coverJobs: CoverJob[];
    /** 唔使讀檔就知嘅檢查結果（連照搬嘅 `info.txt`、封面結果）；`.txt` 內容嘅結果由 textChecks() 出 */
    checks: Check[];
    /**
     * `info.txt` 嘅 ETag 可以記低：讀到而且用得、冇曲目要待確認移除。
     * 唔記 = 下次再讀（待確認移除嘅歌下次照列出）
     */
    infoSettled: boolean;
}
