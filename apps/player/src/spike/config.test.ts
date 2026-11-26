import { DEFAULT_MEDIA_BASE, mediaBaseFrom } from './config';

describe('mediaBaseFrom', () => {
    it('should use the real bucket when the page has no media parameter', () => {
        expect(mediaBaseFrom('')).toBe(DEFAULT_MEDIA_BASE);
        expect(mediaBaseFrom('?other=1')).toBe(DEFAULT_MEDIA_BASE);
    });

    it('should use a loopback http or https media parameter and end it with a slash', () => {
        expect(mediaBaseFrom('?media=http://127.0.0.1:8123')).toBe('http://127.0.0.1:8123/');
        expect(mediaBaseFrom('?media=https%3A%2F%2Flocalhost%3A9000%2Fbucket%2F')).toBe(
            'https://localhost:9000/bucket/',
        );
        expect(mediaBaseFrom('?media=http://[::1]:8123/media')).toBe('http://[::1]:8123/media/');
    });

    // S-224：放咗上網嘅頁唔可以用 ?media= 指去任何主機，淨係本機（127.0.0.1、localhost、[::1]）
    it('should ignore a media parameter that is not on this machine', () => {
        expect(mediaBaseFrom('?media=https%3A%2F%2Fmedia.test%2Fbucket%2F')).toBe(
            DEFAULT_MEDIA_BASE,
        );
        expect(mediaBaseFrom('?media=http://127.0.0.1.evil.test/')).toBe(DEFAULT_MEDIA_BASE);
        expect(mediaBaseFrom('?media=http://localhost.evil.test/')).toBe(DEFAULT_MEDIA_BASE);
        expect(mediaBaseFrom('?media=http://user@evil.test/')).toBe(DEFAULT_MEDIA_BASE);
        expect(mediaBaseFrom('?media=http://192.168.1.2/')).toBe(DEFAULT_MEDIA_BASE);
    });

    it('should ignore a media parameter that is not an http(s) address', () => {
        expect(mediaBaseFrom('?media=javascript:alert(1)')).toBe(DEFAULT_MEDIA_BASE);
        expect(mediaBaseFrom('?media=not a url')).toBe(DEFAULT_MEDIA_BASE);
    });
});
