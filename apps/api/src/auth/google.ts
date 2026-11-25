/*
 * Google OAuth（server-side Authorization Code + PKCE）：
 * id_token 係 Worker 直接經 TLS 由 Google token endpoint 攞（OIDC Core 3.1.3.7），所以唔使驗 JWT 簽名，
 * 但照驗 iss / aud，防止攞錯 client 嘅 token
 */
import {
    GOOGLE_AUTH_URL,
    GOOGLE_ISSUERS,
    GOOGLE_SCOPE,
    GOOGLE_TOKEN_URL,
    OAUTH_CALLBACK_PATH,
} from '../config';
import type { Env } from '../env';
import { base64UrlDecode, sha256Base64Url } from '../lib/crypto';

export interface GoogleIdentity {
    email: string;
    emailVerified: boolean;
}

/**
 * Google 登入失敗（callback 回 502）。message 會寫入 log：只可以係固定字句（最多加 HTTP status），
 * 唔可以夾 Google 回應、email、code 或者底層 error 嘅內容
 */
export class GoogleAuthError extends Error {
    override readonly name = 'GoogleAuthError';
}

const redirectUri = (env: Env): string => new URL(OAUTH_CALLBACK_PATH, env.WORKER_ORIGIN).href;

export interface AuthorizationRequest {
    state: string;
    /** 只送 S256 challenge 去 Google；verifier 留喺 cookie，換 token 先用 */
    verifier: string;
    selectAccount: boolean;
}

export const authorizationUrl = async (
    env: Env,
    { state, verifier, selectAccount }: AuthorizationRequest,
): Promise<string> => {
    const url = new URL(GOOGLE_AUTH_URL);
    url.search = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri(env),
        response_type: 'code',
        scope: GOOGLE_SCOPE,
        state,
        code_challenge: await sha256Base64Url(verifier),
        code_challenge_method: 'S256',
        ...(selectAccount ? { prompt: 'select_account' } : {}),
    }).toString();
    return url.href;
};

/** 網絡錯 / 回應唔係 JSON 都當 Google 登入失敗（502），唔好變 500 */
const fetchTokenEndpoint = async (body: URLSearchParams): Promise<unknown> => {
    let response: Response;
    try {
        response = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body,
        });
    } catch {
        throw new GoogleAuthError('token endpoint unreachable');
    }
    if (!response.ok) throw new GoogleAuthError(`token endpoint HTTP ${response.status}`);
    return response.json().catch(() => {
        throw new GoogleAuthError('token response is not JSON');
    });
};

const requestTokens = (env: Env, code: string, verifier: string): Promise<unknown> =>
    fetchTokenEndpoint(
        new URLSearchParams({
            code,
            code_verifier: verifier,
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri(env),
            grant_type: 'authorization_code',
        }),
    );

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const parseClaims = (payload: string): unknown => {
    try {
        return JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
    } catch {
        return undefined;
    }
};

/** token 回應 → id_token（JWT）中間嗰段嘅 claims */
const decodeClaims = (tokens: unknown): Record<string, unknown> => {
    const idToken = isRecord(tokens) ? tokens.id_token : undefined;
    const payload = typeof idToken === 'string' ? idToken.split('.')[1] : undefined;
    if (!payload) throw new GoogleAuthError('no id_token');
    const claims = parseClaims(payload);
    if (!isRecord(claims)) throw new GoogleAuthError('id_token payload is not base64url JSON');
    return claims;
};

/** code + verifier → email；token endpoint 錯 / id_token 唔係畀我哋 → GoogleAuthError */
export const exchangeCode = async (env: Env, code: string, verifier: string) => {
    const claims = decodeClaims(await requestTokens(env, code, verifier));
    if (!GOOGLE_ISSUERS.includes(String(claims.iss))) throw new GoogleAuthError('bad issuer');
    if (claims.aud !== env.GOOGLE_CLIENT_ID) throw new GoogleAuthError('bad audience');
    if (typeof claims.email !== 'string') throw new GoogleAuthError('no email claim');
    const identity: GoogleIdentity = {
        email: claims.email,
        // 一定要係 boolean true：'true'、1 都唔收
        emailVerified: claims.email_verified === true,
    };
    return identity;
};
