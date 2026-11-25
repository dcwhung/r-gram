/* OAuth test 共用：行 /auth/google/start、拆 state cookie、Google token endpoint mock（唔會真係打 Google） */
import { env } from 'cloudflare:test';
import { expect, vi } from 'vitest';
import { call, cookiePair } from './helpers';

export const OAUTH_COOKIE_NAME = '__Host-oauth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const toBase64Url = (text: string): string =>
    btoa(text).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');

const fromBase64Url = (text: string): string =>
    atob(text.replaceAll('-', '+').replaceAll('_', '/'));

export const encodeJson = (value: unknown): string => toBase64Url(JSON.stringify(value));

/** 行 /auth/google/start，回 Google 嘅 redirect URL 同 state cookie（name=value） */
export const start = async (query = '', bindings = env) => {
    const response = await call(`/auth/google/start${query}`, {}, bindings);
    const location = new URL(response.headers.get('location') ?? '');
    const cookie = cookiePair(response, OAUTH_COOKIE_NAME) ?? '';
    return { response, location, cookie, state: location.searchParams.get('state') ?? '' };
};

/** state cookie = <base64url(JSON)>.<HMAC> */
export const splitStateCookie = (cookie: string) => {
    const [payload = '', signature = ''] = cookie.slice(cookie.indexOf('=') + 1).split('.');
    const value = JSON.parse(fromBase64Url(payload)) as Record<string, unknown>;
    return { payload, signature, value };
};

/** 假 id_token（callback 直接由 Google token endpoint 攞，唔驗簽名） */
export const idToken = (claims: Record<string, unknown>): string =>
    [encodeJson({ alg: 'RS256' }), encodeJson(claims), 'sig'].join('.');

export const googleClaims = (email: string, extra: Record<string, unknown> = {}) => ({
    iss: 'https://accounts.google.com',
    aud: env.GOOGLE_CLIENT_ID,
    email,
    email_verified: true,
    ...extra,
});

/** Google token endpoint mock：記低 request body，回指定 claims；打其他網址即 fail */
export const mockGoogle = (claims: Record<string, unknown>, status = 200) => {
    const bodies: URLSearchParams[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
        expect(String(input instanceof Request ? input.url : input)).toBe(GOOGLE_TOKEN_URL);
        expect(init?.method).toBe('POST');
        bodies.push(new URLSearchParams(String(init?.body)));
        return Response.json({ id_token: idToken(claims) }, { status });
    });
    return bodies;
};

export const callback = (state: string, cookie: string, bindings = env) =>
    call(
        `/auth/google/callback?code=auth-code&state=${encodeURIComponent(state)}`,
        { headers: { cookie } },
        bindings,
    );
