/*
 * 同步：讀資料夾嘅 `info.txt`（Functional Spec D68；Technical Spec「同步嘅設計」、「安全設計 → 讀媒體 bucket」）。
 * 幾個（唔分大細楷）= 用 list 排第一嗰個（其餘出 INFO_CONFLICT，planFolderSync）。
 * ETag 同 albums.info_etag 一樣 = 唔讀（unchanged）；大過 INFO_TEXT_MAX_BYTES 唔讀（INFO_TOO_LARGE）；
 * 唔係 UTF-8 = INFO_BAD_ENCODING；兩種都當冇 `info.txt`（曲目由音檔決定）
 */
import {
    checkOf,
    classifyFile,
    INFO_TEXT_MAX_BYTES,
    INFO_TEXT_MAX_LINES,
    parseAlbumInfo,
    type AlbumInfo,
    type Check,
    type ScanFile,
    type SyncInfo,
} from '@r-gram/catalog';
import { decodeUtf8 } from '../media/songTextFile';

const unusable = (check: Check): AlbumInfo => ({
    usable: false,
    title: null,
    year: null,
    tracks: [],
    checks: [check],
});

const TOO_LARGE = () =>
    unusable(
        checkOf(
            'INFO_TOO_LARGE',
            {},
            { maxBytes: INFO_TEXT_MAX_BYTES, maxLines: INFO_TEXT_MAX_LINES },
        ),
    );

export const infoFileOf = (files: readonly ScanFile[]): ScanFile | undefined =>
    files.find(({ key }) => classifyFile(key).kind === 'info');

/** 讀 `info.txt`（大細、編碼有上限）；個檔啱啱冇咗 → null */
export const readInfoText = async (
    bucket: R2Bucket,
    file: ScanFile,
): Promise<{ etag: string; info: AlbumInfo } | null> => {
    if (file.bytes > INFO_TEXT_MAX_BYTES) return { etag: file.etag, info: TOO_LARGE() };
    const object = await bucket.get(file.key);
    if (!object) return null;
    if (object.size > INFO_TEXT_MAX_BYTES) {
        await object.body.cancel();
        return { etag: object.httpEtag, info: TOO_LARGE() };
    }
    const text = decodeUtf8(await object.arrayBuffer());
    const info = text === undefined ? unusable(checkOf('INFO_BAD_ENCODING')) : parseAlbumInfo(text);
    return { etag: object.httpEtag, info };
};

export const readSyncInfo = async (
    bucket: R2Bucket,
    files: readonly ScanFile[],
    storedEtag: string | null,
): Promise<SyncInfo> => {
    const file = infoFileOf(files);
    if (!file) return { kind: 'none' };
    if (file.etag === storedEtag) return { kind: 'unchanged', key: file.key, etag: file.etag };
    const read = await readInfoText(bucket, file);
    return read ? { kind: 'read', key: file.key, ...read } : { kind: 'none' };
};
