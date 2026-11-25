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
            error: { code: 'NOT_FOUND', message: 'not found' },
        });
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
            error: { code: 'INTERNAL', message: 'internal error' },
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
