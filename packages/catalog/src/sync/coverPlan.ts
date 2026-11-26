/*
 * 同步：封面來源（Technical Spec「同步嘅設計」步驟 5、6；Functional Spec D55、D74、D76）。只比 ETag，唔讀圖：
 * - 一個 `cover.jpg｜png`，ETag 同上次處理嘅唔同 → coverJobs（管理端處理，API-050 + API-017）；一樣 = 上次嘅結果照搬
 * - 兩個 = COVER_CONFLICT，唔處理；一個都冇而專輯有封面 = 待確認移除
 * - 第二張要資料夾有一個第一張：冇 = NO_FIRST_COVER
 */
import type { CoverKind } from '../scan/classifyFile';
import type { FileGroups } from '../scan/scanFiles';
import { checkOf, type Check } from './checks';
import { carriedChecks } from './textChecks';
import type { CoverJob, PendingRemoval, SyncAlbumState } from './types';

export interface CoverPlan {
    jobs: CoverJob[];
    removals: PendingRemoval[];
    checks: Check[];
}

interface Stored {
    etag: string | null;
    has: boolean;
}

const storedOf = (album: SyncAlbumState | null, slot: CoverKind): Stored => ({
    etag: (slot === 'cover' ? album?.coverSourceEtag : album?.cover2SourceEtag) ?? null,
    has: (slot === 'cover' ? album?.hasCover : album?.hasCover2) ?? false,
});

const EMPTY: CoverPlan = { jobs: [], removals: [], checks: [] };

const slotPlan = (
    groups: FileGroups,
    slot: CoverKind,
    album: SyncAlbumState | null,
    albumId: string,
): CoverPlan => {
    const files = groups.covers.get(slot) ?? [];
    const stored = storedOf(album, slot);
    const [file] = files;
    if (!file)
        return stored.has ? { ...EMPTY, removals: [{ kind: 'cover', albumId, slot }] } : EMPTY;
    if (files.length > 1)
        return {
            ...EMPTY,
            checks: files.map(({ key }) => checkOf('COVER_CONFLICT', { key }, { slot })),
        };
    if (file.etag === stored.etag)
        return { ...EMPTY, checks: carriedChecks(album?.checks ?? [], new Set([file.key])) };
    const { key, etag, bytes } = file;
    return { ...EMPTY, jobs: [{ slot, key, etag, bytes }] };
};

const merge = (plans: readonly CoverPlan[]): CoverPlan => ({
    jobs: plans.flatMap(({ jobs }) => jobs),
    removals: plans.flatMap(({ removals }) => removals),
    checks: plans.flatMap(({ checks }) => checks),
});

export const planCovers = (
    groups: FileGroups,
    album: SyncAlbumState | null,
    albumId: string,
): CoverPlan => {
    const first = slotPlan(groups, 'cover', album, albumId);
    const second = slotPlan(groups, 'cover2', album, albumId);
    const hasFirst = (groups.covers.get('cover') ?? []).length === 1;
    const [cover2] = groups.covers.get('cover2') ?? [];
    if (hasFirst || !cover2) return merge([first, second]);
    const noFirst = checkOf('NO_FIRST_COVER', { key: cover2.key });
    return merge([first, { ...second, jobs: [], checks: [noFirst] }]);
};
