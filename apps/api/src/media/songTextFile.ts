/*
 * 讀媒體 bucket 嘅歌曲文字檔（`NN 名.txt`；Technical Spec「掃描嘅設計 → 歌曲文字」）：
 * 大過 SONG_TEXT_MAX_BYTES 唔讀（TOO_LARGE，同 API-041 一樣嘅上限）→ UTF-8 解碼（唔係 UTF-8 = BAD_ENCODING；
 * BOM 由解碼器去走，CRLF 由 parseSongText() 正規化）→ parseSongText()。錯誤逐行列出（檔案層面 = 第 0 行）
 */
import { parseSongText, SONG_TEXT_MAX_BYTES, type SongText } from '@r-gram/catalog';
import { textError, type TextError } from './errors';

/** 檔案層面嘅錯誤嘅行號 */
const FILE_LINE = 0;

export interface TextFileRef {
    key: string;
    bytes: number;
}

/** `etag` = 讀到嗰個版本（檔已經唔喺度 = null） */
export type TextRead = { etag: string | null } & (
    { song: SongText; errors: [] } | { song: null; errors: TextError[] }
);

const failed = (etag: string | null, reason: TextError['reason']): TextRead => ({
    etag,
    song: null,
    errors: [textError(FILE_LINE, reason)],
});

/** ignoreBOM: false = 解碼時去走開頭嘅 BOM */
const decode = (buffer: ArrayBuffer): string | undefined => {
    try {
        return new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(buffer);
    } catch {
        return undefined;
    }
};

export const readSongTextFile = async (bucket: R2Bucket, file: TextFileRef): Promise<TextRead> => {
    if (file.bytes > SONG_TEXT_MAX_BYTES) return failed(null, 'TOO_LARGE');
    const object = await bucket.get(file.key);
    if (!object) return failed(null, 'FILE_NOT_FOUND');
    // list 之後換過檔：以讀到嘅版本為準
    if (object.size > SONG_TEXT_MAX_BYTES) {
        await object.body.cancel();
        return failed(object.httpEtag, 'TOO_LARGE');
    }
    const text = decode(await object.arrayBuffer());
    if (text === undefined) return failed(object.httpEtag, 'BAD_ENCODING');
    const { errors, ...song } = parseSongText(text);
    if (errors.length === 0) return { etag: object.httpEtag, song, errors: [] };
    const listed = errors.map(({ line, code }) => textError(line, code));
    return { etag: object.httpEtag, song: null, errors: listed };
};
