/*
 * 媒體 bucket 第一層嘅專輯資料夾（Functional Spec D67；Technical Spec API-033）：`listLevel('')`（最多 SCAN_LIST_PAGES_MAX 頁），
 * 每個資料夾名過 parseAlbumFolder()。`_` 開頭（例如 `_fonts`）係保留資料夾：唔係專輯、唔列、唔出檢查結果
 */
import { parseAlbumFolder, type AlbumFolder } from '@r-gram/catalog';
import { DELIMITER, listLevel } from '../media/listing';

/** 保留資料夾嘅開頭 */
const RESERVED_PREFIX = '_';

export interface BucketFolder extends AlbumFolder {
    folder: string;
}

export interface BucketFolders {
    folders: BucketFolder[];
    /** 名唔啱格式（唔包 `_` 開頭） */
    invalid: string[];
    /** list 讀到頁數上限：唔齊，唔可以判斷「資料夾冇咗」 */
    truncated: boolean;
}

export const listAlbumFolders = async (bucket: R2Bucket): Promise<BucketFolders> => {
    const level = await listLevel(bucket, '');
    const names = level.folders
        .map((prefix) => prefix.slice(0, -DELIMITER.length))
        .filter((name) => name !== '' && !name.startsWith(RESERVED_PREFIX));
    const folders: BucketFolder[] = [];
    const invalid: string[] = [];
    for (const folder of names) {
        const parsed = parseAlbumFolder(folder);
        if (parsed) folders.push({ folder, ...parsed });
        else invalid.push(folder);
    }
    return { folders, invalid, truncated: level.truncated };
};
