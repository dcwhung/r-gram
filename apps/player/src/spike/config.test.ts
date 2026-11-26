import { DEFAULT_MEDIA_BASE, mediaBaseFrom } from './config';

describe('mediaBaseFrom', () => {
    it('should use the real bucket when the page has no media parameter', () => {
        expect(mediaBaseFrom('')).toBe(DEFAULT_MEDIA_BASE);
        expect(mediaBaseFrom('?other=1')).toBe(DEFAULT_MEDIA_BASE);
    });

    it('should use an http or https media parameter and end it with a slash', () => {
        expect(mediaBaseFrom('?media=http://127.0.0.1:8123')).toBe('http://127.0.0.1:8123/');
        expect(mediaBaseFrom('?media=https%3A%2F%2Fmedia.test%2Fbucket%2F')).toBe(
            'https://media.test/bucket/',
        );
    });

    it('should ignore a media parameter that is not an http(s) address', () => {
        expect(mediaBaseFrom('?media=javascript:alert(1)')).toBe(DEFAULT_MEDIA_BASE);
        expect(mediaBaseFrom('?media=not a url')).toBe(DEFAULT_MEDIA_BASE);
    });
});
