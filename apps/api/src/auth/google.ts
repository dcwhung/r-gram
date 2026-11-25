/* Google OAuth（server-side Authorization Code + PKCE） */
import { GOOGLE_AUTH_URL, GOOGLE_SCOPE, OAUTH_CALLBACK_PATH } from '../config';
import type { Env } from '../env';
import { sha256Base64Url } from '../lib/crypto';

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
