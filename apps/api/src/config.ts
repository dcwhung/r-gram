/* apps/api 嘅 named constants：HTTP status、錯誤碼、回應 header、env 規則 */

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
