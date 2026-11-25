/* GET /auth/google/callback（API-002）：換 token、驗 ID token、對白名單、開 session（US-101） */
import { env } from 'cloudflare:test';
import { afterEach, vi } from 'vitest';
import { sha256Hex } from '../src/lib/crypto';
import { ADMIN, ORIGIN, call, cookiePair, sessionCount, setCookieLine } from './helpers';
import {
    OAUTH_COOKIE_NAME,
    callback,
    encodeJson,
    googleClaims,
    mockGoogle,
    splitStateCookie,
    start,
} from './oauthHelpers';

const SESSION = '__Host-session';
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;
const ELEVEN_MINUTES_MS = 11 * 60_000;
const OUTSIDER = 'someone@gmail.com';

/** 由 start 行到 callback：Google 回指定 claims */
const login = async (claims: Record<string, unknown>, query = '', bindings = env) => {
    const { cookie, state } = await start(query, bindings);
    const bodies = mockGoogle(claims);
    const response = await callback(state, cookie, bindings);
    return { response, bodies, cookie, state };
};

const expectNoSession = async (response: Response) => {
    expect(cookiePair(response, SESSION)).toBeUndefined();
    expect(await sessionCount()).toBe(0);
};

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('GET /auth/google/callback: successful login', () => {
    it('should exchange the code with the PKCE verifier from the cookie', async () => {
        const { response, bodies, cookie } = await login(googleClaims(ADMIN));
        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toBe('/');
        expect(bodies).toHaveLength(1);
        expect(Object.fromEntries(bodies[0] ?? [])).toEqual({
            code: 'auth-code',
            code_verifier: splitStateCookie(cookie).value.verifier,
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            redirect_uri: `${ORIGIN}/auth/google/callback`,
            grant_type: 'authorization_code',
        });
    });

    it('should set a 30-day __Host-session cookie: HttpOnly, Secure, SameSite=Lax, Path=/', async () => {
        const { response } = await login(googleClaims(ADMIN));
        const line = setCookieLine(response, SESSION) ?? '';
        expect(line).toMatch(/^__Host-session=[\w-]{43};/);
        expect(line).toMatch(/; HttpOnly/i);
        expect(line).toMatch(/; Secure/i);
        expect(line).toMatch(/; SameSite=Lax/i);
        expect(line).toMatch(/; Path=\/(;|$)/);
        expect(line).toMatch(new RegExp(`; Max-Age=${THIRTY_DAYS_SECONDS}(;|$)`));
        expect(line).not.toMatch(/Domain=/i);
    });

    it('should open a session that /api/me accepts, storing only the SHA-256 of the token', async () => {
        const { response } = await login(googleClaims(ADMIN));
        const pair = cookiePair(response, SESSION) ?? '';
        const me = await call('/api/me', { headers: { cookie: pair } });
        expect(await me.json()).toEqual({ email: ADMIN });
        const rows = await env.DB.prepare('SELECT token_hash, email FROM sessions').all();
        const token = pair.slice(pair.indexOf('=') + 1);
        expect(rows.results).toEqual([{ token_hash: await sha256Hex(token), email: ADMIN }]);
    });

    it('should use the state cookie once: every callback clears it', async () => {
        const { response } = await login(googleClaims(ADMIN));
        const line = setCookieLine(response, OAUTH_COOKIE_NAME) ?? '';
        expect(line).toMatch(/^__Host-oauth=;/);
        expect(line).toMatch(/; Max-Age=0(;|$)/);
        expect(line).toMatch(/; Secure/i);
        expect(line).toMatch(/; Path=\/(;|$)/);
    });

    it('should match the allowlist whatever the case and spacing on either side', async () => {
        const bindings = { ...env, ADMIN_EMAILS: ' other@example.com , ADMIN@Example.com ' };
        const { response } = await login(googleClaims('Admin@EXAMPLE.com'), '', bindings);
        expect(response.status).toBe(302);
        const stored = await env.DB.prepare('SELECT email FROM sessions').first('email');
        expect(stored).toBe(ADMIN);
    });
});

