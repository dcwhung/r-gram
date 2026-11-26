/*
 * 同步：曲目表同碟名、年份（Technical Spec「同步嘅設計」步驟 2；Functional Spec D68、D70）。
 * - `info.txt` 讀到而且用得：佢嘅曲目、碟名（冇 = 專輯 id）、年份；佢嘅檢查結果加 key
 * - `info.txt` 冇變（冇讀）：D1 嘅歌同碟名、年份（上次就係由佢嚟），上次嘅 `info.txt` 檢查結果照搬
 * - `info.txt` 有但用唔到（唔係 UTF-8、太大、讀唔到）而之前用過（albums.info_used，W-046）：D1 嘅歌同碟名、年份照用，
 *   唔列移除，只出佢嘅檢查結果（S-164，main session 決定，等用戶確認）；之前從來冇用過 = 同冇 `info.txt` 一樣
 * - 冇 `info.txt`：音檔歌號（後備）；歌名 = D1 已有嘅，否則音檔檔名；碟名 = id、冇年份；NO_INFO
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

/** D1 嘅歌同碟名、年份（上次就係由 `info.txt` 嚟） */
const fromStored = (input: SyncInput, checks: Check[], infoUsable: boolean): TrackList => ({
    mode: 'info',
    entries: input.tracks.map(({ no, title }) => ({ no, title })),
    album: {
        title: input.album?.title ?? input.albumId,
        year: input.album?.year ?? null,
    },
    checks,
    infoUsable,
});

/** 用過 `info.txt`（albums.info_used）：而家嘅檔用唔到都唔改碟、唔列移除（S-164、W-046） */
const hadUsableInfo = (input: SyncInput): boolean => input.album?.infoUsed ?? false;

export const trackListOf = (input: SyncInput, groups: FileGroups): TrackList => {
    const { info } = input;
    if (info.kind === 'none')
        return fromFiles(input, groups, [checkOf('NO_INFO', {}, { title: input.albumId })]);
    if (info.kind === 'unchanged') {
        const carried = carriedChecks(input.album?.checks ?? [], new Set([info.key]));
        return fromStored(input, carried, true);
    }
    const checks = withKey(info.info.checks, info.key);
    if (!info.info.usable)
        return hadUsableInfo(input)
            ? fromStored(input, checks, false)
            : fromFiles(input, groups, checks);
    const { title, year, tracks } = info.info;
    const entries = tracks.map(({ no, title: name }) => ({ no, title: name }));
    const album = { title: title ?? input.albumId, year };
    return { mode: 'info', entries, album, checks, infoUsable: true };
};
