/*
 * 媒體 bucket（rb-discography）嘅 list：一層（delimiter `/`），跟 cursor 讀晒全部頁（每頁最多 1000 個 = 一個 R2 操作）。
 * 專輯資料夾入面嘅子資料夾唔當專輯嘅檔（掃描只睇第一層）。Worker 只 list / head / get，唔寫媒體 bucket。
 * 移植自 903-player `content/r2Listing.ts`
 */
import type { ScanFile } from '@r-gram/catalog';

export const DELIMITER = '/';

export interface ListedLevel {
    files: ScanFile[];
    /** 子資料夾（完整 prefix，`/` 結尾） */
    folders: string[];
}

const toFile = ({ key, size, httpEtag }: R2Object): ScanFile => ({
    key,
    bytes: size,
    etag: httpEtag,
});

/** `prefix` 底下一層；資料夾標記 object（key = prefix）略過 */
export const listLevel = async (bucket: R2Bucket, prefix: string): Promise<ListedLevel> => {
    const level: ListedLevel = { files: [], folders: [] };
    let cursor: string | undefined;
    do {
        const page = await bucket.list({ prefix, delimiter: DELIMITER, cursor });
        level.files.push(...page.objects.filter(({ key }) => key !== prefix).map(toFile));
        level.folders.push(...page.delimitedPrefixes);
        cursor = page.truncated ? page.cursor : undefined;
    } while (cursor !== undefined);
    return level;
};

/** 專輯資料夾第一層嘅檔 */
export const listFolder = async (bucket: R2Bucket, folder: string): Promise<ScanFile[]> =>
    (await listLevel(bucket, `${folder}${DELIMITER}`)).files;

/** key 係呢個資料夾第一層嘅檔 */
export const isDirectChild = (key: string, folder: string): boolean => {
    const prefix = `${folder}${DELIMITER}`;
    return (
        key.startsWith(prefix) &&
        key.length > prefix.length &&
        !key.slice(prefix.length).includes(DELIMITER)
    );
};
