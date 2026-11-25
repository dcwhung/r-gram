/*
 * 掃描：封面來源（Technical Spec「CR-004 → 掃描嘅設計」、CR-005 D55）。只比 ETag，唔讀圖（圖由管理端處理）。
 * `cover.jpg` 同 `cover.png` 都有 = 衝突；第二張封面要有第一張：資料夾冇可用嘅第一張、專輯本身亦冇封面 →
 * 已略過（NO_FIRST_COVER）
 */
import type { FileGroups } from './scanFiles';
import type {
    CoverKind,
    CoverSource,
    FileChange,
    ScanAlbumState,
    ScanConflict,
    SkippedFile,
} from './scanTypes';

export interface CoverPlan {
    cover: CoverSource | null;
    cover2: CoverSource | null;
    conflicts: ScanConflict[];
    skipped: SkippedFile[];
}

/** 同上次套用嘅值（ETag 或者 key）比：冇 = new、一樣 = same、唔同 = replace */
export const etagChange = (value: string, stored: string | null): FileChange => {
    if (stored === null) return 'new';
    return value === stored ? 'same' : 'replace';
};

const sourceOf = (
    groups: FileGroups,
    kind: CoverKind,
    stored: string | null,
    hasCover: boolean,
): CoverSource | null => {
    const files = groups.covers.get(kind) ?? [];
    const [file] = files;
    if (files.length !== 1 || !file) return null;
    const { key, etag, bytes } = file;
    return { key, etag, bytes, change: etagChange(etag, stored), hasCover };
};

const conflictsOf = (groups: FileGroups): ScanConflict[] =>
    [...groups.covers.entries()]
        .filter(([, files]) => files.length > 1)
        .map(([kind, files]) => ({ kind, keys: files.map(({ key }) => key) }));

export const planCovers = (groups: FileGroups, album: ScanAlbumState): CoverPlan => {
    const cover = sourceOf(groups, 'cover', album.coverSourceEtag, album.hasCover);
    const second = sourceOf(groups, 'cover2', album.cover2SourceEtag, album.hasCover2);
    const firstMissing = cover === null && !album.hasCover;
    const skipped: SkippedFile[] =
        second && firstMissing
            ? [{ key: second.key, kind: 'cover2', reason: 'NO_FIRST_COVER' }]
            : [];
    return {
        cover,
        cover2: firstMissing ? null : second,
        conflicts: conflictsOf(groups),
        skipped,
    };
};
