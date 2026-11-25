/*
 * 圖檔名（Technical Spec「assets」、「核心原則 2」）：`<內容 sha256 頭 16 hex>.<ext>`。
 * 同一張圖永遠同一個名（重複上載唔會多一個檔），換內容 = 換名，所以可以永久 cache
 */
import { IMAGE_HASH_HEX_CHARS, IMAGE_KEY_PREFIX } from '../config';
import { imageFormatOfExtension, type ImageFormat } from './imageHeader';

const HEX_BASE = 16;
const HEX_BYTE_CHARS = 2;
/** 公開 route 只認呢個寫法：細楷 hex + 已知副檔名，冇 `/`、`..` 呢類 path 字元 */
const IMAGE_NAME = new RegExp(`^[0-9a-f]{${IMAGE_HASH_HEX_CHARS}}\\.([a-z]+)$`);

const sha256Hex = async (bytes: Uint8Array): Promise<string> =>
    [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
        .map((byte) => byte.toString(HEX_BASE).padStart(HEX_BYTE_CHARS, '0'))
        .join('');

export const imageNameOf = async (bytes: Uint8Array, format: ImageFormat): Promise<string> =>
    `${(await sha256Hex(bytes)).slice(0, IMAGE_HASH_HEX_CHARS)}.${format.extension}`;

/** r-gram-catalog 入面嘅 key */
export const imageKeyOf = (name: string): string => `${IMAGE_KEY_PREFIX}${name}`;

/** 合規嘅圖檔名 → 格式；唔係 `<hash>.<已知副檔名>` 就 undefined */
export const formatOfImageName = (name: string): ImageFormat | undefined => {
    const extension = IMAGE_NAME.exec(name)?.[1];
    return extension === undefined ? undefined : imageFormatOfExtension(extension);
};
