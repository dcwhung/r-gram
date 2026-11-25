/*
 * /api/* 守門（次序：session → same-origin）：
 * - requireSession：要有效 session（/api/health 除外，喺 router 先註冊），而且 email 仍然喺 ADMIN_EMAILS
 *   （白名單拎走嘅人即刻失效，順手刪走佢個 session）。未登入一律 401，唔理 method 同 Origin（US-101）
 * - requireSameOrigin：POST / PUT / PATCH / DELETE 要 Origin = WORKER_ORIGIN（CSRF；SameSite=Lax 之外多一層）
 */
import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../app';
import { ERROR_CODE, HTTP_STATUS, SESSION_COOKIE } from '../config';
import { isAdminEmail } from '../lib/env';
import { errorJson } from '../lib/http';
import { deleteSession, findSession } from './session';

const SAFE_METHODS: readonly string[] = ['GET', 'HEAD', 'OPTIONS'];

export const requireSameOrigin = createMiddleware<AppEnv>(async (c, next) => {
    if (SAFE_METHODS.includes(c.req.method)) return next();
    // Origin 唔係 secret（瀏覽器照樣會送），普通字串比較就得
    if (c.req.header('origin') === c.env.WORKER_ORIGIN) return next();
    return errorJson(
        c,
        HTTP_STATUS.forbidden,
        ERROR_CODE.forbiddenOrigin,
        'cross-origin request refused',
    );
});

/** 有效 session 而且仲係管理員 → email；唔再係管理員就刪走個 session */
const currentAdmin = async (env: AppEnv['Bindings'], token: string | undefined) => {
    if (!token) return undefined;
    const email = await findSession(env.DB, token);
    if (!email) return undefined;
    if (isAdminEmail(env.ADMIN_EMAILS, email)) return email;
    await deleteSession(env.DB, token);
    return undefined;
};

export const requireSession = createMiddleware<AppEnv>(async (c, next) => {
    const email = await currentAdmin(c.env, getCookie(c, SESSION_COOKIE));
    if (!email) {
        return errorJson(c, HTTP_STATUS.unauthorized, ERROR_CODE.unauthorized, 'not logged in');
    }
    c.set('email', email);
    return next();
});
