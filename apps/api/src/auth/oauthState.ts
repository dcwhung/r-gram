/*
 * OAuth state + PKCE verifier：/auth/google/start 放入 HMAC 簽名 cookie（SESSION_SECRET），
 * callback 驗簽名、時限、同 query 嘅 state 一致先換 token。Worker 唔使記任何 server state。
 * - 綁瀏覽器：cookie 係 HttpOnly + __Host-，第二個瀏覽器冇呢個 cookie 就過唔到（login CSRF）
 * - 一次性：callback 一入嚟就刪 cookie；同一個 code 喺 Google 嗰邊亦只換到一次
 * - next：登入後返回嘅 path，一齊簽名，callback 先用（開嗰陣再驗一次）
 */
import {
    OAUTH_STATE_BYTES,
    OAUTH_STATE_TTL_SECONDS,
    PKCE_VERIFIER_BYTES,
    SECOND_MS,
} from '../config';
import {
    base64UrlDecode,
    base64UrlEncode,
    constantTimeEqual,
    hmacSign,
    hmacVerify,
    randomBase64Url,
} from '../lib/crypto';
import { safeNext } from './next';

export interface OAuthState {
    state: string;
    verifier: string;
    /** epoch ms */
    expiresAt: number;
    /** 登入後返回嘅同站 path（已經過 safeNext） */
    next?: string;
}

export const newOAuthState = (now = Date.now(), next?: string): OAuthState => ({
    state: randomBase64Url(OAUTH_STATE_BYTES),
    verifier: randomBase64Url(PKCE_VERIFIER_BYTES),
    expiresAt: now + OAUTH_STATE_TTL_SECONDS * SECOND_MS,
    ...(next === undefined ? {} : { next }),
});

/** cookie 值：<base64url(JSON)>.<HMAC> */
export const sealOAuthState = async (secret: string, value: OAuthState): Promise<string> => {
    const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(value)));
    return `${payload}.${await hmacSign(secret, payload)}`;
};

const isOAuthState = (value: unknown): value is OAuthState => {
    if (typeof value !== 'object' || value === null) return false;
    const { state, verifier, expiresAt } = value as Record<string, unknown>;
    return (
        typeof state === 'string' && typeof verifier === 'string' && typeof expiresAt === 'number'
    );
};

const parsePayload = (payload: string): OAuthState | undefined => {
    try {
        const value: unknown = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
        return isOAuthState(value) ? value : undefined;
    } catch {
        return undefined;
    }
};

export interface OAuthStateKey {
    /** SESSION_SECRET */
    secret: string;
    /** next 要解返落呢個 origin 先收 */
    workerOrigin: string;
}

export interface OpenedOAuthState {
    verifier: string;
    next?: string;
}

/** 簽名啱、未過期、state 同 callback query 一樣 → verifier（+ next）；否則 undefined */
export const openOAuthState = async (
    { secret, workerOrigin }: OAuthStateKey,
    cookie: string | undefined,
    state: string | undefined,
    now = Date.now(),
): Promise<OpenedOAuthState | undefined> => {
    const [payload, signature, extra] = (cookie ?? '').split('.');
    if (!payload || !signature || extra !== undefined) return undefined;
    if (!(await hmacVerify(secret, payload, signature))) return undefined;
    const value = parsePayload(payload);
    if (!value || value.expiresAt <= now || !state) return undefined;
    if (!(await constantTimeEqual(value.state, state))) return undefined;
    const next = safeNext(value.next, workerOrigin);
    return { verifier: value.verifier, ...(next === undefined ? {} : { next }) };
};
