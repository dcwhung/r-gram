/* 登入後返回嘅 path（US-101「登入後返回原本想去嘅頁」）：只收同站 path，防 open redirect */
import { safeNext } from '../src/auth/next';

const ORIGIN = 'https://api.example.com';
const next = (value: unknown) => safeNext(value, ORIGIN);

describe('safeNext', () => {
    it('should keep a same-site path with its query and hash', () => {
        const fine = [
            '/',
            '/albums',
            '/albums/apollo-18?tab=tracks#track-3',
            '/albums/%E6%A8%82',
            '/a..b',
            '/.hidden',
            '/albums?q=../auth',
            '/albums#/../auth',
            '/albums?next=https://evil.example',
        ];
        for (const value of fine) expect(next(value), value).toBe(value);
    });

    it('should refuse anything that could leave the site', () => {
        const unsafe = [
            '//evil.example',
            '///evil.example',
            '/\\evil.example',
            '/\\/evil.example',
            '\\\\evil.example',
            'https://evil.example/x',
            'https://api.example.com/albums',
            'evil.example',
            'javascript:alert(1)',
            ' /albums',
            '',
        ];
        for (const value of unsafe) expect(next(value), value).toBeUndefined();
    });

    it('should refuse control characters (header injection, stripped by browsers)', () => {
        const unsafe = [
            '/ok\nLocation: x',
            '/ok\r\nSet-Cookie: a=b',
            '/tab\there',
            '/\t/evil.example',
        ];
        for (const value of unsafe) expect(next(value), JSON.stringify(value)).toBeUndefined();
        expect(next('/nul\u0000')).toBeUndefined();
        expect(next('/del\u007f')).toBeUndefined();
    });

    it('should refuse /auth paths so a login cannot loop back into login', () => {
        for (const value of ['/auth', '/auth/', '/auth/google/start', '/auth/logout?x=1']) {
            expect(next(value), value).toBeUndefined();
        }
        expect(next('/authors')).toBe('/authors');
    });

    // S-026：router 會先 decode path，所以 percent-encode 咗嘅 /auth 一樣會行返登入
    it('should refuse /auth paths that are percent-encoded', () => {
        for (const value of [
            '/%61uth/google/start',
            '/%61%75%74%68',
            '/a%75th/logout',
            '/auth%2Fgoogle',
        ]) {
            expect(next(value), value).toBeUndefined();
        }
    });

    it('should refuse a path with a malformed percent-escape', () => {
        expect(next('/albums/%E6%A8')).toBeUndefined();
        expect(next('/albums/%zz')).toBeUndefined();
    });

    // S-027：非 ASCII 字元由 URL parser 編碼一次，redirect 時唔會再被編碼多一次
    it('should return non-ASCII paths percent-encoded once', () => {
        expect(next('/albums/樂')).toBe('/albums/%E6%A8%82');
        expect(next('/albums/%E6%A8%82?q=樂#歌')).toBe('/albums/%E6%A8%82?q=%E6%A8%82#%E6%AD%8C');
    });

    // S-027：上限按 byte 計（state cookie 有 4096 byte 上限），唔係按字元
    it('should limit the length in bytes, not characters', () => {
        const ASCII_AT_LIMIT = `/${'a'.repeat(2047)}`;
        const CJK_OVER_LIMIT = `/${'樂'.repeat(700)}`;
        expect(next(ASCII_AT_LIMIT)).toBe(ASCII_AT_LIMIT);
        expect(next(`${ASCII_AT_LIMIT}a`)).toBeUndefined();
        expect(CJK_OVER_LIMIT.length).toBeLessThan(2048);
        expect(next(CJK_OVER_LIMIT)).toBeUndefined();
    });

    it('should refuse dot-segments, encoded or not (browsers normalise them)', () => {
        const dotted = [
            '/x/../auth/google/start',
            '/x/%2e%2e/auth/me',
            '/x/.%2E/auth',
            '/./auth/me',
            '/%2e/auth',
            '/albums/..',
            '/albums/.',
        ];
        for (const value of dotted) expect(next(value), value).toBeUndefined();
    });

    it('should refuse values that are not strings or are too long', () => {
        for (const value of [undefined, null, 42, ['/albums'], { path: '/albums' }]) {
            expect(next(value)).toBeUndefined();
        }
        expect(next(`/${'a'.repeat(2048)}`)).toBeUndefined();
        expect(next(`/${'a'.repeat(2047)}`)).toHaveLength(2048);
    });
});
