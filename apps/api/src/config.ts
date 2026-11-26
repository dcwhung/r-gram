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
    notModified: 304,
    badRequest: 400,
    unauthorized: 401,
    forbidden: 403,
    notFound: 404,
    conflict: 409,
    payloadTooLarge: 413,
    unsupportedMediaType: 415,
    unprocessable: 422,
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
    /** 儲存會清走一首歌現有嘅歌詞：要帶 ?force=1 再叫（Functional Spec D30） */
    lyricsRemoved: 'LYRICS_REMOVED',
    /** body / 歌曲文字超出上限 */
    tooLarge: 'TOO_LARGE',
    /** 上載嘅圖唔係 WebP / JPEG / PNG（Content-Type 或者檔頭 magic bytes） */
    unsupportedType: 'UNSUPPORTED_TYPE',
    /** catalog.json 未生成過（API-070） */
    notReady: 'NOT_READY',
    /** 砌出嚟嘅 catalog document 過唔到 validator（API-061） */
    invalidDocument: 'INVALID_DOCUMENT',
    /** catalog.json 寫唔到 R2（API-061） */
    catalogWriteFailed: 'CATALOG_WRITE_FAILED',
    /** 掃描：媒體 bucket 冇呢張專輯嘅資料夾，或者入面冇檔（API-030） */
    folderEmpty: 'FOLDER_EMPTY',
    /** 掃描套用：呢個歌號而家冇音檔（Functional Spec D54；API-031 逐項結果） */
    noAudio: 'NO_AUDIO',
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

/** r-gram-catalog 入面封面圖嘅 prefix（Technical Spec「R2 key layout」）；公開網址 /catalog/v1/img/<name> */
export const IMAGE_KEY_PREFIX = 'catalog/v1/img/';
/** 圖檔名：內容 sha256 嘅頭 16 個 hex + 副檔名（Technical Spec「assets」） */
export const IMAGE_HASH_HEX_CHARS = 16;
const BYTES_PER_MB = 1024 * 1024;
export const IMAGE_MAX_MB = 2;
/** 上載圖大細上限（Technical Spec「安全設計 → 上載」IMAGE_MAX_BYTES） */
export const IMAGE_MAX_BYTES = IMAGE_MAX_MB * BYTES_PER_MB;
/** 封面兩個尺寸（正方形，Technical Spec「albums」、「性能 → 圖片」）：揀中嘅碟 / 縮圖 */
export const COVER_SIDE_PX = 1200;
export const THUMB_SIDE_PX = 320;
const YEAR_SECONDS = 365 * DAY_SECONDS;
/** hash 檔名 = 內容不變：永久 cache（Technical Spec「核心原則 2」） */
export const IMMUTABLE_CACHE = `public, max-age=${YEAR_SECONDS}, immutable`;

/** 而家生效嘅 catalog.json（Technical Spec「R2 key layout」） */
export const CATALOG_JSON_KEY = 'catalog/v1/catalog.json';
/** 公開路由（API-070–072）；圖同歌詞嘅網址前綴寫入 catalog.json 嘅 imageBase / lyricsBase */
export const CATALOG_PUBLIC_PATH = '/catalog/v1';
export const IMAGE_PUBLIC_PATH = `${CATALOG_PUBLIC_PATH}/img/`;
export const LYRICS_PUBLIC_PATH = `${CATALOG_PUBLIC_PATH}/lyrics/`;
/** catalog.json：播放端返回前景時重新驗證，「儲存即生效」最遲約 60 秒（Technical Spec「性能考量」） */
export const CATALOG_MAX_AGE_SECONDS = MINUTE_SECONDS;
export const CATALOG_CACHE = `public, max-age=${CATALOG_MAX_AGE_SECONDS}`;
/**
 * 生成 catalog 時，寫 R2 之前另一個請求已經寫咗新嘅一份（條件寫入唔成功）：由讀 D1 重新嚟過嘅次數上限
 *（單一管理員，撞三次已經極少；用完就當寫入失敗，管理端出重試）
 */
export const CATALOG_WRITE_ATTEMPTS = 3;
/** /catalog/v1/*：唔准行 script、唔准載入任何嘢（圖同管理端同一個 origin，backlog B-051） */
export const PUBLIC_CONTENT_POLICY = "default-src 'none'; sandbox";
/** 播放端（另一個 origin）要讀到 ETag（backlog B-035） */
export const ETAG_HEADER = 'ETag';

/** Worker 所有回應：唔畀搜尋引擎收錄 */
export const ROBOTS_HEADER_VALUE = 'noindex';
/** /api、/auth：唔准被其他網站 frame（clickjacking）、唔准 cache */
export const FRAME_OPTIONS_VALUE = 'DENY';
export const FRAME_ANCESTORS_POLICY = "frame-ancestors 'none'";
export const NO_STORE = 'no-store';
/** callback 網址有 OAuth code + state：由 /auth 嘅頁出去唔帶 Referer */
export const NO_REFERRER = 'no-referrer';
export const NO_SNIFF = 'nosniff';

/**
 * 掃描（T-025；Technical Spec「CR-004 → 掃描嘅設計 → 限制同風險」、R-016）：Worker 每個請求對 Cloudflare 服務
 *（R2、D1 binding）嘅操作有上限（Cloudflare 文件：每個請求最多 1000 個；外部 subrequest 免費計劃 50 個）。
 * 一次預覽：list（每 1000 個檔一次）+ 最多呢個數嘅 `.txt` 讀取 + 手動指定檔案嘅 head（只限呢張碟）+ 幾句 D1。
 * 原聲大碟 41 首，第一次掃描一次過讀得晒；超過就分批（預覽回 more / nextFrom）
 */
export const SCAN_TEXT_READS_MAX = 100;
/**
 * 媒體 bucket 一次 list 最多讀幾頁（每頁最多 1000 個，一頁 = 一個 R2 操作；review S-136）：
 * 一張碟嘅資料夾幾十個檔，一頁就夠；到咗上限就停，回應講明（listTruncated / truncated），唔會一直讀落去
 */
export const SCAN_LIST_PAGES_MAX = 5;
/**
 * 預覽時手動指定喺其他資料夾嘅檔最多 head 幾個（review S-136）；超過嘅唔檢查，列喺 manualUnchecked
 */
export const SCAN_MANUAL_HEADS_MAX = 50;
/**
 * 一次套用每一類（create、songTexts、media、clearAudio）最多幾多項：create / songTexts 每項約 4 個操作
 *（讀 .txt、寫歌詞檔、D1 batch、清舊歌詞檔），四類加埋最多約 500 個，留位畀 list 同生成 catalog
 */
export const SCAN_APPLY_MAX_ITEMS = 50;
