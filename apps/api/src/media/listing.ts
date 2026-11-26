/*
 * 媒體 bucket（rb-discography）嘅 list：一層（delimiter `/`），跟 cursor 讀，最多 SCAN_LIST_PAGES_MAX 頁
 *（每頁最多 1000 個 = 一個 R2 操作）；讀到上限仲有就停，`truncated` = true（review S-136）。
 * 專輯資料夾入面嘅子資料夾唔當專輯嘅檔（掃描只睇第一層）。寫媒體 bucket 只有 media/writeText.ts（T-106）。
 * 移植自 903-player `content/r2Listing.ts`
 */
import type { ScanFile } from '@r-gram/catalog';
import { SCAN_LIST_PAGES_MAX } from '../config';

export const DELIMITER = '/';

export interface ListedLevel {
    files: ScanFile[];
    /** 子資料夾（完整 prefix，`/` 結尾） */
    folders: string[];
    /** 讀到頁數上限仲有：files / folders 唔齊 */
    truncated: boolean;
}

export interface FolderListing {
    files: ScanFile[];
    truncated: boolean;
}

const toFile = ({ key, size, httpEtag }: R2Object): ScanFile => ({
    key,
    bytes: size,
    etag: httpEtag,
});

/** `prefix` 底下一層；資料夾標記 object（key = prefix）略過 */
export const listLevel = async (bucket: R2Bucket, prefix: string): Promise<ListedLevel> => {
    const level: ListedLevel = { files: [], folders: [], truncated: true };
    let cursor: string | undefined;
    for (let pages = 0; pages < SCAN_LIST_PAGES_MAX; pages += 1) {
        const page = await bucket.list({ prefix, delimiter: DELIMITER, cursor });
        level.files.push(...page.objects.filter(({ key }) => key !== prefix).map(toFile));
        level.folders.push(...page.delimitedPrefixes);
        if (!page.truncated) return { ...level, truncated: false };
        cursor = page.cursor;
    }
    return level;
};

/** 專輯資料夾第一層嘅檔 */
export const listFolder = async (bucket: R2Bucket, folder: string): Promise<FolderListing> => {
    const { files, truncated } = await listLevel(bucket, `${folder}${DELIMITER}`);
    return { files, truncated };
};

/** key 係呢個資料夾第一層嘅檔 */
export const isDirectChild = (key: string, folder: string): boolean => {
    const prefix = `${folder}${DELIMITER}`;
    return (
        key.startsWith(prefix) &&
        key.length > prefix.length &&
        !key.slice(prefix.length).includes(DELIMITER)
    );
};
