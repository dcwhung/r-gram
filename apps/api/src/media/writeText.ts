/*
 * 寫媒體 bucket（rb-discography）嘅唯一入口（T-106；Technical Spec「寫返媒體 bucket」、「安全設計 → 寫媒體 bucket」；
 * Functional Spec D75）。只有 API-019（`info.txt`）同 API-041（歌曲文字）經呢度寫；code 入面冇其他 MEDIA.put，冇 MEDIA.delete。
 * - key 只可以係兩種：專輯資料夾（過 parseAlbumFolder()：冇 `/`、`..`、`_` 開頭）第一層嘅 `info.txt`（唔分大細楷），
 *   或者同一首歌歌號嘅 `NN ….txt`；唔係就 throw（route 已經由 server 砌 key，呢度係最後一道）
 * - 條件寫入：改舊檔 = `etagMatches`（讀入時嘅 ETag）；新檔 = `If-None-Match: *`。前提唔成立 → null（route 回 409 STALE）
 * - 內容：UTF-8（R2 put 字串 = UTF-8）、冇 BOM、換行統一 LF，其他唔郁
 */
import { classifyFile, parseAlbumFolder } from '@r-gram/catalog';
import { isDirectChild } from './listing';

export type MediaTextTarget =
    | { kind: 'info'; folder: string; key: string }
    | { kind: 'text'; folder: string; key: string; no: number };

/** R2 嘅 httpEtag：引號入面係 hex（multipart 加 `-N`）；唔收 `*`、weak（`W/`）同其他字 */
export const MEDIA_ETAG = /^"[0-9A-Za-z-]{1,128}"$/;
const QUOTES = /^"|"$/g;
const TEXT_CONTENT_TYPE = 'text/plain; charset=utf-8';
const BOM = '﻿';
const LINE_BREAKS = /\r\n?/g;

const matchesKind = (target: MediaTextTarget): boolean => {
    const found = classifyFile(target.key);
    if (target.kind === 'info') return found.kind === 'info';
    return found.kind === 'text' && found.no === target.no;
};

export const isWritableTextKey = (target: MediaTextTarget): boolean =>
    parseAlbumFolder(target.folder) !== undefined &&
    isDirectChild(target.key, target.folder) &&
    matchesKind(target);

export const normalizeText = (text: string): string =>
    (text.startsWith(BOM) ? text.slice(BOM.length) : text).replace(LINE_BREAKS, '\n');

const onlyIfOf = (etag: string | null): R2PutOptions['onlyIf'] =>
    etag === null
        ? new Headers({ 'If-None-Match': '*' })
        : { etagMatches: etag.replace(QUOTES, '') };

/** 寫入後嘅 httpEtag；個檔喺讀入之後改過（或者新檔已經有人寫咗）→ null */
export const putMediaText = async (
    bucket: R2Bucket,
    target: MediaTextTarget,
    text: string,
    etag: string | null,
): Promise<string | null> => {
    if (!isWritableTextKey(target)) throw new Error('media key refused');
    if (etag !== null && !MEDIA_ETAG.test(etag)) throw new Error('media etag refused');
    const written = await bucket.put(target.key, normalizeText(text), {
        onlyIf: onlyIfOf(etag),
        httpMetadata: { contentType: TEXT_CONTENT_TYPE },
    });
    return written?.httpEtag ?? null;
};
