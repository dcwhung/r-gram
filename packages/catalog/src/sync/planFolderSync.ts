/*
 * 一個專輯資料夾嘅同步計劃（純函數；Technical Spec「CR-007 → 同步嘅設計」，取代 CR-004–CR-006 嘅 planScan()）：
 * 分類檔案（classifyFile、groupFiles）→ 曲目表（trackList.ts）→ 每首歌嘅檔同要讀嘅 `.txt`（planTrack.ts）→
 * D1 有而曲目表冇嘅歌 = 待確認移除 → 封面（coverPlan.ts）→ 檢查結果。
 * 唔讀檔、唔寫嘢；新增同更新由 Worker 自動做，移除只係列出（確認先做，API-035）。
 * list 唔齊（truncated）：唔知個檔係咪真係冇咗，唔列任何移除
 */
import { groupFiles } from '../scan/scanFiles';
import { planCovers } from './coverPlan';
import { infoConflictChecks, orphanChecks } from './folderChecks';
import { planTrack, type ResolvedTrack } from './planTrack';
import { sortChecks } from './textChecks';
import { trackListOf } from './trackList';
import type { FolderPlan, PendingRemoval, SyncInput } from './types';

const removedTracks = (input: SyncInput, listed: ReadonlySet<number>): PendingRemoval[] =>
    input.tracks
        .filter(({ no }) => !listed.has(no))
        .map(({ id, no, title }) => ({
            kind: 'track',
            albumId: input.albumId,
            trackId: id,
            no,
            title,
        }));

export const planFolderSync = (input: SyncInput): FolderPlan => {
    const groups = groupFiles(input.files);
    const list = trackListOf(input, groups);
    const stored = new Map(input.tracks.map((track) => [track.no, track]));
    const resolved: ResolvedTrack[] = list.entries.map(({ no, title }) =>
        planTrack(list, title, { albumId: input.albumId, no, groups, stored: stored.get(no) }),
    );
    const listed = new Set(list.entries.map(({ no }) => no));
    const covers = planCovers(groups, input.album, input.albumId);
    const gone = removedTracks(input, listed);
    const removals = [...resolved.flatMap(({ removals }) => removals), ...gone, ...covers.removals];
    const checks = [
        ...list.checks,
        ...infoConflictChecks(groups),
        ...resolved.flatMap(({ checks }) => checks),
        ...orphanChecks(groups, listed),
        ...covers.checks,
    ];
    return {
        album: list.album,
        tracks: resolved.map(({ track }) => track),
        pendingRemovals: input.truncated ? [] : removals,
        coverJobs: covers.jobs,
        checks: sortChecks(checks),
        infoSettled: list.infoUsable && !input.truncated && gone.length === 0,
    };
};
