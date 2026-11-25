import { CREDIT_FIELDS, type TrackCredits } from '../schema/types';
import { trackIdFor } from './trackId';
import type { SeedCreditTrack, SeedCredits, SeedDiscography } from './types';

/** 原始資料用「—」表示冇 */
const NO_VALUE = '—';

export interface MatchedCredits {
    /** direct：專輯 + 歌號 + 歌名都啱；byTitle：借用其他專輯同名歌嘅 credit */
    source: 'direct' | 'byTitle';
    credits: TrackCredits;
    /** 參考欄：只留喺管理端，唔入 catalog */
    lyricsUrl: string | null;
    note: string | null;
}

export interface CreditMatchResult {
    /** key = `trackIdFor(albumId, no)`；冇 credit 嘅歌唔喺入面 */
    byTrackId: Record<string, MatchedCredits>;
    stats: { direct: number; byTitle: number; missing: number };
}

const clean = (value: string | null): string | null => {
    const text = value?.trim() ?? '';
    return text === '' || text === NO_VALUE ? null : text;
};

const creditsOf = (row: SeedCreditTrack): TrackCredits => ({
    composer: clean(row.composer),
    lyricist: clean(row.lyricist),
    arranger: clean(row.arranger),
    producer: clean(row.producer),
});

const hasCredits = (row: SeedCreditTrack): boolean =>
    !row.missing && CREDIT_FIELDS.some((field) => creditsOf(row)[field] !== null);

const directKey = (albumId: string, no: number, title: string) => `${albumId}\n${no}\n${title}`;

const toMatch = (row: SeedCreditTrack, source: MatchedCredits['source']): MatchedCredits => ({
    source,
    credits: creditsOf(row),
    lyricsUrl: clean(row.lyricsUrl),
    note: clean(row.note),
});

/** 有 credit 嘅行，分別按「專輯 + 歌號 + 歌名」同「歌名」（第一次出現嗰行）做索引 */
const indexCredits = (credits: SeedCredits) => {
    const direct = new Map<string, SeedCreditTrack>();
    const byTitle = new Map<string, SeedCreditTrack>();
    credits.albums.forEach((album) =>
        album.tracks.filter(hasCredits).forEach((row) => {
            direct.set(directKey(album.albumId, row.no, row.title), row);
            if (!byTitle.has(row.title)) byTitle.set(row.title, row);
        }),
    );
    return { direct, byTitle };
};

/**
 * 將 credit 資料配去歌單（Functional Spec US-109 ✅ C13）：
 * ① 專輯 id + 歌號 + 歌名完全一樣 → 直接用；② 否則其他專輯有同名歌有 credit → 用嗰行；③ 都冇 → 留空。
 */
export const matchCredits = (
    discography: SeedDiscography,
    credits: SeedCredits,
): CreditMatchResult => {
    const index = indexCredits(credits);
    const result: CreditMatchResult = {
        byTrackId: {},
        stats: { direct: 0, byTitle: 0, missing: 0 },
    };
    discography.albums.forEach((album) =>
        album.tracks.forEach((track) => {
            const direct = index.direct.get(directKey(album.id, track.no, track.title));
            const row = direct ?? index.byTitle.get(track.title);
            if (!row) {
                result.stats.missing += 1;
                return;
            }
            const source = direct ? 'direct' : 'byTitle';
            result.byTrackId[trackIdFor(album.id, track.no)] = toMatch(row, source);
            result.stats[source] += 1;
        }),
    );
    return result;
};
