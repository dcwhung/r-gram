import { dominantColor, glowColor, NEUTRAL_ACCENT, NEUTRAL_GLOW } from './color';

const RGBA_CHANNELS = 4;
/** 砌一張純色「圖」：count 粒 pixel，每粒 [r, g, b, a] */
const pixelsOf = (...runs: [count: number, rgba: [number, number, number, number]][]) =>
    new Uint8ClampedArray(
        runs.flatMap(([count, rgba]) => Array.from({ length: count }, () => rgba).flat()),
    );

describe('glowColor', () => {
    // 期望值由設計稿 v16（_mockups_/r-gram/src/anim.js glowColor）計出嚟：同一個色相，飽和 0.95、亮度 0.56
    it.each([
        ['#2f8a4f', '#24f96f'],
        ['#d7263d', '#f92440'],
        ['#2b4bd6', '#244cf9'],
        ['#e8611a', '#f96e24'],
    ])('should push %s to the lit indicator colour %s', (accent, expected) => {
        expect(glowColor(accent)).toBe(expected);
    });

    it.each(['#6f6f6f', '#ffffff', '#000000'])(
        'should return the neutral glow for grey %s',
        (accent) => {
            expect(glowColor(accent)).toBe(NEUTRAL_GLOW);
        },
    );

    it('should accept upper-case hex', () => {
        expect(glowColor('#D7263D')).toBe('#f92440');
    });

    it.each(['d7263d', '#d72', '#gggggg', ''])('should throw on malformed colour %j', (accent) => {
        expect(() => glowColor(accent)).toThrow(RangeError);
    });
});

describe('dominantColor', () => {
    it('should return the hue of a single-colour cover, kept readable on white', () => {
        expect(dominantColor(pixelsOf([16, [255, 0, 0, 255]]))).toBe('#ff0000');
    });

    it('should darken a very light colour to the lightness ceiling', () => {
        // 淺粉紅（亮度 0.9）→ 亮度壓到 0.5，色相不變（紅）
        const result = dominantColor(pixelsOf([16, [255, 204, 204, 255]]));
        expect(result).toBe('#ff0000');
    });

    // 期望值同設計稿 dominantColor() 一致：太暗嘅色提到亮度下限 0.34，太灰嘅色提到飽和下限 0.45
    it('should lift a very dark colour to the lightness floor', () => {
        expect(dominantColor(pixelsOf([16, [0, 0, 40, 255]]))).toBe('#0000ad');
    });

    it('should lift a washed-out colour to the saturation floor', () => {
        expect(dominantColor(pixelsOf([16, [120, 100, 100, 255]]))).toBe('#a03d3d');
    });

    it('should pick the most colourful hue, not the most common pixel', () => {
        const result = dominantColor(pixelsOf([70, [255, 255, 255, 255]], [30, [0, 0, 255, 255]]));
        expect(result).toBe('#0000ff');
    });

    it('should return the neutral accent for a greyscale cover', () => {
        expect(dominantColor(pixelsOf([10, [40, 40, 40, 255]], [10, [200, 200, 200, 255]]))).toBe(
            NEUTRAL_ACCENT,
        );
    });

    it('should return the neutral accent when there are no pixels', () => {
        expect(dominantColor(new Uint8ClampedArray(0))).toBe(NEUTRAL_ACCENT);
    });

    it('should ignore fully transparent pixels', () => {
        const result = dominantColor(pixelsOf([90, [0, 255, 0, 0]], [10, [0, 0, 255, 255]]));
        expect(result).toBe('#0000ff');
    });

    it('should ignore a trailing partial pixel', () => {
        const pixels = new Uint8ClampedArray([...pixelsOf([4, [255, 0, 0, 255]]), 1, 2]);
        expect(pixels.length % RGBA_CHANNELS).not.toBe(0);
        expect(dominantColor(pixels)).toBe('#ff0000');
    });
});
