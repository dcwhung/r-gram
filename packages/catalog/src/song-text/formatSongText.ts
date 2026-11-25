/*
 * 由已儲存嘅欄位砌返歌曲文字（回填文字框；Functional Spec D31「回填」）。
 * 固定次序：歌名、副題、曲、詞、編、監（全形冒號；冇值唔出）、空行、歌詞原文。
 * `parseSongText(formatSongText(x))` 等於 `x`，所以「讀入 → 儲存 → 再讀入」唔會變。
 */
import { LABEL_COLON, LABELS, type LabelField } from './labels';
import type { SongTextFields } from './types';

const valueOf = (song: SongTextFields, field: LabelField): string | null =>
    field === 'subtitle' ? song.subtitle : (song.credits?.[field] ?? null);

export const formatSongText = (song: SongTextFields): string => {
    const labelLines = LABELS.flatMap(({ label, field }) => {
        const value = valueOf(song, field);
        return value ? [`${label}${LABEL_COLON}${value}`] : [];
    });
    const head = [song.title, ...labelLines];
    const source = song.lyrics?.source ?? '';
    return (source === '' ? head : [...head, '', source]).join('\n');
};
