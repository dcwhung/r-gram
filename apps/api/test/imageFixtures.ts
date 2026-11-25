/*
 * test 用嘅最細圖檔（WebP / PNG / JPEG）：parser 只讀檔頭同結構，唔使真圖像資料。
 * 全部喺呢度砌出嚟，冇下載嘅圖、冇真封面。`seed` 令唔同 test 嘅 bytes 唔同 hash
 */

const ascii = (text: string): number[] => [...text].map((ch) => ch.charCodeAt(0));
const le16 = (value: number): number[] => [value & 0xff, (value >> 8) & 0xff];
const le24 = (value: number): number[] => [...le16(value), (value >> 16) & 0xff];
const le32 = (value: number): number[] => [...le16(value), ...le16(value >>> 16)];
const be16 = (value: number): number[] => [(value >> 8) & 0xff, value & 0xff];
const be32 = (value: number): number[] => [24, 16, 8, 0].map((shift) => (value >>> shift) & 0xff);

/* ---------- WebP ---------- */

/** 一個 chunk：fourcc + size + payload（單數長度補 1 byte） */
export const chunk = (fourcc: string, payload: number[]): number[] => {
    const padded = payload.length % 2 === 1 ? [...payload, 0] : payload;
    return [...ascii(fourcc), ...le32(payload.length), ...padded];
};

/** RIFF 容器包住幾個 chunk */
export const riffOf = (chunks: number[][]): Uint8Array => {
    const body = chunks.flat();
    return new Uint8Array([...ascii('RIFF'), ...le32(4 + body.length), ...ascii('WEBP'), ...body]);
};

/** frame tag bit 0 = 0 係 keyframe */
const KEY_FRAME_TAG = 0x30;

export const vp8Payload = (width: number, height: number, tag = KEY_FRAME_TAG): number[] => [
    tag,
    0x01,
    0x00,
    0x9d,
    0x01,
    0x2a,
    ...le16(width),
    ...le16(height),
    0,
    0,
];

export const vp8lPayload = (width: number, height: number, seed = 0): number[] => [
    0x2f,
    ...le32((width - 1) | ((height - 1) << 14)),
    seed & 0xff,
];

export const vp8xPayload = (width: number, height: number): number[] => [
    0x10,
    0,
    0,
    0,
    ...le24(width - 1),
    ...le24(height - 1),
];

export const webpVp8 = (width: number, height: number): Uint8Array =>
    riffOf([chunk('VP8 ', vp8Payload(width, height))]);

export const webpVp8l = (width: number, height: number, seed = 0): Uint8Array =>
    riffOf([chunk('VP8L', vp8lPayload(width, height, seed))]);

export const webpVp8x = (width: number, height: number): Uint8Array =>
    riffOf([chunk('VP8X', vp8xPayload(width, height)), chunk('VP8L', vp8lPayload(width, height))]);

/* ---------- PNG ---------- */

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** bit depth 8、color type 6（RGBA）、compression / filter / interlace 0 */
const IHDR_TAIL = [8, 6, 0, 0, 0];
const CRC = [0, 0, 0, 0];

const pngChunk = (type: string, data: number[]): number[] => [
    ...be32(data.length),
    ...ascii(type),
    ...data,
    ...CRC,
];

export const pngOf = (width: number, height: number, seed = 0): Uint8Array =>
    new Uint8Array([
        ...PNG_SIGNATURE,
        ...pngChunk('IHDR', [...be32(width), ...be32(height), ...IHDR_TAIL]),
        ...pngChunk('IDAT', [seed & 0xff]),
        ...pngChunk('IEND', []),
    ]);

export const pngWithoutIhdr = (): Uint8Array =>
    new Uint8Array([...PNG_SIGNATURE, ...pngChunk('sRGB', [0]), ...pngChunk('IEND', [])]);

/* ---------- JPEG ---------- */

export const SOF_BASELINE = 0xc0;
export const SOF_PROGRESSIVE = 0xc2;

/** marker + 2 bytes 長度（連長度本身）+ data */
export const segment = (marker: number, data: number[]): number[] => [
    0xff,
    marker,
    ...be16(data.length + 2),
    ...data,
];

const APP0_JFIF = segment(0xe0, [...ascii('JFIF'), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]);
/** 3 個 component：id、sampling、量化表 */
const COMPONENTS = [3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
const SCAN = segment(0xda, [3, 1, 0, 2, 0x11, 3, 0x11, 0, 0x3f, 0]);
const END_OF_IMAGE = [0xff, 0xd9];

export const sofSegment = (width: number, height: number, marker = SOF_BASELINE): number[] =>
    segment(marker, [8, ...be16(height), ...be16(width), ...COMPONENTS]);

/** SOI + 之前嘅 segment + SOF + SOS + 一 byte 圖像資料 + EOI */
export const jpegFrom = (segments: number[][], seed = 0): Uint8Array =>
    new Uint8Array([0xff, 0xd8, ...segments.flat(), ...SCAN, seed & 0xff, ...END_OF_IMAGE]);

export const jpegOf = (width: number, height: number, seed = 0, marker = SOF_BASELINE) =>
    jpegFrom([APP0_JFIF, sofSegment(width, height, marker)], seed);

/** 冇 SOF：APP0 之後直接 SOS */
export const jpegWithoutFrame = (): Uint8Array => jpegFrom([APP0_JFIF]);

export const textBytes = (text: string): Uint8Array => new TextEncoder().encode(text);
