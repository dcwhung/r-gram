/*
 * 上載圖寫入：先 R2 後 D1（同 903-player）。R2 有、D1 冇嘅檔無害（冇專輯引用得到）；
 * 反過嚟就會有指住爛圖嘅專輯。同一個名重複寫：R2 照寫（內容一樣，順便補返唔見咗嘅 object），D1 唔重複
 */
import type { Env } from '../env';
import type { ImageFormat } from './imageHeader';
import { imageKeyOf } from './imageName';

export interface StoredImage {
    name: string;
    format: ImageFormat;
    bytes: Uint8Array;
}

export const storeImage = async (
    env: Pick<Env, 'DB' | 'CATALOG'>,
    { name, format, bytes }: StoredImage,
): Promise<void> => {
    await env.CATALOG.put(imageKeyOf(name), bytes, {
        httpMetadata: { contentType: format.contentType },
    });
    await env.DB.prepare(
        `INSERT INTO assets (name, content_type, bytes, created_at) VALUES (?, ?, ?, ?)
         ON CONFLICT (name) DO NOTHING`,
    )
        .bind(name, format.contentType, bytes.length, new Date().toISOString())
        .run();
};
