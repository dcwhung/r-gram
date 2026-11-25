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
