/*
 * 由已儲存嘅欄位砌返歌曲文字（回填文字框；Functional Spec D31「回填」）。
 * 固定次序：歌名、曲、詞、編、監（全形冒號；冇值唔出）、空行、歌詞原文（CR-007：冇副題）。
 * `parseSongText(formatSongText(x))` 等於 `x`，所以「讀入 → 儲存 → 再讀入」唔會變。
 */
import { CREDIT_LABELS, LABEL_COLON } from './labels';
import type { SongTextFields } from './types';

export const formatSongText = (song: SongTextFields): string => {
    const labelLines = CREDIT_LABELS.flatMap(({ label, field }) => {
        const value = song.credits?.[field] ?? null;
        return value ? [`${label}${LABEL_COLON}${value}`] : [];
    });
    const head = [song.title, ...labelLines];
    const source = song.lyrics?.source ?? '';
    return (source === '' ? head : [...head, '', source]).join('\n');
};
