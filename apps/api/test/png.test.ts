/* PNG 檔頭 parser（移植自 903-player）：signature + 第一個 chunk 係 IHDR */
import { InvalidImageError } from '../src/assets/invalidImage';
import { parsePng } from '../src/assets/png';
import { pngOf, pngWithoutIhdr, textBytes } from './imageFixtures';

describe('parsePng', () => {
    it.each([
        [320, 320],
        [1200, 1200],
        [1, 70000],
    ])('should read %i×%i from IHDR', (width, height) => {
        expect(parsePng(pngOf(width, height))).toEqual({ width, height });
    });

    it.each<[string, Uint8Array]>([
        ['not a PNG', textBytes('<html>definitely not a png</html>')],
        ['a WebP', textBytes('RIFF\0\0\0\0WEBPVP8 ')],
        ['cut inside IHDR', pngOf(64, 64).subarray(0, 20)],
        ['IHDR that is not first', pngWithoutIhdr()],
        ['a zero width', pngOf(0, 64)],
        ['a zero height', pngOf(64, 0)],
        ['a width above 2^31 - 1', pngOf(0x80000000, 64)],
    ])('should throw InvalidImageError for %s', (_label, bytes) => {
        expect(() => parsePng(bytes)).toThrow(InvalidImageError);
    });

    it('should reject an IHDR that declares a length other than 13', () => {
        const bytes = pngOf(64, 64);
        bytes[11] = 12;
        expect(() => parsePng(bytes)).toThrow(/IHDR/);
    });
});
