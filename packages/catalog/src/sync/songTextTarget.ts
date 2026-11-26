/* T-106：歌曲文字檔寫返 bucket 嘅 key（未實作） */
import type { NumberedFile, ScanFile } from '../scan/scanFiles';

export const SONG_TEXT_NAME_MAX_CHARS = 100;

export interface SongTextTargetInput {
    folder: string;
    no: number;
    title: string;
    files: readonly ScanFile[];
    stored: { audioKey: string | null; textKey: string | null };
}

export interface SongTextTarget {
    audio: boolean;
    conflict: boolean;
    file: NumberedFile | null;
    key: string;
}

export const songTextFileName = (_no: number, _title: string): string => '';

export const songTextTarget = (_input: SongTextTargetInput): SongTextTarget => ({
    audio: false,
    conflict: false,
    file: null,
    key: '',
});
