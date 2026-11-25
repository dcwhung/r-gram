/*
 * Env 驗證：binding / var / secret 漏咗或者格式錯，Worker 一律回 500，唔好帶住半套設定行落去
 *（例如 SESSION_SECRET 係空字串都簽到 state cookie；WORKER_ORIGIN 錯咗 CSRF 檢查會全部擋晒）。
 * log 只記設定嘅名，唔記值
 */
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../app';
import { ERROR_CODE, HTTP_STATUS, SESSION_SECRET_MIN_LENGTH } from '../config';
import type { Env } from '../env';
import { csvList } from './env';
import { errorJson } from './http';

type EnvCheck = (env: Partial<Env>) => boolean;

/** 本機開發（vite dev server）先可以用 http */
const LOCAL_HOSTS: readonly string[] = ['localhost', '127.0.0.1'];
const EMAIL_PATTERN = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/u;

const isFilled = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0;

const parseUrl = (value: string): URL | undefined => {
    try {
        return new URL(value);
    } catch {
        return undefined;
    }
};

/** scheme + host（+ port），冇 path / 結尾 /：同瀏覽器 Origin header 嘅寫法一樣先比得啱 */
const isOrigin = (value: unknown, allowLocalHttp: boolean): boolean => {
    const url = isFilled(value) ? parseUrl(value) : undefined;
    if (!url || url.origin !== value) return false;
    if (url.protocol === 'https:') return true;
    return allowLocalHttp && url.protocol === 'http:' && LOCAL_HOSTS.includes(url.hostname);
};

/** https、/ 結尾、冇 query / hash：後面直接駁 R2 key */
const isHttpsBase = (value: unknown): boolean => {
    const url = isFilled(value) ? parseUrl(value) : undefined;
    if (!url || url.protocol !== 'https:' || url.href !== value) return false;
    return value.endsWith('/') && !value.includes('?') && !value.includes('#');
};

const isEmailList = (value: unknown): boolean => {
    const emails = isFilled(value) ? csvList(value) : [];
    return emails.length > 0 && emails.every((email) => EMAIL_PATTERN.test(email));
};

/** 可以係空（未有播放端網址 = 唔開 CORS），但有嘅每個都要係 origin */
const isOriginList = (value: unknown): boolean =>
    typeof value === 'string' && csvList(value).every((origin) => isOrigin(origin, true));

const hasMethod = (binding: unknown, method: string): boolean =>
    typeof (binding as Record<string, unknown> | undefined)?.[method] === 'function';

/** Record<keyof Env, …>：Env 加欄而冇加規則 = 編譯錯 */
const ENV_CHECKS: Readonly<Record<keyof Env, EnvCheck>> = {
    DB: (env) => hasMethod(env.DB, 'prepare'),
    CATALOG: (env) => hasMethod(env.CATALOG, 'get'),
    MEDIA: (env) => hasMethod(env.MEDIA, 'list'),
    GOOGLE_CLIENT_ID: (env) => isFilled(env.GOOGLE_CLIENT_ID),
    GOOGLE_CLIENT_SECRET: (env) => isFilled(env.GOOGLE_CLIENT_SECRET),
    SESSION_SECRET: (env) =>
        isFilled(env.SESSION_SECRET) && env.SESSION_SECRET.length >= SESSION_SECRET_MIN_LENGTH,
    ADMIN_EMAILS: (env) => isEmailList(env.ADMIN_EMAILS),
    PLAYER_ORIGINS: (env) => isOriginList(env.PLAYER_ORIGINS),
    WORKER_ORIGIN: (env) => isOrigin(env.WORKER_ORIGIN, false),
    MEDIA_BASE: (env) => isHttpsBase(env.MEDIA_BASE),
};

/** 漏咗 / 格式錯嘅設定名（全部啱 = 空 array） */
export const invalidEnvNames = (env: Partial<Env>): string[] =>
    (Object.keys(ENV_CHECKS) as (keyof Env)[]).filter((name) => !ENV_CHECKS[name](env));

/** 同一個 isolate 入面 env 係同一個 object：每個 isolate 只驗一次 */
const checkedEnvs = new WeakMap<object, string[]>();

const invalidNamesOf = (env: Env): string[] => {
    const known = checkedEnvs.get(env);
    if (known) return known;
    const invalid = invalidEnvNames(env);
    checkedEnvs.set(env, invalid);
    return invalid;
};

export const requireValidEnv = createMiddleware<AppEnv>(async (c, next) => {
    const invalid = invalidNamesOf(c.env);
    if (invalid.length === 0) return next();
    console.error('[env] missing or invalid settings:', invalid.join(', '));
    return errorJson(c, HTTP_STATUS.internalError, ERROR_CODE.internal, 'server misconfigured');
});
