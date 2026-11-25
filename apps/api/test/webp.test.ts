/* WebP 檔頭 parser（移植自 903-player，S-795 嘅結構檢查照留） */
import { InvalidImageError } from '../src/assets/invalidImage';
import { parseWebp } from '../src/assets/webp';
import {
    chunk,
    riffOf,
    textBytes,
    vp8lPayload,
    vp8Payload,
    vp8xPayload,
    webpVp8,
    webpVp8l,
    webpVp8x,
} from './imageFixtures';

describe('parseWebp', () => {
    it('should read the dimensions of a lossy (VP8) image', () => {
        expect(parseWebp(webpVp8(1200, 1200))).toEqual({ width: 1200, height: 1200 });
    });

    it('should read width and height from separate fields of a non-square image', () => {
        expect(parseWebp(webpVp8(1216, 684))).toEqual({ width: 1216, height: 684 });
        expect(parseWebp(webpVp8l(1216, 684))).toEqual({ width: 1216, height: 684 });
        expect(parseWebp(webpVp8x(1216, 684))).toEqual({ width: 1216, height: 684 });
    });

    it('should ignore the VP8 scale bits above the 14-bit size', () => {
        const bytes = webpVp8(320, 320);
        bytes[27] = (bytes[27] ?? 0) | 0x40;
        expect(parseWebp(bytes)).toEqual({ width: 320, height: 320 });
    });

    it('should reject a file without the RIFF / WEBP magic', () => {
        const riffx = webpVp8(320, 320);
        riffx.set(textBytes('RIFX'), 0);
        expect(() => parseWebp(riffx)).toThrow(InvalidImageError);
        const wave = webpVp8(320, 320);
        wave.set(textBytes('WAVE'), 8);
        expect(() => parseWebp(wave)).toThrow(InvalidImageError);
    });

    it('should reject a truncated or empty file', () => {
        const full = webpVp8x(320, 320);
        expect(() => parseWebp(full.slice(0, 12))).toThrow(InvalidImageError);
        expect(() => parseWebp(full.slice(0, full.length - 2))).toThrow(InvalidImageError);
        expect(() => parseWebp(new Uint8Array())).toThrow(InvalidImageError);
    });

    it('should reject an unknown first chunk or a broken bitstream signature', () => {
        const unknown = webpVp8x(320, 320);
        unknown.set(textBytes('ALPH'), 12);
        expect(() => parseWebp(unknown)).toThrow(/chunk/);
        const lossy = webpVp8(320, 320);
        lossy[23] = 0;
        expect(() => parseWebp(lossy)).toThrow(/start code/);
        const lossless = webpVp8l(320, 320);
        lossless[20] = 0;
        expect(() => parseWebp(lossless)).toThrow(/signature/);
    });

    const header = chunk('VP8X', vp8xPayload(320, 320));
    const ALPHA = chunk('ALPH', [0, 0]);

    it('should reject a VP8X file without an image chunk', () => {
        expect(() => parseWebp(riffOf([header]))).toThrow(/image/);
        expect(() => parseWebp(riffOf([header, chunk('EXIF', [0, 0])]))).toThrow(/image/);
        expect(() => parseWebp(riffOf([header, ALPHA]))).toThrow(/image/);
    });

    it('should accept VP8X with ALPH + VP8, VP8L, metadata or an animation frame', () => {
        const size = { width: 320, height: 320 };
        const lossy = chunk('VP8 ', vp8Payload(320, 320));
        expect(parseWebp(riffOf([header, ALPHA, lossy]))).toEqual(size);
        expect(parseWebp(riffOf([header, chunk('VP8L', vp8lPayload(320, 320))]))).toEqual(size);
        expect(parseWebp(riffOf([header, chunk('ICCP', [1, 2, 3]), lossy]))).toEqual(size);
        expect(parseWebp(riffOf([header, chunk('ANMF', [0, 0])]))).toEqual(size);
    });

    it('should reject a VP8 frame that is not a keyframe', () => {
        const interframe = chunk('VP8 ', vp8Payload(320, 320, 0x31));
        expect(() => parseWebp(riffOf([interframe]))).toThrow(/keyframe/);
        expect(() => parseWebp(riffOf([header, interframe]))).toThrow(/keyframe/);
    });

    it('should reject a broken or overlong image chunk inside VP8X', () => {
        const broken = chunk('VP8L', vp8lPayload(320, 320));
        broken[8] = 0;
        expect(() => parseWebp(riffOf([header, broken]))).toThrow(/signature/);
        const long = chunk('VP8 ', vp8Payload(320, 320));
        long[4] = 0xff;
        expect(() => parseWebp(riffOf([header, long]))).toThrow(InvalidImageError);
    });

    it('should reject an image chunk shorter than its bitstream header', () => {
        expect(() => parseWebp(riffOf([chunk('VP8 ', [0x30, 0x01, 0x00])]))).toThrow(/truncated/);
    });
});
