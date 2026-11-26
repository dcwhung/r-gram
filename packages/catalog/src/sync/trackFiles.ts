/*
 * 同步：曲目表入面一首歌嘅檔（Technical Spec「同步嘅設計」步驟 3–5；Functional Spec D54、D70、D76）。
 * - 每類（音檔、MV、`.txt`）：啱啱好一個檔 = 用佢；多過一個 = 衝突，用返 D1 連住而仲喺度嗰個，否則冇；
 *   一個都冇而 D1 有連結 = 待確認移除，連結照留（確認先清）
 * - 音檔做錨：嗰個歌號冇音檔 = 灰色，同歌號嘅 MV、`.txt` 唔用（NO_AUDIO 提示），D1 嘅連結唔郁
 *  （音檔嘅移除確認之後一齊清，所以唔另外列 MV、`.txt`）
 */
import type { NumberedKind } from '../scan/classifyFile';
import { filesOf, type FileGroups, type NumberedFile } from '../scan/scanFiles';
import { checkOf, type Check, type CheckCode } from './checks';
import type { PendingRemoval, SyncTrackState } from './types';

/** 一類檔嘅結果：用邊個檔、一個都冇 */
export interface Slot {
    file: NumberedFile | null;
    none: boolean;
}

export interface TrackContext {
    albumId: string;
    no: number;
    groups: FileGroups;
    stored: SyncTrackState | undefined;
}

const CONFLICT: Readonly<Record<NumberedKind, CheckCode>> = {
    audio: 'AUDIO_CONFLICT',
    mv: 'MV_CONFLICT',
    text: 'TEXT_CONFLICT',
};

export const storedKeyOf = (
    stored: SyncTrackState | undefined,
    kind: NumberedKind,
): string | null => {
    if (!stored) return null;
    if (kind === 'audio') return stored.audioKey;
    return kind === 'mv' ? stored.mvKey : stored.textKey;
};

/** 一類檔：一個 = 佢；幾個 = D1 連住嗰個（仲喺度先算），否則冇 */
export const slotOf = (context: TrackContext, kind: NumberedKind): Slot => {
    const files = filesOf(context.groups, kind, context.no);
    if (files.length === 1) return { file: files[0] ?? null, none: false };
    const storedKey = storedKeyOf(context.stored, kind);
    const kept = files.find(({ key }) => key === storedKey) ?? null;
    return { file: kept, none: files.length === 0 };
};

/** 同步之後嘅連結：冇檔 = 留住 D1 嘅（待確認移除）；衝突而冇連住嗰個 = 冇 */
export const linkOf = (context: TrackContext, kind: NumberedKind, slot: Slot): string | null =>
    slot.file?.key ?? (slot.none ? storedKeyOf(context.stored, kind) : null);

export const conflictChecks = (context: TrackContext, kind: NumberedKind): Check[] => {
    const { no } = context;
    const files = filesOf(context.groups, kind, no);
    if (files.length < 2) return [];
    return files.map(({ key }) => checkOf(CONFLICT[kind], { key, no }, { no }));
};

/** 冇音檔：同歌號嘅 MV、`.txt` 唔匯入 */
export const noAudioChecks = (context: TrackContext): Check[] => {
    const { no, groups } = context;
    const files = [...filesOf(groups, 'mv', no), ...filesOf(groups, 'text', no)];
    return files.map(({ key }) => checkOf('NO_AUDIO', { key, no }, { no }));
};

/** D1 有連結而呢類一個檔都冇 = 待確認移除 */
export const removalOf = (
    context: TrackContext,
    kind: NumberedKind,
    slot: Slot,
): PendingRemoval[] => {
    const { stored, albumId } = context;
    const key = storedKeyOf(stored, kind);
    if (!stored || !slot.none || key === null) return [];
    return [{ kind, albumId, trackId: stored.id, key, no: stored.no, title: stored.title }];
};
