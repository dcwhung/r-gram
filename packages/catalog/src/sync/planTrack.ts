/*
 * 同步：曲目表入面一首歌嘅計劃（Technical Spec「同步嘅設計」步驟 3–5、7）。檔嘅揀法見 trackFiles.ts；
 * `.txt` 要讀：未匯入過、ETag 或者 key 唔同上次，或者歌名改咗（要再比第一行）；
 * info 模式：`info.txt` 嘅歌名同音檔檔名唔吻合 = TITLE_MISMATCH（只係提示，唔擋）
 */
import type { NumberedFile } from '../scan/scanFiles';
import { titleFromFileName } from '../scan/titleFromFileName';
import { checkOf, type Check } from './checks';
import { titleKey } from './titleKey';
import {
    conflictChecks,
    linkOf,
    noAudioChecks,
    removalOf,
    slotOf,
    type TrackContext,
} from './trackFiles';
import type { TrackList } from './trackList';
import type { PendingRemoval, PlannedTrack, SyncTrackState } from './types';

export interface ResolvedTrack {
    track: PlannedTrack;
    removals: PendingRemoval[];
    checks: Check[];
}

interface Linked {
    mvKey: string | null;
    textKey: string | null;
    text: NumberedFile | null;
    removals: PendingRemoval[];
    checks: Check[];
}

/** 有音檔：MV、`.txt` 跟音檔 */
const anchored = (context: TrackContext): Linked => {
    const mv = slotOf(context, 'mv');
    const text = slotOf(context, 'text');
    return {
        mvKey: linkOf(context, 'mv', mv),
        textKey: linkOf(context, 'text', text),
        text: text.file,
        removals: [...removalOf(context, 'mv', mv), ...removalOf(context, 'text', text)],
        checks: [...conflictChecks(context, 'mv'), ...conflictChecks(context, 'text')],
    };
};

/** 冇音檔：D1 嘅 MV、`.txt` 連結唔郁（音檔嘅移除確認先一齊清）；檔唔匯入 */
const unanchored = (context: TrackContext): Linked => ({
    mvKey: context.stored?.mvKey ?? null,
    textKey: context.stored?.textKey ?? null,
    text: null,
    removals: [],
    checks: noAudioChecks(context),
});

const needsRead = (text: NumberedFile, stored: SyncTrackState | undefined, title: string) =>
    !stored ||
    text.etag !== stored.textSourceEtag ||
    text.key !== stored.textKey ||
    title !== stored.title;

const isChanged = (track: Omit<PlannedTrack, 'changed'>, stored: SyncTrackState | undefined) =>
    !stored ||
    track.title !== stored.title ||
    track.audioKey !== stored.audioKey ||
    track.mvKey !== stored.mvKey ||
    track.textKey !== stored.textKey;

const audioMismatch = (no: number, title: string, audio: NumberedFile | null): Check[] => {
    const other = audio ? titleFromFileName(audio.key) : null;
    if (!audio || other === null || titleKey(other) === titleKey(title)) return [];
    return [checkOf('TITLE_MISMATCH', { key: audio.key, no }, { no, title, other })];
};

const titleChecks = (list: TrackList, no: number, title: string, audio: NumberedFile | null) =>
    list.mode === 'info' ? audioMismatch(no, title, audio) : [];

const compareTitleOf = (list: TrackList, title: string, audio: NumberedFile | null) => {
    if (list.mode === 'info') return title;
    return audio ? titleFromFileName(audio.key) : null;
};

export const planTrack = (list: TrackList, title: string, context: TrackContext): ResolvedTrack => {
    const { no, stored } = context;
    const audio = slotOf(context, 'audio');
    const linked = audio.none ? unanchored(context) : anchored(context);
    const base = {
        no,
        trackId: stored?.id ?? null,
        title,
        titleSource: list.mode,
        audioKey: linkOf(context, 'audio', audio),
        mvKey: linked.mvKey,
        textKey: linked.textKey,
        read: linked.text && needsRead(linked.text, stored, title) ? textSource(linked.text) : null,
        compareTitle: compareTitleOf(list, title, audio.file),
    };
    return {
        track: { ...base, changed: isChanged(base, stored) },
        removals: [...removalOf(context, 'audio', audio), ...linked.removals],
        checks: [
            ...conflictChecks(context, 'audio'),
            ...linked.checks,
            ...titleChecks(list, no, title, audio.file),
        ],
    };
};

const textSource = ({ key, etag, bytes }: NumberedFile) => ({ key, etag, bytes });
