/*
 * API-050 PUT /api/assets（T-024）：上載封面圖。已經過 session + same-origin 守門（api/routes.ts）。
 * 管理端喺瀏覽器裁切、轉 WebP、抽主色（Technical Spec 數據流 A），兩個尺寸（1200 / 320）逐張上載，
 * 再用 API-017 PUT /api/albums/:id/cover 將 cover / thumb / accent 指向上載咗嘅圖（嗰個請求先改 catalog 內容，T-106）。
 * 次序：Content-Type 係三種之一（415）→ 大細上限（413）→ 檔頭 magic bytes 同宣告一致（415）→
 * 結構 + 尺寸（400）→ 以內容 hash 命名寫 R2 + assets。
 * 上載本身唔改 catalog（冇專輯引用之前播放端用唔到），所以唔行寫入後置步驟（backlog B-043 ③）。
 * 唔 log 任何上載內容
 */
import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { AppEnv } from '../app';
import { skipPostWrite } from '../api/afterWrite';
import { COVER_SIDE_PX, IMAGE_MAX_BYTES, THUMB_SIDE_PX } from '../config';
import { assetError, invalidImage } from './errors';
import { declaredImageFormat, sniffImageFormat, type ImageFormat } from './imageHeader';
import { imageNameOf } from './imageName';
import { InvalidImageError, type ImageSize } from './invalidImage';
import { storeImage } from './store';

export const assetRoutes = new Hono<AppEnv>();

/** 封面只有兩個尺寸，都係正方形 */
const ALLOWED_SIDES: readonly number[] = [COVER_SIDE_PX, THUMB_SIDE_PX];

const isAllowedSize = ({ width, height }: ImageSize): boolean =>
    width === height && ALLOWED_SIDES.includes(width);

/** 明顯唔係圖嘅請求（冇 / 錯 Content-Type）未讀 body 就擋 */
const requireImageType: MiddlewareHandler<AppEnv> = async (c, next) => {
    if (!declaredImageFormat(c.req.header('content-type'))) return assetError(c, 'unsupportedType');
    await next();
};

const limitSize = bodyLimit({
    maxSize: IMAGE_MAX_BYTES,
    onError: (c) => assetError(c, 'tooLarge'),
});

/** 格式由檔頭認，而且要同宣告嘅一致；結構同尺寸啱先回格式，唔得就回錯誤回應 */
const checkedFormat = (c: Context, bytes: Uint8Array): ImageFormat | Response => {
    const format = sniffImageFormat(bytes);
    if (!format || format !== declaredImageFormat(c.req.header('content-type')))
        return assetError(c, 'unsupportedType');
    let size: ImageSize;
    try {
        size = format.parse(bytes);
    } catch (error) {
        if (error instanceof InvalidImageError) return invalidImage(c, 'INVALID_IMAGE');
        throw error;
    }
    return isAllowedSize(size) ? format : invalidImage(c, 'INVALID_DIMENSIONS');
};

assetRoutes.put('/', skipPostWrite, requireImageType, limitSize, async (c) => {
    const bytes = new Uint8Array(await c.req.arrayBuffer());
    const format = checkedFormat(c, bytes);
    if (format instanceof Response) return format;
    const name = await imageNameOf(bytes, format);
    await storeImage(c.env, { name, format, bytes });
    return c.json({ name, bytes: bytes.length });
});
