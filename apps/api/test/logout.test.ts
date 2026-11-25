/* POST /auth/logout（API-003）同成個 session 生命週期（US-101「可以登出；session 有期限，過期要重新登入」） */
import { afterEach, vi } from 'vitest';
import {
    ADMIN,
    ORIGIN,
    call,
    cookiePair,
    loginCookie,
    sessionCount,
    setCookieLine,
} from './helpers';
import { callback, googleClaims, mockGoogle, start } from './oauthHelpers';

const SESSION = '__Host-session';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const logout = (headers: Record<string, string>) =>
    call('/auth/logout', { method: 'POST', headers });

const me = (cookie: string) => call('/api/me', { headers: { cookie } });

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('POST /auth/logout', () => {
    it('should delete the session and clear the cookie', async () => {
        const cookie = await loginCookie();
        const response = await logout({ cookie, origin: ORIGIN });
        expect(response.status).toBe(204);
        const line = setCookieLine(response, SESSION) ?? '';
        expect(line).toMatch(/^__Host-session=;/);
        expect(line).toMatch(/; Max-Age=0(;|$)/);
        expect(line).toMatch(/; Secure/i);
        expect(line).toMatch(/; Path=\/(;|$)/);
        expect(await sessionCount()).toBe(0);
        expect((await me(cookie)).status).toBe(401);
    });

    it('should end only the session of that browser', async () => {
        const here = await loginCookie();
        const elsewhere = await loginCookie();
        await logout({ cookie: here, origin: ORIGIN });
        expect((await me(here)).status).toBe(401);
        expect((await me(elsewhere)).status).toBe(200);
    });

    it('should refuse a cross-site logout and keep the session', async () => {
        const cookie = await loginCookie();
        const crossSite: Record<string, string>[] = [
            { cookie, origin: 'https://evil.example' },
            { cookie },
        ];
        for (const headers of crossSite) {
            const response = await logout(headers);
            expect(response.status).toBe(403);
            expect(await response.json()).toMatchObject({ error: { code: 'FORBIDDEN_ORIGIN' } });
            expect(setCookieLine(response, SESSION)).toBeUndefined();
        }
        expect((await me(cookie)).status).toBe(200);
    });

    it('should succeed without a session too, so an expired admin can still log out', async () => {
        const response = await logout({ origin: ORIGIN });
        expect(response.status).toBe(204);
        expect(cookiePair(response, SESSION)).toBe('__Host-session=');
    });

    it('should not log out on GET', async () => {
        const cookie = await loginCookie();
        const response = await call('/auth/logout', { headers: { cookie } });
        expect(response.status).toBe(404);
        expect((await me(cookie)).status).toBe(200);
    });
});

describe('session lifecycle through the real login', () => {
    const loginThroughGoogle = async () => {
        const { cookie, state } = await start();
        mockGoogle(googleClaims(ADMIN));
        return cookiePair(await callback(state, cookie), SESSION) ?? '';
    };

    it('should log in, use the API, log out, and need a new login afterwards', async () => {
        const cookie = await loginThroughGoogle();
        expect((await me(cookie)).status).toBe(200);
        expect((await logout({ cookie, origin: ORIGIN })).status).toBe(204);
        expect((await me(cookie)).status).toBe(401);
    });

    it('should expire 30 days after login and clean the row up at the next login', async () => {
        const cookie = await loginThroughGoogle();
        const loggedInAt = Date.now();
        vi.useFakeTimers({ now: loggedInAt + THIRTY_DAYS_MS - 60_000, toFake: ['Date'] });
        expect((await me(cookie)).status).toBe(200);
        vi.setSystemTime(loggedInAt + THIRTY_DAYS_MS + 60_000);
        expect((await me(cookie)).status).toBe(401);
        expect(await sessionCount()).toBe(1);
        const renewed = await loginThroughGoogle();
        expect(await sessionCount()).toBe(1);
        expect((await me(renewed)).status).toBe(200);
        expect((await me(cookie)).status).toBe(401);
    });
});
