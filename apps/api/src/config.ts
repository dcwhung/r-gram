/* apps/api 嘅 named constants：cookie、TTL、HTTP status、錯誤碼、回應 header、env 規則 */

export const SECOND_MS = 1000;
const MINUTE_SECONDS = 60;
const DAY_SECONDS = 24 * 60 * MINUTE_SECONDS;
const SESSION_DAYS = 30;

/** admin session：cookie 名一定要 __Host-（Secure、Path=/、冇 Domain） */
export const SESSION_COOKIE = '__Host-session';
export const SESSION_TTL_SECONDS = SESSION_DAYS * DAY_SECONDS;
export const SESSION_TTL_MS = SESSION_TTL_SECONDS * SECOND_MS;
/** session token 隨機 bytes（D1 只存 SHA-256） */
export const SESSION_TOKEN_BYTES = 32;

/** SESSION_SECRET（HMAC-SHA-256 key）最少字數：`openssl rand -base64 32` 出 44 個字 */
export const SESSION_SECRET_MIN_LENGTH = 32;

export const HTTP_STATUS = {
    ok: 200,
    noContent: 204,
    found: 302,
    badRequest: 400,
    unauthorized: 401,
    forbidden: 403,
    notFound: 404,
    internalError: 500,
    badGateway: 502,
} as const;

/** 錯誤回應嘅 code（Technical Spec「API 設計 → 通用錯誤」；用到先加） */
export const ERROR_CODE = {
    unauthorized: 'UNAUTHORIZED',
    forbiddenOrigin: 'FORBIDDEN_ORIGIN',
    notFound: 'NOT_FOUND',
    internal: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

/** Worker 所有回應：唔畀搜尋引擎收錄 */
export const ROBOTS_HEADER_VALUE = 'noindex';
/** /api、/auth：唔准被其他網站 frame（clickjacking）、唔准 cache */
export const FRAME_OPTIONS_VALUE = 'DENY';
export const FRAME_ANCESTORS_POLICY = "frame-ancestors 'none'";
export const NO_STORE = 'no-store';
