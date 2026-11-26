/*
 * 文字框讀媒體 bucket 嘅文字檔（T-106；API-018 `info.txt`、API-040 歌曲文字）：成個檔畀管理端改。
 * 大過上限 = 唔讀（text null，problem TOO_LARGE：存唔到，要喺電腦改細）；唔係 UTF-8 = 照解碼（認唔到嘅 byte 變 U+FFFD，
 * problem BAD_ENCODING：管理員改好再存 = 寫返 UTF-8）。開頭嘅 BOM 唔畀文字框
 */
import { decodeUtf8 } from './songTextFile';

export type TextProblem = 'TOO_LARGE' | 'BAD_ENCODING';

export interface MediaText {
    /** 讀到嗰個版本嘅 httpEtag（儲存時嘅前提） */
    etag: string;
    text: string | null;
    problem: TextProblem | null;
}

const lenientUtf8 = (buffer: ArrayBuffer): string =>
    new TextDecoder('utf-8', { fatal: false, ignoreBOM: false }).decode(buffer);

/** 個檔唔喺度 → null */
export const readMediaText = async (
    bucket: R2Bucket,
    key: string,
    maxBytes: number,
): Promise<MediaText | null> => {
    const object = await bucket.get(key);
    if (!object) return null;
    const etag = object.httpEtag;
    if (object.size > maxBytes) {
        await object.body.cancel();
        return { etag, text: null, problem: 'TOO_LARGE' };
    }
    const buffer = await object.arrayBuffer();
    const text = decodeUtf8(buffer);
    if (text !== undefined) return { etag, text, problem: null };
    return { etag, text: lenientUtf8(buffer), problem: 'BAD_ENCODING' };
};
