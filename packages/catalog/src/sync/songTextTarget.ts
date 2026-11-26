/*
 * 歌曲文字框寫返媒體 bucket 嘅 key（T-106；Technical Spec「寫返媒體 bucket」；Functional Spec D75）。純函數：
 * - 已有：同步嘅揀法（trackFiles.ts slotOf）：嗰個歌號啱啱好一個 `.txt` = 佢；幾個 = D1 連住而仲喺度嗰個；
 *   幾個而冇 D1 嗰個 = 衝突（唔寫，唔知寫邊個）。D1 嘅 text_key 只會喺佢真係呢個資料夾、呢個歌號嘅檔先用
 * - 冇：新檔 `<folder>/<兩位歌號> <歌名>.txt`（歌名去走檔名唔可以有嘅字同控制字元，最長 SONG_TEXT_NAME_MAX_CHARS 個字）
 * - `audio`：同步會唔會匯入呢個檔（音檔做錨，D54；衝突而冇 D1 嗰個 = 冇音檔，S-165）
 */
import { filesOf, groupFiles, type NumberedFile, type ScanFile } from '../scan/scanFiles';
import { slotOf, type TrackContext } from './trackFiles';

/** 新檔名入面歌名最多幾多個字（Technical Spec「寫返媒體 bucket → 邊啲 key」） */
export const SONG_TEXT_NAME_MAX_CHARS = 100;

/** 檔名唔可以有嘅字（同 titleKey 一樣，加 `#`：網址會當 fragment）同控制字元 */
const NOT_IN_NEW_NAMES = /[/\\:*?"<>|#\p{Cc}]/gu;
const NUMBER_DIGITS = 2;
const TEXT_EXTENSION = '.txt';

export interface SongTextTargetInput {
    folder: string;
    no: number;
    /** D1 嘅歌名（info 模式 = `info.txt` 嘅歌名） */
    title: string;
    /** 資料夾第一層嘅檔（list 結果） */
    files: readonly ScanFile[];
    stored: { audioKey: string | null; textKey: string | null };
}

export interface SongTextTarget {
    audio: boolean;
    /** 幾個 `.txt` 而冇 D1 連住嗰個：唔寫 */
    conflict: boolean;
    /** 已有嘅檔；null = 新檔 */
    file: NumberedFile | null;
    key: string;
}

export const songTextFileName = (no: number, title: string): string => {
    const name = [...title.replace(NOT_IN_NEW_NAMES, '').trim()]
        .slice(0, SONG_TEXT_NAME_MAX_CHARS)
        .join('')
        .trim();
    const number = String(no).padStart(NUMBER_DIGITS, '0');
    return name === '' ? `${number}${TEXT_EXTENSION}` : `${number} ${name}${TEXT_EXTENSION}`;
};

const contextOf = (input: SongTextTargetInput): TrackContext => ({
    albumId: '',
    no: input.no,
    groups: groupFiles(input.files),
    stored: {
        id: '',
        no: input.no,
        title: input.title,
        mvKey: null,
        textSourceEtag: null,
        ...input.stored,
    },
});

export const songTextTarget = (input: SongTextTargetInput): SongTextTarget => {
    const context = contextOf(input);
    const text = slotOf(context, 'text');
    const audio = !slotOf(context, 'audio').none;
    const conflict = text.none && filesOf(context.groups, 'text', input.no).length > 1;
    const key = text.file?.key ?? `${input.folder}/${songTextFileName(input.no, input.title)}`;
    return { audio, conflict, file: text.file, key };
};
