/*
 * validator 嘅錯誤（path + code）→ 管理端搵得到嘅位置（review S-092）：專輯 id、歌 id、欄名、錯誤碼。
 * `albums[3]` 呢類 index 對管理員冇用（次序會變），所以換做 id。
 * 只放 id 同欄名，唔放內容（同 log 政策一樣）；id 嚟自 D1，儲存時已經驗過格式
 */
import type { CatalogDocument, CatalogError, CatalogErrorCode } from '@r-gram/catalog';

export interface CatalogIssue {
    albumId?: string;
    trackId?: string;
    /** 專輯 / 歌入面嘅欄名（例如 accent、credits.composer）；文件頂層嘅欄（例如 mediaBase）就係佢自己 */
    field: string;
    code: CatalogErrorCode;
}

/** `albums[1].tracks[0].credits.composer` → 1、0、`credits.composer` */
const ALBUM_PATH = /^albums\[(\d+)\](?:\.tracks\[(\d+)\])?(?:\.(.+))?$/;
/** 成張碟 / 成首歌（唔係某一個欄） */
const WHOLE_ITEM = '$';

const locate = (document: CatalogDocument, { path, code }: CatalogError): CatalogIssue => {
    const match = ALBUM_PATH.exec(path);
    if (!match) return { field: path, code };
    const album = document.albums[Number(match[1])];
    const track = match[2] === undefined ? undefined : album?.tracks[Number(match[2])];
    return {
        ...(album && { albumId: album.id }),
        ...(track && { trackId: track.id }),
        field: match[3] ?? WHOLE_ITEM,
        code,
    };
};

/** `document`：validator 唔收嗰份（由 D1 砌出嚟，結構一定係 CatalogDocument，只係有啲值唔啱） */
export const locateIssues = (
    document: CatalogDocument,
    errors: readonly CatalogError[],
): CatalogIssue[] => errors.map((error) => locate(document, error));
