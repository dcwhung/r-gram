/*
 * API-018 GET、API-019 PUT /api/albums/:id/info（T-106；Technical Spec「寫返媒體 bucket」；Functional Spec D75、FR-128）：
 * 專輯頁嘅 `info.txt` 文字框讀寫媒體 bucket。
 * - 讀：資料夾第一層嘅 `info.txt`（唔分大細楷，同同步一樣揀第一個）→ `{ key, etag, text, problem }`；
 *   冇 = `{ key: <folder>/info.txt, etag: null, text: formatAlbumInfo(D1 而家嘅碟名、年份、曲目) }`
 * - 寫：body `{ text, etag }`（400）→ 大細、行數上限（413，同 parseAlbumInfo 一樣）；內容唔擋 → 專輯（404）→
 *   D1 嘅資料夾要過 resolveFolder()（400／404／409，同 API-034）→ key = 已有嘅 `info.txt`，冇 = `<folder>/info.txt`
 *   → putMediaText()（版本唔啱 = 409 STALE，乜都唔寫）→ 同步呢個資料夾（runFolderSync，同 API-034 一樣）→
 *   `{ key, etag, ...API-034 嘅回應 }`（album、checks、pendingRemovals、coverJobs、more、nextFrom…）。
 *   寫咗檔而同步出錯 = 500，下次同步會補返（bucket 係唯一來源）
 */
import {
    formatAlbumInfo,
    INFO_TEXT_MAX_BYTES,
    parseAlbumFolder,
    parseAlbumInfo,
    TRACK_NO_MIN,
} from '@r-gram/catalog';
import type { Context } from 'hono';
import type { AppEnv } from '../app';
import { listFolder, type FolderListing } from '../media/listing';
import { readMediaText } from '../media/readText';
import { readTextRequest } from '../media/textBody';
import { normalizeText, putMediaText } from '../media/writeText';
import { syncError } from '../sync/errors';
import { resolveFolder } from '../sync/folderTarget';
import { infoFileOf } from '../sync/infoFile';
import { runFolderSync } from '../sync/syncFolder';
import { tracksOf } from '../tracks/rows';
import { albumError, albumValidationError } from './errors';
import type { AlbumRow } from './rows';
import { findAlbum } from './store';

const INFO_FILE_NAME = 'info.txt';

const newInfoKey = (folder: string) => `${folder}/${INFO_FILE_NAME}`;

const templateOf = async (db: D1Database, album: AlbumRow) => ({
    key: newInfoKey(album.folder),
    etag: null,
    text: formatAlbumInfo({ ...album, tracks: await tracksOf(db, album.id) }),
    problem: null,
});

export const getAlbumInfo = async (c: Context<AppEnv>) => {
    const album = await findAlbum(c.env.DB, c.req.param('id') ?? '');
    if (!album) return albumError(c, 'notFound');
    if (!parseAlbumFolder(album.folder)) return syncError(c, 'invalidFolder');
    const listing = await listFolder(c.env.MEDIA, album.folder);
    if (listing.files.length === 0) return syncError(c, 'folderEmpty');
    const file = infoFileOf(listing.files);
    const read = file ? await readMediaText(c.env.MEDIA, file.key, INFO_TEXT_MAX_BYTES) : null;
    if (file && read) return c.json({ key: file.key, ...read });
    return c.json(await templateOf(c.env.DB, album));
};

/** 寫邊個 key；list 唔齊又搵唔到 `info.txt` = 唔知會唔會開多一個（例如已有 `Info.txt`）→ 'stale' */
const infoKeyOf = (folder: string, listing: FolderListing): string | 'stale' => {
    const file = infoFileOf(listing.files);
    if (file) return file.key;
    return listing.truncated ? 'stale' : newInfoKey(folder);
};

const writeAndSync = async (
    c: Context<AppEnv>,
    album: AlbumRow,
    text: string,
    etag: string | null,
) => {
    const target = await resolveFolder(c.env, album.folder);
    if (typeof target === 'string') return syncError(c, target);
    const key = infoKeyOf(target.folder, await listFolder(c.env.MEDIA, target.folder));
    if (key === 'stale') return albumError(c, 'stale');
    const written = await putMediaText(
        c.env.MEDIA,
        { kind: 'info', folder: target.folder, key },
        text,
        etag,
    );
    if (written === null) return albumError(c, 'stale');
    const result = await runFolderSync(c, target, TRACK_NO_MIN);
    if (result === 'folderEmpty') return syncError(c, result);
    return c.json({ key, etag: written, ...result });
};

export const putAlbumInfo = async (c: Context<AppEnv>) => {
    const body = await readTextRequest(c, INFO_TEXT_MAX_BYTES);
    if (body === 'tooLarge') return albumError(c, 'tooLarge');
    if (!body.ok) return albumValidationError(c, body.issues);
    if (!parseAlbumInfo(normalizeText(body.text)).usable) return albumError(c, 'tooLarge');
    const album = await findAlbum(c.env.DB, c.req.param('id') ?? '');
    if (!album) return albumError(c, 'notFound');
    return writeAndSync(c, album, body.text, body.etag);
};
