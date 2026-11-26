/*
 * 上載圖嘅格式（Technical Spec「安全設計 → 上載」：只收 image/webp｜jpeg｜png，檢查 magic bytes）。
 * 格式一律由檔頭 magic bytes 認（sniffImageFormat）；Content-Type 只係用嚟擋明顯唔啱嘅請求，
 * 而且要同檔頭一致。儲存用嘅副檔名同 content type 都由認出嚟嘅格式決定，唔用客戶端畀嘅
 */
import type { ImageSize } from './invalidImage';
import { parseJpeg } from './jpeg';
import { parsePng, PNG_SIGNATURE } from './png';
import { parseWebp, readWebpSize } from './webp';

export interface ImageFormat {
    contentType: string;
    /** 圖檔名副檔名（`<hash>.<extension>`） */
    extension: string;
    /** 檔頭 magic bytes（null = 任何 byte） */
    magic: readonly (number | null)[];
    /** 成個檔嘅結構檢查 + 闊高；唔合規 throw InvalidImageError */
    parse: (bytes: Uint8Array) => ImageSize;
    /**
     * 只由檔頭一段讀闊高（S-186，API-017；圖已經過 parse）：PNG、WebP 嘅闊高喺頭幾十 bytes；
     * JPEG 要行到 SOF，前面嘅 segment 唔夠就 throw（截短）
     */
    size: (bytes: Uint8Array) => ImageSize;
}

const ANY = null;
const ascii = (text: string) => [...text].map((character) => character.charCodeAt(0));
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
/** 'RIFF' 之後 4 bytes 係檔案長度 */
const RIFF_SIZE = [ANY, ANY, ANY, ANY];

export const IMAGE_FORMATS: readonly ImageFormat[] = [
    {
        contentType: 'image/webp',
        extension: 'webp',
        magic: [...ascii('RIFF'), ...RIFF_SIZE, ...ascii('WEBP')],
        parse: parseWebp,
        size: readWebpSize,
    },
    {
        contentType: 'image/jpeg',
        extension: 'jpg',
        magic: JPEG_MAGIC,
        parse: parseJpeg,
        size: parseJpeg,
    },
    {
        contentType: 'image/png',
        extension: 'png',
        magic: PNG_SIGNATURE,
        parse: parsePng,
        size: parsePng,
    },
];

const matchesMagic = ({ magic }: ImageFormat, bytes: Uint8Array): boolean =>
    bytes.length >= magic.length &&
    magic.every((expected, index) => expected === ANY || bytes[index] === expected);

/** 檔頭 magic bytes → 格式；三種都唔係就 undefined */
export const sniffImageFormat = (bytes: Uint8Array): ImageFormat | undefined =>
    IMAGE_FORMATS.find((format) => matchesMagic(format, bytes));

/** Content-Type 嘅 media type（去 `;` 參數、唔分大細楷）→ 格式；唔收就 undefined */
export const declaredImageFormat = (header: string | undefined): ImageFormat | undefined => {
    const mediaType = (header ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
    return IMAGE_FORMATS.find((format) => format.contentType === mediaType);
};

/** 圖檔名嘅副檔名 → 格式（出圖時定 content type，唔靠 R2 metadata） */
export const imageFormatOfExtension = (extension: string): ImageFormat | undefined =>
    IMAGE_FORMATS.find((format) => format.extension === extension);
