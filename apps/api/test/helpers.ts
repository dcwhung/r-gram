/* test 共用：打 Worker、登入 */
import { env } from 'cloudflare:test';
import { createSession } from '../src/auth/session';
import worker from '../src/index';

export const ORIGIN = env.WORKER_ORIGIN;
/** vitest.config.ts TEST_BINDINGS.ADMIN_EMAILS 入面嗰個 */
export const ADMIN = 'admin@example.com';
export const SESSION_COOKIE_NAME = '__Host-session';

/** bindings：要換設定嘅 test 傳 { ...env, X: … } */
export const call = (path: string, init: RequestInit = {}, bindings = env): Promise<Response> =>
    Promise.resolve(worker.fetch(new Request(new URL(path, ORIGIN), init), bindings));

/** 開一個真 session（同 callback 一樣經 createSession），回 Cookie header */
export const loginCookie = async (email = ADMIN, now = Date.now()): Promise<string> => {
    const token = await createSession(env.DB, email, now);
    return `${SESSION_COOKIE_NAME}=${token}`;
};

/** Set-Cookie 入面某個 cookie 成行（連屬性） */
export const setCookieLine = (response: Response, name: string): string | undefined =>
    response.headers.getSetCookie().find((line) => line.startsWith(`${name}=`));

/** Set-Cookie 入面某個 cookie 嘅 name=value */
export const cookiePair = (response: Response, name: string): string | undefined =>
    setCookieLine(response, name)?.split(';')[0];

export const sessionCount = () =>
    env.DB.prepare('SELECT COUNT(*) AS n FROM sessions').first<number>('n');
