/*
 * API-030 預覽嘅歌曲文字部分（Technical Spec「掃描嘅設計」、CR-006「掃描建立歌曲」）：
 * - 要讀嘅 `.txt`：新歌（newTracks）同 ETag 同上次套用唔同嘅現有歌（songTexts）；ETag 一樣 = same，唔讀
 * - 每次預覽最多讀 SCAN_TEXT_READS_MAX 個（由細歌號起、由 `from` 開始）；讀唔到嘅標 pending，
 *   回應 `more` / `nextFrom` 話畀管理端知由邊個歌號再叫（分批，R-016）
 */
import {
    songTextChange,
    type NewTrackPlan,
    type ScanPlan,
    type SongText,
    type TextCandidate,
} from '@r-gram/catalog';
import { SCAN_TEXT_READS_MAX } from '../config';
import { readSongTextFile, type TextFileRef, type TextRead } from './songTextFile';
import type { ScanTrack } from './state';

interface ReadRequest extends TextFileRef {
    no: number;
}

export interface ReadBatch {
    reads: Map<string, TextRead>;
    more: boolean;
    nextFrom: number | null;
}

const requestsOf = (plan: ScanPlan): ReadRequest[] => [
    ...plan.newTracks.flatMap(({ no, text }) => (text ? [{ no, ...text }] : [])),
    ...plan.songTexts.filter(({ unchanged }) => !unchanged),
];

/** 由 `from` 起、按歌號讀，最多 SCAN_TEXT_READS_MAX 個 */
export const readTexts = async (
    bucket: R2Bucket,
    plan: ScanPlan,
    from: number,
): Promise<ReadBatch> => {
    const eligible = requestsOf(plan)
        .filter(({ no }) => no >= from)
        .sort((a, b) => a.no - b.no);
    const batch = eligible.slice(0, SCAN_TEXT_READS_MAX);
    const results = await Promise.all(batch.map((file) => readSongTextFile(bucket, file)));
    const next = eligible[SCAN_TEXT_READS_MAX];
    return {
        reads: new Map(batch.map(({ key }, index) => [key, results[index] as TextRead])),
        more: next !== undefined,
        nextFrom: next?.no ?? null,
    };
};

const lyricsSummary = (song: SongText) => ({
    lineCount: song.lyrics?.lines.length ?? 0,
    synced: song.lyrics?.synced ?? null,
});

/** 新歌：歌名由 `.txt`（有效）或者檔名；未讀 = pending */
export const newTrackView = (track: NewTrackPlan, reads: ReadBatch['reads']) => {
    const { fileTitle, text, ...rest } = track;
    const fromFile = { ...rest, title: fileTitle };
    if (!text) return { ...fromFile, titleSource: 'fileName', text: null };
    const read = reads.get(text.key);
    if (!read) return { ...fromFile, titleSource: 'pending', text: { ...text, pending: true } };
    if (!read.song)
        return { ...fromFile, titleSource: 'fileName', text: { ...text, errors: read.errors } };
    const summary = lyricsSummary(read.song);
    return {
        ...rest,
        title: read.song.title,
        titleSource: 'text',
        text: { ...text, ...summary, errors: [] },
    };
};

/** 現有歌嘅 `.txt`：same（ETag 冇變）／pending（未讀）／有錯（唔可以套用）／同已儲存內容比較 */
export const songTextView = (
    candidate: TextCandidate,
    track: ScanTrack | undefined,
    reads: ReadBatch['reads'],
) => {
    const { unchanged, ...file } = candidate;
    if (unchanged || !track) return { ...file, change: 'same' };
    const read = reads.get(file.key);
    if (!read) return { ...file, change: 'pending' };
    if (!read.song) return { ...file, change: 'replace', errors: read.errors };
    const comparison = songTextChange(read.song, track.stored, track.textSourceEtag !== null);
    const { title } = read.song;
    return { ...file, ...comparison, title, ...lyricsSummary(read.song), errors: [] };
};
