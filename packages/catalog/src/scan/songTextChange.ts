/*
 * 掃描讀到嘅歌曲文字同已儲存內容比較（Technical Spec「CR-004 → 掃描嘅設計 → change 嘅值」）：
 * - same：解析結果同已儲存嘅完全一樣（比較 formatSongText() 嘅結果，即係管理端文字框會見到嘅內容）
 * - new：未套用過，而且套用只會加嘢（而家冇曲詞編監、冇歌詞，歌名一樣）
 * - replace：其餘；titleChanged、removesLyrics 逐項標明（清走歌詞要確認，Functional Spec D30）
 * ETag 同上次套用一樣（唔使讀檔）嘅 same 由 Worker 判斷，唔經呢度
 */
import { formatSongText } from '../song-text/formatSongText';
import type { SongText, SongTextFields } from '../song-text/types';

export type TextChange = 'new' | 'replace' | 'same';

export interface SongTextComparison {
    change: TextChange;
    titleChanged: boolean;
    removesLyrics: boolean;
}

const isBare = (stored: SongTextFields): boolean =>
    stored.credits === null && stored.lyrics === null;

/** `appliedBefore` = 嗰首歌有 text_source_etag（之前由掃描套用過） */
export const songTextChange = (
    parsed: SongText,
    stored: SongTextFields,
    appliedBefore: boolean,
): SongTextComparison => {
    const titleChanged = parsed.title !== stored.title;
    const removesLyrics = stored.lyrics !== null && parsed.lyrics === null;
    const flags = { titleChanged, removesLyrics };
    if (formatSongText(parsed) === formatSongText(stored)) return { change: 'same', ...flags };
    const onlyAdds = !appliedBefore && !titleChanged && isBare(stored);
    return { change: onlyAdds ? 'new' : 'replace', ...flags };
};
