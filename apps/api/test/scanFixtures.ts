/* 掃描 test 共用：媒體 bucket（test binding，細嘅假檔）同一張碟（KOMOREBI，預期資料夾 album-11-komorebi） */
import { env } from 'cloudflare:test';
import { api, insertAlbum, insertTrack, json } from './albumFixtures';

export const ALBUM_ID = 'komorebi';
export const FOLDER = 'album-11-komorebi';
/** 預設音檔內容（幾個 byte 就夠：掃描只睇 key、大細、ETag） */
const FAKE_MEDIA = 'media';

export const mediaKey = (name: string, folder = FOLDER) => `${folder}/${name}`;

/** 放一個檔落媒體 bucket；回佢嘅 httpEtag（有引號，同掃描回應一樣） */
export const putMedia = async (
    name: string,
    body: string | Uint8Array = FAKE_MEDIA,
    folder = FOLDER,
) => (await env.MEDIA.put(mediaKey(name, folder), body))?.httpEtag ?? '';

export const putMediaFiles = (names: readonly string[]) =>
    Promise.all(names.map((name) => putMedia(name)));

export const seedScanAlbum = (extra: Record<string, unknown> = {}) =>
    insertAlbum(ALBUM_ID, 10, { category: 'album', category_no: 11, ...extra });

export const insertScanTrack = (no: number, extra: Record<string, unknown> = {}) =>
    insertTrack(`${ALBUM_ID}-${String(no).padStart(2, '0')}`, ALBUM_ID, no, extra);

export const scanPreview = (query = '', albumId = ALBUM_ID) =>
    api('GET', `/api/albums/${albumId}/scan${query}`);

export const scanApply = (body: unknown, albumId = ALBUM_ID) =>
    api('POST', `/api/albums/${albumId}/scan/apply`, body);

/** 掃描回應嘅形狀好深：test 逐項 toMatchObject 驗，唔逐層寫型別 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Loose = Record<string, any>;

export const previewOf = async (query = '') => json<Loose>(await scanPreview(query));
