/*
 * JPEG 檔頭 parser（pure）：由 SOI（FF D8）之後逐個 marker segment 行，第一個 SOF（frame header）讀闊高。
 * 唔 decode 圖像：上載 API 用嚟擋假檔同驗尺寸。SOS / EOI 之前都搵唔到 SOF = 唔合規；
 * 高度 0（要等 DNL 先知）都當唔合規（封面尺寸固定，一定要喺檔頭寫明）。
 * 格式見 ITU-T T.81 附錄 B（B.1.1.3 marker、B.2.2 frame header）
 */
import { InvalidImageError, type ImageSize } from './invalidImage';

const MARKER_PREFIX = 0xff;
/** SOI：檔頭 FF D8 */
const START_OF_IMAGE = 0xd8;
/** SOI（FF D8）之後由 offset 2 開始 */
const FIRST_SEGMENT = 2;
const MARKER_BYTES = 2;
const LENGTH_BYTES = 2;
/** 冇長度欄位嘅 marker：TEM、RST0–RST7 */
const TEM = 0x01;
const RST_FIRST = 0xd0;
const RST_LAST = 0xd7;
/** 圖像資料開始 / 檔案結束：去到呢度都未有 SOF 就唔合規 */
const START_OF_SCAN = 0xda;
const END_OF_IMAGE = 0xd9;
/** SOF0–SOF15，除咗 C4（DHT）、C8（JPG 保留）、CC（DAC） */
const FRAME_MARKERS: ReadonlySet<number> = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);
/** frame header：長度（2）+ precision（1）+ 高（2）+ 闊（2） */
const FRAME_HEIGHT_OFFSET = LENGTH_BYTES + 1;
const FRAME_WIDTH_OFFSET = FRAME_HEIGHT_OFFSET + 2;
const FRAME_MIN_BYTES = FRAME_WIDTH_OFFSET + 2;

const uint16 = (bytes: Uint8Array, at: number): number =>
    ((bytes[at] ?? 0) << 8) | (bytes[at + 1] ?? 0);

const isStandalone = (marker: number): boolean =>
    marker === TEM || (marker >= RST_FIRST && marker <= RST_LAST);

const truncated = (): InvalidImageError => new InvalidImageError('file is truncated');

/** at 位係 FF（連 fill bytes）+ marker；回 marker 同佢之後嘅位 */
const markerAt = (bytes: Uint8Array, from: number): { marker: number; next: number } => {
    if (bytes[from] !== MARKER_PREFIX) throw new InvalidImageError('expected a marker');
    let at = from;
    while (bytes[at] === MARKER_PREFIX) at += 1;
    if (at >= bytes.length) throw truncated();
    return { marker: bytes[at] as number, next: at + 1 };
};

/** frame header 嘅闊高（segment 由長度欄位開始） */
const frameSize = (bytes: Uint8Array, at: number): ImageSize => {
    if (at + FRAME_MIN_BYTES > bytes.length) throw truncated();
    const size = {
        width: uint16(bytes, at + FRAME_WIDTH_OFFSET),
        height: uint16(bytes, at + FRAME_HEIGHT_OFFSET),
    };
    if (size.width === 0 || size.height === 0)
        throw new InvalidImageError('frame header has a zero dimension');
    return size;
};

/** 有長度嘅 segment：回下一個 marker 嘅位 */
const skipSegment = (bytes: Uint8Array, at: number): number => {
    if (at + LENGTH_BYTES > bytes.length) throw truncated();
    const length = uint16(bytes, at);
    if (length < LENGTH_BYTES) throw new InvalidImageError('segment length below 2');
    return at + length;
};

/** 合規就回闊高；唔合規 throw InvalidImageError */
export const parseJpeg = (bytes: Uint8Array): ImageSize => {
    if (
        bytes.length < MARKER_BYTES + 1 ||
        bytes[0] !== MARKER_PREFIX ||
        bytes[1] !== START_OF_IMAGE
    )
        throw new InvalidImageError('not a JPEG file');
    let at = FIRST_SEGMENT;
    while (at < bytes.length) {
        const { marker, next } = markerAt(bytes, at);
        if (marker === START_OF_SCAN || marker === END_OF_IMAGE)
            throw new InvalidImageError('no frame header before the image data');
        if (FRAME_MARKERS.has(marker)) return frameSize(bytes, next);
        at = isStandalone(marker) ? next : skipSegment(bytes, next);
    }
    throw truncated();
};
