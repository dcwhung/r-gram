/*
 * 同步：曲目表同碟名、年份（Technical Spec「同步嘅設計」步驟 2；Functional Spec D68、D70）。
 * - `info.txt` 讀到而且用得：佢嘅曲目、碟名（冇 = 專輯 id）、年份；佢嘅檢查結果加 key
 * - `info.txt` 冇變（冇讀）：D1 嘅歌同碟名、年份（上次就係由佢嚟），上次嘅 `info.txt` 檢查結果照搬
 * - 冇 `info.txt`／用唔到：音檔歌號（後備）；歌名 = D1 已有嘅，否則音檔檔名；碟名 = id、冇年份；NO_INFO
 */
import { filesOf, numbersOf, type FileGroups } from '../scan/scanFiles';
import { titleFromFileName } from '../scan/titleFromFileName';
import { checkOf, type Check } from './checks';
import { carriedChecks } from './textChecks';
import type { SyncInput } from './types';

export interface TrackList {
    /** info = 曲目由 `info.txt`（或者上次嘅 `info.txt`）；file = 由音檔歌號 */
    mode: 'info' | 'file';
    entries: { no: number; title: string }[];
    album: { title: string; year: number | null };
    checks: Check[];
    /** `info.txt` 讀到或者冇變，而且用得 */
    infoUsable: boolean;
}

const withKey = (checks: readonly Check[], key: string): Check[] =>
    checks.map((check) => ({ ...check, key }));

const fromFiles = (input: SyncInput, groups: FileGroups, checks: Check[]): TrackList => {
    const stored = new Map(input.tracks.map((track) => [track.no, track.title]));
    const entries = numbersOf(groups, 'audio').map((no) => {
        const [audio] = filesOf(groups, 'audio', no);
        return { no, title: stored.get(no) ?? titleFromFileName(audio?.key ?? '') };
    });
    const album = { title: input.albumId, year: null };
    return { mode: 'file', entries, album, checks, infoUsable: false };
};

const fromStored = (input: SyncInput, key: string): TrackList => ({
    mode: 'info',
    entries: input.tracks.map(({ no, title }) => ({ no, title })),
    album: {
        title: input.album?.title ?? input.albumId,
        year: input.album?.year ?? null,
    },
    checks: carriedChecks(input.album?.checks ?? [], new Set([key])),
    infoUsable: true,
});

export const trackListOf = (input: SyncInput, groups: FileGroups): TrackList => {
    const { info } = input;
    if (info.kind === 'none')
        return fromFiles(input, groups, [checkOf('NO_INFO', {}, { title: input.albumId })]);
    if (info.kind === 'unchanged') return fromStored(input, info.key);
    const checks = withKey(info.info.checks, info.key);
    if (!info.info.usable) return fromFiles(input, groups, checks);
    const { title, year, tracks } = info.info;
    const entries = tracks.map(({ no, title: name }) => ({ no, title: name }));
    const album = { title: title ?? input.albumId, year };
    return { mode: 'info', entries, album, checks, infoUsable: true };
};
