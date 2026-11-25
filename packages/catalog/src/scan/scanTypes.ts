/*
 * 掃描計劃（planScan()）嘅輸入同輸出型別。Technical Spec API-030（CR-004、CR-005、CR-006）嘅預覽就係由佢砌：
 * Worker 再加上歌曲文字檔嘅解析結果同手動指定檔案嘅存在檢查（要讀 R2，唔喺純函數做）
 */
import type { CoverKind, NumberedKind, UnmatchedReason } from './classifyFile';
import type { ScanFile } from './scanFiles';

export type MediaKind = Exclude<NumberedKind, 'text'>;
export type FileChange = 'new' | 'replace' | 'same';

/** 資料庫入面嘅一首歌（呢張專輯） */
export interface ScanTrackState {
    id: string;
    no: number;
    title: string;
    audioKey: string | null;
    audioManual: boolean;
    mvKey: string | null;
    mvManual: boolean;
    /** 上次由掃描套用嘅 .txt 嘅 ETag；NULL = 未套用過 */
    textSourceEtag: string | null;
}

export interface ScanAlbumState {
    coverSourceEtag: string | null;
    cover2SourceEtag: string | null;
    hasCover: boolean;
    hasCover2: boolean;
}

export interface ScanInput {
    albumId: string;
    /** 專輯資料夾第一層嘅檔 */
    files: readonly ScanFile[];
    tracks: readonly ScanTrackState[];
    album: ScanAlbumState;
    /** 已經有人用嘅歌 id（`trackIdFor()` 撞咗就要套用時先生成隨機 id） */
    takenIds: ReadonlySet<string>;
}

export interface CoverSource {
    key: string;
    etag: string;
    bytes: number;
    change: FileChange;
    /** 專輯而家已經有呢個位嘅封面（套用 = 取代） */
    hasCover: boolean;
}

export interface TextSource {
    key: string;
    etag: string;
    bytes: number;
}

export interface NewTrackPlan {
    no: number;
    /** `trackIdFor(albumId, no)`；已經有人用 = null（套用時生成隨機 id） */
    trackId: string | null;
    audio: { key: string; bytes: number };
    mv: { key: string; bytes: number } | null;
    text: TextSource | null;
    /** 冇（有效嘅）歌曲文字檔時用嘅歌名 */
    fileTitle: string;
}

/** 現有歌嘅歌曲文字檔；`unchanged` = ETag 同上次套用嘅一樣（唔使讀檔） */
export interface TextCandidate extends TextSource {
    trackId: string;
    no: number;
    unchanged: boolean;
}

export interface MatchedMedia {
    trackId: string;
    no: number;
    kind: MediaKind;
    key: string;
    bytes: number;
    change: FileChange;
}

export type SkipReason = 'NO_AUDIO' | 'AUDIO_CONFLICT' | 'NO_FIRST_COVER';

export interface SkippedFile {
    key: string;
    no?: number;
    kind: 'text' | 'mv' | 'cover2';
    reason: SkipReason;
}

export interface ScanConflict {
    no?: number;
    kind: NumberedKind | 'cover' | 'cover2';
    keys: string[];
}

export interface ScanPlan {
    cover: CoverSource | null;
    cover2: CoverSource | null;
    newTracks: NewTrackPlan[];
    songTexts: TextCandidate[];
    matched: MatchedMedia[];
    audioMissing: {
        trackId: string;
        no: number;
        title: string;
        key: string;
        /** 套用 clearAudio 時一齊清嘅 MV 連結（MV 檔仲喺資料夾都清，S-135）；冇 MV 或者手動指定 = null */
        mvKey: string | null;
    }[];
    manualKept: { trackId: string; kind: MediaKind; key: string }[];
    skipped: SkippedFile[];
    conflicts: ScanConflict[];
    unmatchedFiles: { key: string; reason: UnmatchedReason }[];
    tracksWithoutAudio: { trackId: string; no: number; title: string }[];
}

export type { CoverKind };
