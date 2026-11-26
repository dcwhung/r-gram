/*
 * /catalog/v1/*：由 private bucket rb-discography-catalog 出公開內容（唔使 session）。
 * - API-070 catalog.json（T-026）：max-age=60；ETag = 內容 hash（生成時寫入 R2 customMetadata）；未生成過 → 404 NOT_READY
 * - API-071 img/<16 hex>.<webp|jpg|png>（T-024）、API-072 lyrics/<16 hex>.json（T-026）：內容 hash 檔名 → immutable
 * 檔名唔啱固定寫法就 404，唔會砌出其他 key（path traversal）；content type 由 route 決定，唔靠 R2 metadata。
 * If-None-Match 啱就 304；HEAD 用 head()，唔下載成個檔（backlog B-051）。CORS、CSP 等 header 見 routes.ts
 */
import type { Context } from 'hono';
import type { AppEnv } from '../app';
import { assetError } from '../assets/errors';
import { formatOfImageName, imageKeyOf } from '../assets/imageName';
import {
    CATALOG_CACHE,
    CATALOG_JSON_KEY,
    HTTP_STATUS,
    IMMUTABLE_CACHE,
    JSON_CONTENT_TYPE,
    LYRICS_HASH_HEX_CHARS,
} from '../config';
import { lyricsKey } from '../tracks/songText';
import { matchesIfNoneMatch } from './conditional';
import { catalogError } from './errors';

interface ServedObject {
    key: string;
    contentType: string;
    cacheControl: string;
    /** 冇呢個 object 嘅回應 */
    missing: (c: Context<AppEnv>) => Response;
    /** 預設用 R2 嘅 etag */
    etagOf?: (object: R2Object) => string;
}

const LYRICS_NAME = new RegExp(`^[0-9a-f]{${LYRICS_HASH_HEX_CHARS}}\\.json$`);

const hasBody = (object: R2Object): object is R2ObjectBody => 'body' in object;

const load = (c: Context<AppEnv>, key: string): Promise<R2Object | null> =>
    c.req.method === 'HEAD' ? c.env.CATALOG.head(key) : c.env.CATALOG.get(key);

const serveObject = async (c: Context<AppEnv>, served: ServedObject): Promise<Response> => {
    const object = await load(c, served.key);
    if (!object) return served.missing(c);
    const etag = served.etagOf?.(object) ?? object.httpEtag;
    const headers = {
        'content-type': served.contentType,
        'cache-control': served.cacheControl,
        etag,
    };
    const body = hasBody(object) ? object.body : null;
    if (matchesIfNoneMatch(c.req.header('if-none-match'), etag)) {
        await body?.cancel();
        return c.body(null, HTTP_STATUS.notModified, headers);
    }
    // HEAD（head()）冇 body
    return body ? c.body(body, HTTP_STATUS.ok, headers) : c.body(null, HTTP_STATUS.ok, headers);
};

/** ETag = 內容 hash（= catalog_state.hash）；冇記低就退返 R2 etag */
const catalogEtag = (object: R2Object): string => {
    const hash = object.customMetadata?.hash;
    return hash ? `"${hash}"` : object.httpEtag;
};

export const serveCatalog = (c: Context<AppEnv>): Promise<Response> =>
    serveObject(c, {
        key: CATALOG_JSON_KEY,
        contentType: JSON_CONTENT_TYPE,
        cacheControl: CATALOG_CACHE,
        missing: (context) => catalogError(context, 'notReady'),
        etagOf: catalogEtag,
    });

export const serveImage = async (c: Context<AppEnv>): Promise<Response> => {
    const name = c.req.param('name') ?? '';
    const format = formatOfImageName(name);
    const missing = (context: Context<AppEnv>) => assetError(context, 'notFound');
    if (!format) return missing(c);
    return serveObject(c, {
        key: imageKeyOf(name),
        contentType: format.contentType,
        cacheControl: IMMUTABLE_CACHE,
        missing,
    });
};

export const serveLyrics = async (c: Context<AppEnv>): Promise<Response> => {
    const name = c.req.param('name') ?? '';
    const missing = (context: Context<AppEnv>) => catalogError(context, 'notFound');
    if (!LYRICS_NAME.test(name)) return missing(c);
    return serveObject(c, {
        key: lyricsKey(name),
        contentType: JSON_CONTENT_TYPE,
        cacheControl: IMMUTABLE_CACHE,
        missing,
    });
};
