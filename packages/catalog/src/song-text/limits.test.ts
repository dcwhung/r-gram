import { byteLength, charCount } from './limits';

describe('byteLength', () => {
    it('should count UTF-8 bytes for one to four byte characters', () => {
        expect(byteLength('')).toBe(0);
        expect(byteLength('a')).toBe(1);
        expect(byteLength('é')).toBe(2);
        expect(byteLength('歌')).toBe(3);
        expect(byteLength('😀')).toBe(4);
        expect(byteLength('6號 Live')).toBe(9);
    });

    it('should count a lone surrogate as the three-byte replacement character', () => {
        expect(byteLength('\uD800')).toBe(3);
    });
});

describe('charCount', () => {
    it('should count code points, so one emoji is one character', () => {
        expect(charCount('一早地下鐵')).toBe(5);
        expect(charCount('😀a')).toBe(2);
    });
});
