import { mediaUrl } from './mediaUrl';

describe('mediaUrl', () => {
    it('should encode every path segment but keep the slashes', () => {
        expect(mediaUrl('https://media.example/', 'apollo-18/01 一早地下鐵.m4a')).toBe(
            'https://media.example/apollo-18/01%20%E4%B8%80%E6%97%A9%E5%9C%B0%E4%B8%8B%E9%90%B5.m4a',
        );
    });

    it('should encode characters that would otherwise change the URL', () => {
        expect(
            mediaUrl('https://media.example/', 'rubberband-concert-1/03 Hero #1 (Live)?.mp4'),
        ).toBe('https://media.example/rubberband-concert-1/03%20Hero%20%231%20(Live)%3F.mp4');
    });

    it('should encode a percent sign so the key is not decoded twice', () => {
        expect(mediaUrl('https://media.example/', 'a/100%.m4a')).toBe(
            'https://media.example/a/100%25.m4a',
        );
    });
});
