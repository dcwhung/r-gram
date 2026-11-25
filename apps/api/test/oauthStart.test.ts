/* GET /auth/google/start（API-001）：PKCE + state，綁喺瀏覽器嘅短期 cookie */
import { env } from 'cloudflare:test';
import { newOAuthState, openOAuthState, sealOAuthState } from '../src/auth/oauthState';
import { hmacSign, sha256Base64Url } from '../src/lib/crypto';
import { ORIGIN, setCookieLine } from './helpers';
import { OAUTH_COOKIE_NAME, encodeJson, splitStateCookie, start } from './oauthHelpers';

const SECRET = env.SESSION_SECRET;
const NOW = Date.UTC(2026, 10, 25);
const TEN_MINUTES_MS = 10 * 60 * 1000;

describe('GET /auth/google/start', () => {
    it('should redirect to Google with PKCE S256, openid email scope and our callback', async () => {
        const { response, location } = await start();
        expect(response.status).toBe(302);
        expect(location.origin + location.pathname).toBe(
            'https://accounts.google.com/o/oauth2/v2/auth',
        );
        expect(Object.fromEntries(location.searchParams)).toMatchObject({
            client_id: env.GOOGLE_CLIENT_ID,
            redirect_uri: `${ORIGIN}/auth/google/callback`,
            response_type: 'code',
            scope: 'openid email',
            code_challenge_method: 'S256',
        });
        expect(location.searchParams.get('code_challenge')).toMatch(/^[\w-]{43}$/);
        expect(location.searchParams.get('state')).toMatch(/^[\w-]{22,}$/);
        expect(location.searchParams.has('prompt')).toBe(false);
    });

    it('should bind state and verifier to the browser in a short-lived __Host- cookie', async () => {
        const { response } = await start();
        const line = setCookieLine(response, OAUTH_COOKIE_NAME) ?? '';
        expect(line).toMatch(/; HttpOnly/i);
        expect(line).toMatch(/; Secure/i);
        expect(line).toMatch(/; SameSite=Lax/i);
        expect(line).toMatch(/; Path=\/(;|$)/);
        expect(line).toMatch(/; Max-Age=600(;|$)/);
        expect(line).not.toMatch(/Domain=/i);
    });

    it('should send Google the state and the S256 challenge of the verifier kept in the cookie', async () => {
        const { location, cookie, state } = await start();
        const { value } = splitStateCookie(cookie);
        expect(value.state).toBe(state);
        expect(String(value.verifier)).toMatch(/^[\w-]{43}$/);
        expect(location.searchParams.get('code_challenge')).toBe(
            await sha256Base64Url(String(value.verifier)),
        );
    });

    it('should keep the verifier and the client secret out of the redirect', async () => {
        const { location, cookie } = await start();
        const { value } = splitStateCookie(cookie);
        expect(location.href).not.toContain(String(value.verifier));
        expect(location.href).not.toContain(env.GOOGLE_CLIENT_SECRET);
    });

    it('should use a fresh state and verifier for every login', async () => {
        const first = splitStateCookie((await start()).cookie).value;
        const second = splitStateCookie((await start()).cookie).value;
        expect(second.state).not.toBe(first.state);
        expect(second.verifier).not.toBe(first.verifier);
    });

    it('should ask Google to pick an account when switching account', async () => {
        const { location } = await start('?select_account=1');
        expect(location.searchParams.get('prompt')).toBe('select_account');
    });

    it('should remember a same-site next path and drop an unsafe one', async () => {
        const kept = await start(`?next=${encodeURIComponent('/albums/apollo-18?tab=tracks')}`);
        expect(splitStateCookie(kept.cookie).value.next).toBe('/albums/apollo-18?tab=tracks');
        const dropped = await start(`?next=${encodeURIComponent('//evil.example')}`);
        expect(splitStateCookie(dropped.cookie).value).not.toHaveProperty('next');
    });
});

describe('OAuth state cookie', () => {
    const sealed = async (next?: string) => {
        const value = newOAuthState(NOW, next);
        return { value, cookie: await sealOAuthState(SECRET, value) };
    };
    const open = (cookie: string | undefined, state: string | undefined, now = NOW) =>
        openOAuthState({ secret: SECRET, workerOrigin: ORIGIN }, cookie, state, now);

    it('should open with the matching state and give back the verifier and next', async () => {
        const { value, cookie } = await sealed('/albums');
        expect(await open(cookie, value.state)).toEqual({
            verifier: value.verifier,
            next: '/albums',
        });
    });

    it('should expire after ten minutes', async () => {
        const { value, cookie } = await sealed();
        expect(value.expiresAt).toBe(NOW + TEN_MINUTES_MS);
        expect(await open(cookie, value.state, NOW + TEN_MINUTES_MS - 1)).toBeDefined();
        expect(await open(cookie, value.state, NOW + TEN_MINUTES_MS)).toBeUndefined();
    });

    it('should refuse a missing or different state', async () => {
        const { value, cookie } = await sealed();
        for (const state of [undefined, '', 'forged-state', `${value.state}x`]) {
            expect(await open(cookie, state), String(state)).toBeUndefined();
        }
    });

    it('should refuse a missing, malformed or re-signed cookie', async () => {
        const { value, cookie } = await sealed();
        const [payload = '', signature = ''] = cookie.split('.');
        const otherSecret = await sealOAuthState('another-secret-0123456789abcdefgh', value);
        const broken = [undefined, '', payload, `${payload}.`, `${cookie}.x`, `${cookie}x`];
        for (const candidate of [...broken, otherSecret, `x${payload}.${signature}`]) {
            expect(await open(candidate, value.state), String(candidate)).toBeUndefined();
        }
    });

    it('should refuse a payload changed after signing', async () => {
        const { value, cookie } = await sealed('/albums');
        const signature = cookie.split('.')[1] ?? '';
        const forged = encodeJson({ ...value, next: '//evil.example' });
        expect(await open(`${forged}.${signature}`, value.state)).toBeUndefined();
    });

    it('should refuse a correctly signed payload that is not a state object', async () => {
        const later = NOW + 1;
        const payloads = [
            encodeJson({ state: 's', expiresAt: later }),
            encodeJson({ state: 's', verifier: 'v' }),
            encodeJson({ state: 's', verifier: 1, expiresAt: later }),
            encodeJson({ state: 's', verifier: 'v', expiresAt: 'never' }),
            encodeJson('s'),
            encodeJson(null),
            'bm90IGpzb24',
        ];
        for (const payload of payloads) {
            const cookie = `${payload}.${await hmacSign(SECRET, payload)}`;
            expect(await open(cookie, 's'), payload).toBeUndefined();
        }
    });

    it('should drop an unsafe next even when the cookie is genuine', async () => {
        const { value, cookie } = await sealed('https://evil.example/');
        expect(await open(cookie, value.state)).toEqual({ verifier: value.verifier });
    });
});