describe('GET /auth/google/callback: state and PKCE checks', () => {
    const expectLoginExpired = async (response: Response, fetched: unknown[]) => {
        expect(response.status).toBe(400);
        expect(response.headers.get('content-type')).toMatch(/^text\/html/);
        expect(await response.text()).toContain('登入已逾時或無效，請重新登入。');
        expect(fetched).toHaveLength(0);
        await expectNoSession(response);
    };

    it('should reject a state that does not match the cookie, without calling Google', async () => {
        const { cookie } = await start();
        const bodies = mockGoogle(googleClaims(ADMIN));
        await expectLoginExpired(await callback('forged-state', cookie), bodies);
    });

    it('should reject a callback from a browser that never started the login', async () => {
        const { state } = await start();
        const bodies = mockGoogle(googleClaims(ADMIN));
        await expectLoginExpired(await callback(state, ''), bodies);
    });

    it('should reject the state cookie of another login', async () => {
        const first = await start();
        const second = await start();
        const bodies = mockGoogle(googleClaims(ADMIN));
        await expectLoginExpired(await callback(first.state, second.cookie), bodies);
    });

    it('should reject a tampered state cookie', async () => {
        const { cookie, state } = await start();
        const bodies = mockGoogle(googleClaims(ADMIN));
        await expectLoginExpired(await callback(state, `${cookie}x`), bodies);
    });

    it('should reject an expired state cookie', async () => {
        const { cookie, state } = await start();
        const bodies = mockGoogle(googleClaims(ADMIN));
        vi.useFakeTimers({ now: Date.now() + ELEVEN_MINUTES_MS, toFake: ['Date'] });
        await expectLoginExpired(await callback(state, cookie), bodies);
    });

    it('should reject a callback without a code', async () => {
        const { cookie, state } = await start();
        const bodies = mockGoogle(googleClaims(ADMIN));
        const response = await call(`/auth/google/callback?state=${state}`, {
            headers: { cookie },
        });
        await expectLoginExpired(response, bodies);
    });

    it('should clear the state cookie even when the callback is refused', async () => {
        const { cookie } = await start();
        const response = await callback('forged-state', cookie);
        expect(setCookieLine(response, OAUTH_COOKIE_NAME)).toMatch(/^__Host-oauth=;/);
    });

    it('should not open a session when a used code is replayed and Google refuses it', async () => {
        const { cookie, state } = await login(googleClaims(ADMIN));
        await env.DB.prepare('DELETE FROM sessions').run();
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        mockGoogle({}, 400);
        const replay = await callback(state, cookie);
        expect(replay.status).toBe(502);
        await expectNoSession(replay);
    });
});

describe('GET /auth/google/callback: accounts without access', () => {
    it('should show the no-permission page (403) and open no session', async () => {
        const { response } = await login(googleClaims(OUTSIDER));
        expect(response.status).toBe(403);
        const page = await response.text();
        expect(page).toContain('<html lang="zh-Hant">');
        expect(page).toContain('沒有權限');
        expect(page).toContain('此帳戶沒有管理權限。');
        expect(page).toContain(OUTSIDER);
        expect(page).toContain('href="/auth/google/start?select_account=1"');
        expect(page).toContain('使用其他 Google 帳戶登入');
        await expectNoSession(response);
    });

    it('should serve that page self-contained under a strict CSP', async () => {
        const { response } = await login(googleClaims(OUTSIDER));
        const policy = response.headers.get('content-security-policy') ?? '';
        expect(policy).toContain("default-src 'none'");
        expect(policy).toContain("frame-ancestors 'none'");
        expect(response.headers.get('x-frame-options')).toBe('DENY');
        expect(response.headers.get('cache-control')).toBe('no-store');
        const page = await response.text();
        expect(page).not.toMatch(/<script|<link|<img|https?:\/\//i);
    });

    it('should escape the email shown on the page', async () => {
        const { response } = await login(googleClaims('<b>x@y.z'));
        const page = await response.text();
        expect(page).not.toContain('<b>x@y.z');
        expect(page).toContain('&lt;b&gt;x@y.z');
    });

    it('should refuse an unverified email even if it is on the allowlist', async () => {
        const { response } = await login(googleClaims(ADMIN, { email_verified: false }));
        expect(response.status).toBe(403);
        await expectNoSession(response);
    });

    it('should refuse an allowlisted email when email_verified is not exactly true', async () => {
        for (const verified of ['true', 1, undefined]) {
            const { response } = await login(googleClaims(ADMIN, { email_verified: verified }));
            expect(response.status, String(verified)).toBe(403);
            await expectNoSession(response);
        }
    });
});

describe('GET /auth/google/callback: Google failures', () => {
    const expectLoginFailed = async (response: Response) => {
        expect(response.status).toBe(502);
        expect(await response.text()).toContain('未能透過 Google 登入，請稍後再試。');
        await expectNoSession(response);
    };

    it.each([
        ['issued for another client', { aud: 'someone-else' }],
        ['from another issuer', { iss: 'https://accounts.evil.example' }],
        ['without an email', { email: undefined }],
    ])('should refuse an id_token %s', async (_, extra) => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { response } = await login(googleClaims(ADMIN, extra));
        await expectLoginFailed(response);
    });

    it('should accept the issuer without scheme that Google also uses', async () => {
        const { response } = await login(googleClaims(ADMIN, { iss: 'accounts.google.com' }));
        expect(response.status).toBe(302);
    });

    // S-029：OIDC Core 3.1.3.7：過咗期嘅 id_token 唔收
    it.each([
        ['expired', { exp: 1 }],
        ['without exp', { exp: undefined }],
        ['with a non-numeric exp', { exp: 'tomorrow' }],
    ])('should refuse an id_token that is %s', async (_label, extra) => {
        const { response } = await login(googleClaims('admin@example.com', extra));
        expect(response.status).toBe(502);
        await expectNoSession(response);
    });

    it('should answer 502 (not 500) when the token endpoint is unreachable', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { cookie, state } = await start();
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network down'));
        await expectLoginFailed(await callback(state, cookie));
    });

    it('should fail closed when Google rejects the code', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { cookie, state } = await start();
        mockGoogle(googleClaims(ADMIN), 400);
        await expectLoginFailed(await callback(state, cookie));
    });

    it.each([
        ['is not JSON', new Response('<html>oops</html>')],
        ['has no id_token', Response.json({ access_token: 'x' })],
        ['has an id_token that is not base64', Response.json({ id_token: 'header.!!!.sig' })],
        [
            'has an id_token that is not JSON',
            Response.json({ id_token: `h.${btoa('not json')}.s` }),
        ],
        [
            'has an id_token that is not an object',
            Response.json({ id_token: `h.${encodeJson(7)}.s` }),
        ],
    ])('should answer 502 when the token response %s', async (_, tokenResponse) => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { cookie, state } = await start();
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(tokenResponse);
        await expectLoginFailed(await callback(state, cookie));
    });

    it('should answer 500 without a session cookie when the session cannot be stored', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const { cookie, state } = await start();
        mockGoogle(googleClaims(ADMIN));
        const brokenDb = {
            prepare: () => {
                throw new Error('D1 is down');
            },
        } as unknown as D1Database;
        const response = await callback(state, cookie, { ...env, DB: brokenDb });
        expect(response.status).toBe(500);
        expect(await response.json()).toMatchObject({ error: { code: 'INTERNAL' } });
        await expectNoSession(response);
    });

    it('should send the user back home when they cancel on Google', async () => {
        const { cookie } = await start();
        const bodies = mockGoogle(googleClaims(ADMIN));
        const response = await call('/auth/google/callback?error=access_denied', {
            headers: { cookie },
        });
        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toBe('/');
        expect(setCookieLine(response, OAUTH_COOKIE_NAME)).toMatch(/^__Host-oauth=;/);
        expect(bodies).toHaveLength(0);
        await expectNoSession(response);
    });
});

