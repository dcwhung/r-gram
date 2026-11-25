/* /api/* 守門：session（US-101「未登入時所有管理 API 回 401」）同 CSRF Origin 檢查 */
import { zhHant } from '../src/i18n/zh-Hant';
import { env } from 'cloudflare:test';
import { afterEach, vi } from 'vitest';
import { SESSION_TTL_MS } from '../src/config';
import { ADMIN, ORIGIN, call, loginCookie, sessionCount } from './helpers';

const UNAUTHORIZED = { error: { code: 'UNAUTHORIZED', message: zhHant.errors.unauthorized } };
const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

afterEach(() => vi.restoreAllMocks());

describe('session guard', () => {
    it('should keep /api/health public', async () => {
        expect((await call('/api/health')).status).toBe(200);
    });

    it('should answer 401 UNAUTHORIZED on every other /api path without a session', async () => {
        for (const path of [
            '/api/me',
            '/api/albums',
            '/api/albums/apollo-18',
            '/api/albums/order',
            '/api/catalog/rebuild',
            '/api/health/x',
            '/api',
        ]) {
            const response = await call(path);
            expect(response.status, path).toBe(401);
            expect(await response.json(), path).toEqual(UNAUTHORIZED);
        }
    });

    it('should answer 401 for every method without a session, with or without an Origin', async () => {
        const origins: Record<string, string>[] = [
            {},
            { origin: ORIGIN },
            { origin: 'https://evil.example' },
        ];
        for (const method of MUTATING_METHODS) {
            for (const headers of origins) {
                const response = await call('/api/albums', { method, headers });
                expect(response.status, method).toBe(401);
            }
        }
    });

    // W-016：歌曲 route 嘅守門靠註冊次序（B-019 ①）；逐條用佢自己嘅 method 試，GET 試唔到淨係收 POST／PUT 嘅 route
    it('should answer 401 UNAUTHORIZED on every track route without a session', async () => {
        const routes: [string, string][] = [
            ['POST', '/api/albums/apollo-18/tracks'],
            ['GET', '/api/tracks/x/text'],
            ['PUT', '/api/tracks/x/text'],
            ['PATCH', '/api/tracks/x'],
            ['DELETE', '/api/tracks/x'],
        ];
        for (const [method, path] of routes) {
            const response = await call(path, { method, headers: { origin: ORIGIN } });
            expect(response.status, `${method} ${path}`).toBe(401);
            expect(await response.json(), `${method} ${path}`).toEqual(UNAUTHORIZED);
        }
    });

    it('should return the email for a valid session', async () => {
        const response = await call('/api/me', { headers: { cookie: await loginCookie() } });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ email: ADMIN });
    });

    it('should treat an expired session as logged out', async () => {
        const cookie = await loginCookie(ADMIN, Date.now() - SESSION_TTL_MS - 1);
        const response = await call('/api/me', { headers: { cookie } });
        expect(response.status).toBe(401);
        expect(await response.json()).toEqual(UNAUTHORIZED);
    });

    it('should reject a session token that was never issued', async () => {
        const cookie = '__Host-session=not-a-real-token';
        expect((await call('/api/me', { headers: { cookie } })).status).toBe(401);
    });

    it('should not accept the session token under another cookie name', async () => {
        const cookie = (await loginCookie()).replace('__Host-session=', 'session=');
        expect((await call('/api/me', { headers: { cookie } })).status).toBe(401);
    });

    it('should refuse and delete a session whose email left ADMIN_EMAILS', async () => {
        const cookie = await loginCookie('former-admin@example.com');
        expect((await call('/api/me', { headers: { cookie } })).status).toBe(401);
        expect(await sessionCount()).toBe(0);
    });

    it('should follow ADMIN_EMAILS whatever its case and spacing', async () => {
        const cookie = await loginCookie();
        const bindings = { ...env, ADMIN_EMAILS: ' other@example.com , ADMIN@Example.com ' };
        const response = await call('/api/me', { headers: { cookie } }, bindings);
        expect(response.status).toBe(200);
    });

    it('should answer 404 NOT_FOUND for an unknown /api path once logged in', async () => {
        const response = await call('/api/unknown', { headers: { cookie: await loginCookie() } });
        expect(response.status).toBe(404);
        expect(await response.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
    });

    it('should answer 500 INTERNAL when the session lookup fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const brokenDb = {
            prepare: () => {
                throw new Error('D1 is down');
            },
        } as unknown as D1Database;
        const cookie = await loginCookie();
        const response = await call('/api/me', { headers: { cookie } }, { ...env, DB: brokenDb });
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            error: { code: 'INTERNAL', message: zhHant.errors.internal },
        });
        expect(response.headers.get('cache-control')).toBe('no-store');
    });
});

describe('CSRF Origin check', () => {
    const send = async (method: string, headers: Record<string, string>) =>
        call('/api/albums', { method, headers: { cookie: await loginCookie(), ...headers } });

    it('should reject a mutating request without an Origin header', async () => {
        for (const method of MUTATING_METHODS) {
            const response = await send(method, {});
            expect(response.status, method).toBe(403);
            expect(await response.json(), method).toEqual({
                error: { code: 'FORBIDDEN_ORIGIN', message: zhHant.errors.forbiddenOrigin },
            });
        }
    });

    it('should reject a mutating request from another origin', async () => {
        const others = ['https://evil.example', `${ORIGIN}.evil.example`, 'null', `${ORIGIN}/`];
        for (const origin of others) {
            expect((await send('POST', { origin })).status, origin).toBe(403);
        }
    });

    it('should let a same-origin mutating request through to the router', async () => {
        // 過咗兩道守門先去到 POST /api/albums（T-022）：冇 body → 400 VALIDATION_ERROR
        const response = await send('POST', { origin: ORIGIN });
        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    });

    it('should not ask read-only requests for an Origin', async () => {
        expect((await send('GET', {})).status).toBe(200);
    });
});
