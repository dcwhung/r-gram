/*
 * If-None-Match（RFC 9110 §13.1.2，weak comparison）：`*`，或者列表入面有一個 ETag 同 `etag` 一樣（唔理 `W/`）。
 * 播放端唔會自己帶（避免 CORS preflight），但瀏覽器 cache 過期之後重新驗證會帶（backlog B-035）
 */
const opaqueTag = (tag: string): string => tag.trim().replace(/^W\//, '');

export const matchesIfNoneMatch = (header: string | undefined, etag: string): boolean => {
    if (header === undefined) return false;
    if (header.trim() === '*') return true;
    return header.split(',').map(opaqueTag).includes(opaqueTag(etag));
};
