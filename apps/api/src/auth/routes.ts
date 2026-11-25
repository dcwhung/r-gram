/* /auth/*：Google login（start / callback）同 logout */
import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import type { AppEnv } from '../app';
import { HTTP_STATUS, OAUTH_COOKIE, OAUTH_STATE_TTL_SECONDS } from '../config';
import { authorizationUrl } from './google';
import { safeNext } from './next';
import { newOAuthState, sealOAuthState } from './oauthState';

/** __Host- cookie 一定要 Secure + Path=/ + 冇 Domain */
const HOST_COOKIE = { httpOnly: true, secure: true, sameSite: 'Lax', path: '/' } as const;
/** ?select_account=1：「沒有權限」頁轉用其他帳戶 */
const SELECT_ACCOUNT_FLAG = '1';

export const authRoutes = new Hono<AppEnv>();

authRoutes.get('/google/start', async (c) => {
    // 唔合規嘅 next 當冇
    const next = safeNext(c.req.query('next'), c.env.WORKER_ORIGIN);
    const value = newOAuthState(Date.now(), next);
    setCookie(c, OAUTH_COOKIE, await sealOAuthState(c.env.SESSION_SECRET, value), {
        ...HOST_COOKIE,
        maxAge: OAUTH_STATE_TTL_SECONDS,
    });
    const selectAccount = c.req.query('select_account') === SELECT_ACCOUNT_FLAG;
    return c.redirect(
        await authorizationUrl(c.env, { ...value, selectAccount }),
        HTTP_STATUS.found,
    );
});
