/*
 * API-071 GET /catalog/v1/img/:name（T-024）：由 private bucket r-gram-catalog 出封面圖（公開，唔使 session）。
 * 檔名一定要係 `<16 hex>.<webp|jpg|png>`：唔係就 404，唔會砌出 img/ 以外嘅 key（path traversal）。
 * content type 跟副檔名（上載時由檔頭認出），唔靠 R2 metadata；hash 檔名 = 內容不變 → immutable。
 * T-026 喺呢度加 catalog.json（ETag、max-age=60）同歌詞 JSON
 */
import type { Context } from 'hono';
import type { AppEnv } from '../app';
import { assetError } from '../assets/errors';
import { formatOfImageName, imageKeyOf } from '../assets/imageName';
import { IMMUTABLE_CACHE, NO_SNIFF } from '../config';

export const serveImage = async (c: Context<AppEnv>): Promise<Response> => {
    const name = c.req.param('name') ?? '';
    const format = formatOfImageName(name);
    if (!format) return assetError(c, 'notFound');
    const object = await c.env.CATALOG.get(imageKeyOf(name));
    if (!object) return assetError(c, 'notFound');
    return c.body(object.body, {
        headers: {
            'content-type': format.contentType,
            'cache-control': IMMUTABLE_CACHE,
            'x-content-type-options': NO_SNIFF,
            etag: object.httpEtag,
        },
    });
};
