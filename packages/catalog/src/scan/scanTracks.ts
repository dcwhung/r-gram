/*
 * 掃描：資料庫已有嘅歌（Technical Spec「CR-006 → 掃描建立歌曲 → 分類次序」步驟 3、4）。按歌號配對：
 * - 音檔／MV（非手動指定）→ matched（change：new／replace／same）；手動指定嘅唔郁 → manualKept
 * - 有音檔嘅歌號嘅 .txt → songTexts（ETag 同上次套用一樣 = unchanged）
 * - 記住嘅音檔（非手動）喺資料夾冇咗、同歌號亦冇第二個音檔 → audioMissing（永遠唔刪歌，D62）
 */
import { etagChange } from './scanCovers';
import { groupKey, singleOf, type FileGroups, type NumberedFile } from './scanFiles';
import type { MediaKind, ScanPlan, ScanTrackState } from './scanTypes';

export type TrackPlan = Pick<
    ScanPlan,
    'songTexts' | 'matched' | 'audioMissing' | 'manualKept' | 'tracksWithoutAudio'
>;

const matchOf = (track: ScanTrackState, kind: MediaKind, file: NumberedFile | undefined) => {
    const stored = kind === 'audio' ? track.audioKey : track.mvKey;
    if (!file) return [];
    const { key, bytes } = file;
    return [{ trackId: track.id, no: track.no, kind, key, bytes, change: etagChange(key, stored) }];
};

const manualOf = (track: ScanTrackState) => {
    const kept: TrackPlan['manualKept'] = [];
    if (track.audioManual && track.audioKey)
        kept.push({ trackId: track.id, kind: 'audio', key: track.audioKey });
    if (track.mvManual && track.mvKey)
        kept.push({ trackId: track.id, kind: 'mv', key: track.mvKey });
    return kept;
};

const missingOf = (track: ScanTrackState, groups: FileGroups, hasAudioFiles: boolean) => {
    const { id, no, title, audioKey, mvKey, audioManual, mvManual } = track;
    if (audioManual || audioKey === null || hasAudioFiles || groups.keys.has(audioKey)) return [];
    const mvGone = !mvManual && mvKey !== null && !groups.keys.has(mvKey);
    return [{ trackId: id, no, title, key: audioKey, mvKey: mvGone ? mvKey : null }];
};

const textOf = (track: ScanTrackState, groups: FileGroups) => {
    const file = singleOf(groups, 'text', track.no);
    if (!file) return [];
    const { key, etag, bytes } = file;
    const unchanged = etag === track.textSourceEtag;
    return [{ trackId: track.id, no: track.no, key, etag, bytes, unchanged }];
};

/** `anchored`：呢首歌嘅歌號有音檔（資料夾或者手動指定） */
const planTrack = (track: ScanTrackState, groups: FileGroups, anchored: boolean): TrackPlan => {
    const hasAudioFiles = groups.numbered.has(groupKey('audio', track.no));
    const audio = track.audioManual ? undefined : singleOf(groups, 'audio', track.no);
    const mv = track.mvManual || !anchored ? undefined : singleOf(groups, 'mv', track.no);
    const bare = !anchored && track.audioKey === null;
    return {
        songTexts: anchored ? textOf(track, groups) : [],
        matched: [...matchOf(track, 'audio', audio), ...matchOf(track, 'mv', mv)],
        audioMissing: missingOf(track, groups, hasAudioFiles),
        manualKept: manualOf(track),
        tracksWithoutAudio: bare ? [{ trackId: track.id, no: track.no, title: track.title }] : [],
    };
};

export const planTracks = (
    tracks: readonly ScanTrackState[],
    groups: FileGroups,
    isAnchored: (no: number) => boolean,
): TrackPlan => {
    const plans = [...tracks]
        .sort((a, b) => a.no - b.no)
        .map((track) => planTrack(track, groups, isAnchored(track.no)));
    return {
        songTexts: plans.flatMap((plan) => plan.songTexts),
        matched: plans.flatMap((plan) => plan.matched),
        audioMissing: plans.flatMap((plan) => plan.audioMissing),
        manualKept: plans.flatMap((plan) => plan.manualKept),
        tracksWithoutAudio: plans.flatMap((plan) => plan.tracksWithoutAudio),
    };
};
