/* JPEG 檔頭 parser：由 SOI 起逐個 segment 行，第一個 SOF 讀闊高；SOS 之前冇 SOF = 唔合規 */
import { InvalidImageError } from '../src/assets/invalidImage';
import { parseJpeg } from '../src/assets/jpeg';
import {
    jpegFrom,
    jpegOf,
    jpegWithoutFrame,
    segment,
    sofSegment,
    SOF_PROGRESSIVE,
    textBytes,
} from './imageFixtures';

describe('parseJpeg', () => {
    it('should read the size from a baseline frame header', () => {
        expect(parseJpeg(jpegOf(1200, 1200))).toEqual({ width: 1200, height: 1200 });
    });

    it('should read width and height from separate fields of a non-square image', () => {
        expect(parseJpeg(jpegOf(640, 480))).toEqual({ width: 640, height: 480 });
    });

    it('should read a progressive frame header too', () => {
        expect(parseJpeg(jpegOf(320, 320, 0, SOF_PROGRESSIVE))).toEqual({
            width: 320,
            height: 320,
        });
    });

    it('should skip other segments, fill bytes and standalone markers before the frame', () => {
        const exif = segment(0xe1, [...textBytes('Exif'), 0, 0, 1, 2, 3, 4]);
        const fill = [0xff];
        const restart = [0xff, 0xd0];
        const bytes = jpegFrom([exif, fill, restart, sofSegment(320, 320)]);
        expect(parseJpeg(bytes)).toEqual({ width: 320, height: 320 });
    });

    it('should not take a DHT segment (0xC4) for a frame header', () => {
        const huffman = segment(0xc4, [0, 1, 2, 3, 4, 5, 6, 7]);
        expect(parseJpeg(jpegFrom([huffman, sofSegment(320, 320)]))).toEqual({
            width: 320,
            height: 320,
        });
    });

    it.each<[string, Uint8Array]>([
        ['not a JPEG', textBytes('<html>definitely not a jpeg</html>')],
        ['an empty file', new Uint8Array()],
        ['only the start marker', new Uint8Array([0xff, 0xd8, 0xff])],
        ['image data without a frame header', jpegWithoutFrame()],
        ['a byte that is not a marker', jpegFrom([[0x00, 0x01]])],
        ['a zero height (DNL)', jpegOf(320, 0)],
        ['a zero width', jpegOf(0, 320)],
        ['an end marker before the frame', jpegFrom([[0xff, 0xd9]])],
        ['a segment length below 2', jpegFrom([[0xff, 0xe0, 0x00, 0x01]])],
    ])('should throw InvalidImageError for %s', (_label, bytes) => {
        expect(() => parseJpeg(bytes)).toThrow(InvalidImageError);
    });

    it('should reject a file cut inside the frame header', () => {
        const full = jpegOf(320, 320);
        const sofAt = full.indexOf(0xc0) - 1;
        expect(() => parseJpeg(full.subarray(0, sofAt + 6))).toThrow(/truncated/);
        expect(() => parseJpeg(full.subarray(0, sofAt + 3))).toThrow(/truncated/);
    });

    it('should reject a segment that runs past the end of the file', () => {
        const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x10, 0x00, 1, 2]);
        expect(() => parseJpeg(bytes)).toThrow(/truncated/);
    });
});
