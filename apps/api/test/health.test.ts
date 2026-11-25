import { zhHant } from '../src/i18n/zh-Hant';
import { Hono } from 'hono';
import { afterEach, vi } from 'vitest';
import pkg from '../package.json';
import { handleError, handleNotFound } from '../src/lib/http';
import { call } from './helpers';

afterEach(() => vi.restoreAllMocks());

describe('GET /api/health', () => {
    it('should answer without a session and report the api version', async () => {
        const response = await call('/api/health');
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ ok: true, version: pkg.version });
    });
});

describe('response headers', () => {
    it('should forbid framing and caching on /api and /auth responses', async () => {
        for (const path of ['/api/health', '/api/unknown', '/auth/unknown']) {
            const response = await call(path);
            expect(response.headers.get('x-frame-options'), path).toBe('DENY');
            expect(response.headers.get('content-security-policy'), path).toBe(
                "frame-ancestors 'none'",
            );
            expect(response.headers.get('cache-control'), path).toBe('no-store');
        }
    });

    // callback 嘅網址有 OAuth code + state：由嗰頁撳連結走唔可以帶住 Referer；JSON 唔畀瀏覽器估 type
    it('should send no referrer and forbid content sniffing on /api and /auth responses', async () => {
        const paths = ['/api/health', '/api/me', '/auth/google/callback?code=x&state=y'];
        for (const path of paths) {
            const response = await call(path);
            expect(response.headers.get('referrer-policy'), path).toBe('no-referrer');
            expect(response.headers.get('x-content-type-options'), path).toBe('nosniff');
        }
    });

    it('should keep every Worker response out of search engines', async () => {
        for (const path of ['/api/health', '/auth/unknown', '/catalog/v1/unknown', '/']) {
            expect((await call(path)).headers.get('x-robots-tag'), path).toBe('noindex');
        }
    });
});

describe('error format', () => {
    it('should answer 404 NOT_FOUND as JSON for an unknown route', async () => {
        const response = await call('/catalog/v1/unknown');
        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({
            error: { code: 'NOT_FOUND', message: zhHant.errors.notFound },
        });
    });

    // S-028：decode 咗嘅 path 可以有換行，寫入 log 會砌出一行假記錄；只記 route pattern
    it('should log the route pattern, never the request path', async () => {
        const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
        const app = new Hono().onError(handleError);
        app.get('/api/*', () => {
            throw new Error('boom');
        });
        const response = await app.request(
            'https://api.test/api/x%0A[auth]%20login%20ok%20for%20admin',
        );
        expect(response.status).toBe(500);
        const logged = errorLog.mock.calls.flat().join(' ');
        expect(logged).toContain('GET /api/*');
        expect(logged).not.toContain('login ok');
        expect(logged).not.toContain('\n');
    });

    it('should answer 500 INTERNAL without leaking or logging the error message', async () => {
        const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
        const app = new Hono().notFound(handleNotFound).onError(handleError);
        app.get('/boom', () => {
            throw new TypeError('token=super-secret someone@example.com');
        });
        const response = await app.request('https://api.test/boom?code=abc');
        expect(response.status).toBe(500);
        const body = await response.text();
        expect(JSON.parse(body)).toEqual({
            error: { code: 'INTERNAL', message: zhHant.errors.internal },
        });
        const logged = JSON.stringify(errorLog.mock.calls);
        expect(logged).toContain('TypeError');
        expect(logged).toContain('GET /boom');
        for (const leak of ['super-secret', 'someone@example.com', 'code=abc']) {
            expect(body).not.toContain(leak);
            expect(logged).not.toContain(leak);
        }
    });
});