describe('auth logging', () => {
    it('should never log emails, codes, verifiers or secrets', async () => {
        const logs = (['log', 'info', 'warn', 'error'] as const).map((level) =>
            vi.spyOn(console, level).mockImplementation(() => {}),
        );
        // 三條會寫 log 嘅路：白名單外、Google 回錯嘅 token、state 唔啱
        const denied = await login(googleClaims(OUTSIDER));
        const failed = await login(googleClaims(ADMIN, { aud: 'someone-else' }));
        await callback('forged-state', failed.cookie);
        const logged = JSON.stringify(logs.flatMap((spy) => spy.mock.calls));
        expect(logged).not.toBe('[]');
        const secrets = [
            OUTSIDER,
            ADMIN,
            'auth-code',
            env.GOOGLE_CLIENT_SECRET,
            env.SESSION_SECRET,
            String(splitStateCookie(denied.cookie).value.verifier),
            String(splitStateCookie(failed.cookie).value.verifier),
            failed.state,
        ];
        for (const secret of secrets) expect(logged).not.toContain(secret);
    });

    it('should log why a Google login failed, as a fixed reason', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        await login(googleClaims(ADMIN, { aud: 'someone-else' }));
        expect(JSON.stringify(warn.mock.calls)).toContain('bad audience');
    });
});

/** US-101「登入後返回原本想去嘅頁」：next 放喺 HMAC 簽名嘅 state cookie，callback 先再用 */
describe('return to the page the admin wanted (next)', () => {
    const loginWith = async (next: string) => {
        const { response } = await login(googleClaims(ADMIN), `?next=${encodeURIComponent(next)}`);
        expect(response.status).toBe(302);
        return response.headers.get('location');
    };

    it('should go back to a same-site path with its query and hash', async () => {
        const next = '/albums/apollo-18?tab=tracks#track-3';
        expect(await loginWith(next)).toBe(next);
    });

    it('should fall back to / for anything that could leave the site or loop into /auth', async () => {
        const unsafe = ['//evil.example', '/\\evil.example', 'https://evil.example/x', '/auth/x'];
        for (const next of [...unsafe, '/x/../auth', '/ok\nLocation: x', '']) {
            expect(await loginWith(next), next).toBe('/');
        }
    });

    it('should keep next out of reach of tampering (signed with the state)', async () => {
        const { cookie, state } = await start('?next=%2Falbums');
        const { signature, value } = splitStateCookie(cookie);
        const forged = encodeJson({ ...value, next: '//evil.example' });
        const bodies = mockGoogle(googleClaims(ADMIN));
        const response = await callback(state, `${OAUTH_COOKIE_NAME}=${forged}.${signature}`);
        expect(response.status).toBe(400);
        expect(bodies).toHaveLength(0);
    });

    it('should still send a cancelled login home', async () => {
        const { cookie } = await start('?next=%2Falbums');
        const response = await call('/auth/google/callback?error=access_denied', {
            headers: { cookie },
        });
        expect(response.headers.get('location')).toBe('/');
    });
});
