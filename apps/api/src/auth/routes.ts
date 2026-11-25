/* /auth/*：Google login（start / callback）同 logout。log 只寫固定字句：唔寫 email、code、state、verifier */
import { Hono, type Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { HtmlEscapedString } from 'hono/utils/html';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { AppEnv } from '../app';
import {
    HTTP_STATUS,
    OAUTH_COOKIE,
    OAUTH_STATE_TTL_SECONDS,
    SESSION_COOKIE,
    SESSION_TTL_SECONDS,
} from '../config';
import { isAdminEmail } from '../lib/env';
import { authorizationUrl, exchangeCode, GoogleAuthError } from './google';
import { requireSameOrigin } from './middleware';
import { safeNext } from './next';
import { newOAuthState, openOAuthState, sealOAuthState, type OpenedOAuthState } from './oauthState';
import { AUTH_PAGE_CSP, deniedPage, loginExpiredPage, loginFailedPage } from './pages';
import { createSession, deleteSession } from './session';

/** __Host- cookie 一定要 Secure + Path=/ + 冇 Domain */
const HOST_COOKIE = { httpOnly: true, secure: true, sameSite: 'Lax', path: '/' } as const;
/** ?select_account=1：「沒有權限」頁轉用其他帳戶 */
const SELECT_ACCOUNT_FLAG = '1';
/** 管理端首頁：登入後冇 next、或者喺 Google 撳取消，都返呢度 */
const HOME_PATH = '/';

type AuthPage = HtmlEscapedString | Promise<HtmlEscapedString>;

/** Worker 自己出嘅頁：自成一頁，配最嚴嘅 CSP（privateResponse 見到已經設咗就唔會蓋） */
const htmlPage = (c: Context<AppEnv>, page: AuthPage, status: ContentfulStatusCode) => {
    c.header('content-security-policy', AUTH_PAGE_CSP);
    return c.html(page, status);
};

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

/** state 啱 → 換 token → 驗 email → 開 session → 返 next（冇就首頁）；失敗唔開 session */
const finishLogin = async (
    c: Context<AppEnv>,
    code: string,
    { verifier, next }: OpenedOAuthState,
) => {
    const identity = await exchangeCode(c.env, code, verifier);
    if (!identity.emailVerified || !isAdminEmail(c.env.ADMIN_EMAILS, identity.email)) {
        console.warn('[auth] login refused: account is not on the admin allowlist');
        return htmlPage(c, deniedPage(identity.email), HTTP_STATUS.forbidden);
    }
    const token = await createSession(c.env.DB, identity.email);
    setCookie(c, SESSION_COOKIE, token, { ...HOST_COOKIE, maxAge: SESSION_TTL_SECONDS });
    return c.redirect(next ?? HOME_PATH, HTTP_STATUS.found);
};

authRoutes.get('/google/callback', async (c) => {
    const cookie = getCookie(c, OAUTH_COOKIE);
    // 一次性：唔理成敗，callback 一入嚟就刪 state cookie
    deleteCookie(c, OAUTH_COOKIE, HOST_COOKIE);
    // 用戶喺 Google 撳取消（error=access_denied）：返首頁
    if (c.req.query('error')) return c.redirect(HOME_PATH, HTTP_STATUS.found);
    const key = { secret: c.env.SESSION_SECRET, workerOrigin: c.env.WORKER_ORIGIN };
    const opened = await openOAuthState(key, cookie, c.req.query('state'));
    const code = c.req.query('code');
    if (!opened || !code) {
        console.warn('[auth] login refused: state cookie missing, expired or not matching');
        return htmlPage(c, loginExpiredPage(), HTTP_STATUS.badRequest);
    }
    try {
        return await finishLogin(c, code, opened);
    } catch (error) {
        if (!(error instanceof GoogleAuthError)) throw error;
        console.warn('[auth] Google login failed:', error.message);
        return htmlPage(c, loginFailedPage(), HTTP_STATUS.badGateway);
    }
});

/**
 * 登出：刪 D1 嘅 session + 清 cookie。要 same-origin（第二個網站唔可以代人登出）；
 * 冇 session / session 已過期都照回 204：登出本身冇嘢要保護，管理端唔使分情況處理
 */
authRoutes.post('/logout', requireSameOrigin, async (c) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (token) await deleteSession(c.env.DB, token);
    deleteCookie(c, SESSION_COOKIE, HOST_COOKIE);
    return c.body(null, HTTP_STATUS.noContent);
});
