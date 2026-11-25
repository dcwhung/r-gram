/*
 * 掃描配對（純函數）：R2 專輯資料夾入面嘅檔案 → 歌。Technical Spec 實現注意事項 9。
 * 檔名（唔計資料夾）開頭 1–3 位數字 = 歌號；副檔名決定類別；同一首歌同一類有多過一個檔就唔自動揀。
 */
export type MediaKind = 'audio' | 'mv';

export type UnmatchedReason = 'UNKNOWN_EXTENSION' | 'NO_TRACK_NUMBER' | 'NO_SUCH_TRACK';

export interface ScanTrack {
    id: string;
    no: number;
    title: string;
}

export interface MatchedFile {
    trackId: string;
    no: number;
    kind: MediaKind;
    key: string;
}

export interface ScanResult {
    matched: MatchedFile[];
    unmatchedFiles: { key: string; reason: UnmatchedReason }[];
    conflicts: { no: number; kind: MediaKind; keys: string[] }[];
    tracksWithoutAudio: { trackId: string; no: number; title: string }[];
}

const KIND_BY_EXTENSION: Readonly<Record<string, MediaKind>> = {
    m4a: 'audio',
    mp3: 'audio',
    mp4: 'mv',
    m4v: 'mv',
};

/** 開頭 1–3 位數字，後面唔可以再係數字（`2008 remaster` 唔係第 200 首） */
const LEADING_TRACK_NUMBER = /^(\d{1,3})(?!\d)/;

const fileName = (key: string) => key.slice(key.lastIndexOf('/') + 1);

const extensionOf = (name: string) => {
    const dot = name.lastIndexOf('.');
    return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
};

type Classified =
    { key: string; kind: MediaKind; no: number } | { key: string; reason: UnmatchedReason };

const classify = (key: string, trackNumbers: ReadonlySet<number>): Classified => {
    const name = fileName(key);
    const kind = KIND_BY_EXTENSION[extensionOf(name)];
    if (!kind) return { key, reason: 'UNKNOWN_EXTENSION' };
    const digits = LEADING_TRACK_NUMBER.exec(name)?.[1];
    if (!digits) return { key, reason: 'NO_TRACK_NUMBER' };
    const no = Number(digits);
    return trackNumbers.has(no) ? { key, kind, no } : { key, reason: 'NO_SUCH_TRACK' };
};

/** 同一首歌、同一類嘅檔案放埋一齊；保持輸入次序 */
const groupCandidates = (candidates: { key: string; kind: MediaKind; no: number }[]) => {
    const groups = new Map<string, { no: number; kind: MediaKind; keys: string[] }>();
    candidates.forEach(({ key, kind, no }) => {
        const id = `${no}:${kind}`;
        const group = groups.get(id) ?? { no, kind, keys: [] };
        group.keys.push(key);
        groups.set(id, group);
    });
    return [...groups.values()];
};

/**
 * @param keys 專輯資料夾入面所有 R2 key（資料夾標記，即係以 `/` 結尾嘅 key，會跳過）
 * @param tracks 呢張專輯嘅歌
 */
export const matchMediaFiles = (
    keys: readonly string[],
    tracks: readonly ScanTrack[],
): ScanResult => {
    const byNumber = new Map(tracks.map((track) => [track.no, track]));
    const classified = keys
        .filter((key) => !key.endsWith('/'))
        .map((key) => classify(key, new Set(byNumber.keys())));
    const groups = groupCandidates(classified.filter((file) => 'kind' in file));
    const matched = groups
        .filter((group) => group.keys.length === 1)
        .map(({ no, kind, keys: [key = ''] }) => ({
            trackId: byNumber.get(no)?.id ?? '',
            no,
            kind,
            key,
        }));
    const withAudio = new Set(
        matched.filter((file) => file.kind === 'audio').map((file) => file.no),
    );
    return {
        matched,
        unmatchedFiles: classified.filter((file) => 'reason' in file),
        conflicts: groups.filter((group) => group.keys.length > 1),
        tracksWithoutAudio: tracks
            .filter((track) => !withAudio.has(track.no))
            .map(({ id, no, title }) => ({ trackId: id, no, title })),
    };
};
