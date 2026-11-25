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

const OAUTH_STATE_MINUTES = 10;
/** OAuth 開始 → callback 之間嘅 state + PKCE verifier（HMAC 簽名、短命） */
export const OAUTH_COOKIE = '__Host-oauth';
export const OAUTH_STATE_TTL_SECONDS = OAUTH_STATE_MINUTES * MINUTE_SECONDS;
export const OAUTH_STATE_BYTES = 16;
/** RFC 7636：verifier 43–128 字；32 bytes base64url = 43 字 */
export const PKCE_VERIFIER_BYTES = 32;

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_ISSUERS: readonly string[] = [
    'https://accounts.google.com',
    'accounts.google.com',
];
export const GOOGLE_SCOPE = 'openid email';
export const OAUTH_CALLBACK_PATH = '/auth/google/callback';

/** SESSION_SECRET（HMAC-SHA-256 key）最少字數：`openssl rand -base64 32` 出 44 個字 */
export const SESSION_SECRET_MIN_LENGTH = 32;

export const HTTP_STATUS = {
    ok: 200,
    created: 201,
    noContent: 204,
    found: 302,
    badRequest: 400,
    unauthorized: 401,
    forbidden: 403,
    notFound: 404,
    conflict: 409,
    payloadTooLarge: 413,
    internalError: 500,
    badGateway: 502,
} as const;

/** 錯誤回應嘅 code（Technical Spec「API 設計 → 通用錯誤」；用到先加） */
export const ERROR_CODE = {
    unauthorized: 'UNAUTHORIZED',
    forbiddenOrigin: 'FORBIDDEN_ORIGIN',
    notFound: 'NOT_FOUND',
    validation: 'VALIDATION_ERROR',
    /** If-Match 同現有 updatedAt 唔同 */
    stale: 'STALE',
    conflict: 'CONFLICT',
    /** 刪除會令 id 由 catalog 消失：要帶 ?force=1 再叫（ID 守衛） */
    idRemoved: 'ID_REMOVED',
    /** 儲存會清走一首歌現有嘅歌詞：要帶 ?force=1 再叫（Functional Spec D30） */
    lyricsRemoved: 'LYRICS_REMOVED',
    /** body / 歌曲文字超出上限 */
    tooLarge: 'TOO_LARGE',
    internal: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

/** 刪除（ID 守衛）同清走歌詞嘅確認：只有 `?force=1` 先當確認咗 */
export const FORCE_CONFIRMED = '1';

/** r-gram-catalog 入面歌詞 JSON 嘅 prefix（Technical Spec「R2 key layout」） */
export const LYRICS_KEY_PREFIX = 'catalog/v1/lyrics/';
/** 歌詞檔名：內容 sha256 嘅頭 16 個 hex + `.json`（同封面圖一樣用 hash 檔名） */
export const LYRICS_HASH_HEX_CHARS = 16;
export const JSON_CONTENT_TYPE = 'application/json';

/** Worker 所有回應：唔畀搜尋引擎收錄 */
export const ROBOTS_HEADER_VALUE = 'noindex';
/** /api、/auth：唔准被其他網站 frame（clickjacking）、唔准 cache */
export const FRAME_OPTIONS_VALUE = 'DENY';
export const FRAME_ANCESTORS_POLICY = "frame-ancestors 'none'";
export const NO_STORE = 'no-store';
/** callback 網址有 OAuth code + state：由 /auth 嘅頁出去唔帶 Referer */
export const NO_REFERRER = 'no-referrer';
export const NO_SNIFF = 'nosniff';
