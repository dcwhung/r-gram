/*
 * 掃描計劃（純函數；Technical Spec「CR-004 → 掃描嘅設計」、「CR-005 → 掃描以音檔做錨」、「CR-006 → 掃描建立歌曲」）。
 * 次序：分類 → 音檔歌號集合（資料夾 `.m4a`／`.mp3` ∪ 手動指定咗音檔嘅歌）→
 * 集合入面未有歌嘅歌號 = newTracks（要啱啱好一個音檔）→ 已有嘅歌按歌號配對（scanTracks.ts）→
 * 用唔到嘅 `.txt`／MV 入 skipped：冇音檔 = NO_AUDIO；新歌號嘅音檔有衝突 = AUDIO_CONFLICT（建立唔到歌，佢哋冇地方去）。
 * 唔讀檔、唔寫嘢：`.txt` 嘅內容同手動指定檔案存唔存在由 Worker 補
 */
import { trackIdFor } from '../schema/ids';
import { planCovers } from './scanCovers';
import { groupFiles, numbersOf, singleOf, type FileGroups } from './scanFiles';
import { planTracks } from './scanTracks';
import type {
    NewTrackPlan,
    ScanConflict,
    ScanInput,
    ScanPlan,
    SkipReason,
    SkippedFile,
} from './scanTypes';
import { titleFromFileName } from './titleFromFileName';

export type * from './scanTypes';

interface Anchors {
    /** 呢個歌號有冇音檔（資料夾或者手動指定） */
    has: (no: number) => boolean;
    /** 資料庫有呢個歌號嘅歌 */
    existing: ReadonlySet<number>;
}

const anchorsOf = (input: ScanInput, groups: FileGroups): Anchors => {
    const audio = new Set(numbersOf(groups, 'audio'));
    input.tracks.filter((track) => track.audioManual).forEach(({ no }) => audio.add(no));
    return { has: (no) => audio.has(no), existing: new Set(input.tracks.map(({ no }) => no)) };
};

/** `.txt`／MV 用唔到嘅原因；用得 → undefined */
const skipReasonOf = (no: number, anchors: Anchors, groups: FileGroups): SkipReason | undefined => {
    if (!anchors.has(no)) return 'NO_AUDIO';
    if (anchors.existing.has(no)) return undefined;
    return singleOf(groups, 'audio', no) ? undefined : 'AUDIO_CONFLICT';
};

/** 有歌號嘅檔：衝突（多過一個）同已略過（用唔到） */
const numberedIssues = (groups: FileGroups, anchors: Anchors) => {
    const conflicts: ScanConflict[] = [];
    const skipped: SkippedFile[] = [];
    for (const files of groups.numbered.values()) {
        const [first] = files;
        if (!first) continue;
        const { kind, no } = first;
        const reason = kind === 'audio' ? undefined : skipReasonOf(no, anchors, groups);
        if (reason && kind !== 'audio')
            skipped.push(...files.map(({ key }) => ({ key, no, kind, reason })));
        else if (files.length > 1) conflicts.push({ no, kind, keys: files.map(({ key }) => key) });
    }
    return { conflicts, skipped };
};

const newTrackOf = (input: ScanInput, groups: FileGroups, no: number): NewTrackPlan[] => {
    const audio = singleOf(groups, 'audio', no);
    if (!audio) return [];
    const id = trackIdFor(input.albumId, no);
    const mv = singleOf(groups, 'mv', no);
    const text = singleOf(groups, 'text', no);
    return [
        {
            no,
            trackId: input.takenIds.has(id) ? null : id,
            audio: { key: audio.key, bytes: audio.bytes },
            mv: mv ? { key: mv.key, bytes: mv.bytes } : null,
            text: text ? { key: text.key, etag: text.etag, bytes: text.bytes } : null,
            fileTitle: titleFromFileName(audio.key),
        },
    ];
};

export const planScan = (input: ScanInput): ScanPlan => {
    const groups = groupFiles(input.files);
    const anchors = anchorsOf(input, groups);
    const covers = planCovers(groups, input.album);
    const issues = numberedIssues(groups, anchors);
    const newNumbers = numbersOf(groups, 'audio').filter((no) => !anchors.existing.has(no));
    return {
        cover: covers.cover,
        cover2: covers.cover2,
        newTracks: newNumbers.flatMap((no) => newTrackOf(input, groups, no)),
        ...planTracks(input.tracks, groups, anchors.has),
        skipped: [...issues.skipped, ...covers.skipped],
        conflicts: [...issues.conflicts, ...covers.conflicts],
        unmatchedFiles: groups.unmatched,
    };
};
