/*
 * 管理 API 嘅 fetch wrapper（Technical Spec「API 設計 → 通則」）：只打同源 path（`/` 開頭），帶 cookie（same-origin）。
 * 改資料嘅請求由瀏覽器自動帶 `Origin`（Worker 嘅 CSRF 檢查要 = WORKER_ORIGIN），唔使自己設。
 * Worker 嘅錯誤格式 `{ error: { code, message, details } }` → ApiError（code 照用 Worker 嘅錯誤碼）；
 * 連唔到（離線、CORS、DNS）→ code `NETWORK`、status 0
 */
export const NETWORK_ERROR = 'NETWORK';

const HTTP_NO_CONTENT = 204;
const HTTP_SERVER_ERROR = 500;
const NO_STATUS = 0;

export interface ApiDetail {
    path: string;
    reason: string;
    message?: string;
}

export class ApiError extends Error {
    override readonly name = 'ApiError';

    constructor(
        readonly status: number,
        readonly code: string,
        message: string,
        readonly details: readonly ApiDetail[] = [],
    ) {
        super(message);
    }

    /** 連唔到或者 server 出錯：再試可能得；4xx 係資料問題，再試都一樣 */
    get retriable(): boolean {
        return this.status === NO_STATUS || this.status >= HTTP_SERVER_ERROR;
    }
}

export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT';
    /** JSON body */
    json?: unknown;
    /** binary body（圖）：Content-Type 用 blob.type */
    body?: Blob;
    query?: Readonly<Record<string, string | number | undefined>>;
}

/** 同源 path：`/` 開頭，唔係 `//`（protocol-relative），冇 `\`（有啲 parser 當 `/`） */
const isSameOriginPath = (path: string): boolean =>
    path.startsWith('/') && !path.startsWith('//') && !path.includes('\\');

const withQuery = (path: string, query: RequestOptions['query'] = {}): string => {
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(query))
        if (value !== undefined) params.set(name, String(value));
    const text = params.toString();
    return text === '' ? path : `${path}?${text}`;
};

const initOf = ({ method = 'GET', json, body }: RequestOptions): RequestInit => {
    const headers = new Headers({ accept: 'application/json' });
    if (json !== undefined) headers.set('content-type', 'application/json');
    if (body) headers.set('content-type', body.type);
    const payload = body ?? (json === undefined ? undefined : JSON.stringify(json));
    return { method, credentials: 'same-origin', headers, body: payload };
};

const readJson = async (response: Response): Promise<unknown> => {
    try {
        return await response.json();
    } catch {
        return undefined;
    }
};

const errorOf = (status: number, body: unknown): ApiError => {
    const error = (body as { error?: Partial<ApiError> } | undefined)?.error;
    const code = typeof error?.code === 'string' ? error.code : `HTTP_${status}`;
    const message = typeof error?.message === 'string' ? error.message : code;
    const details = Array.isArray(error?.details) ? error.details : [];
    return new ApiError(status, code, message, details);
};

const send = async (fetchImpl: Fetch, url: string, init: RequestInit): Promise<Response> => {
    try {
        return await fetchImpl(url, init);
    } catch (error) {
        throw new ApiError(NO_STATUS, NETWORK_ERROR, String(error));
    }
};

export interface Client {
    request: <T>(path: string, options?: RequestOptions) => Promise<T>;
}

/** fetchImpl 冇畀 = 用嗰陣嘅全域 fetch（測試可以 stub） */
export const createClient = (fetchImpl?: Fetch): Client => ({
    request: async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
        if (!isSameOriginPath(path)) throw new TypeError('Admin API calls must be same-origin');
        const doFetch = fetchImpl ?? ((input, init) => fetch(input, init));
        const response = await send(doFetch, withQuery(path, options.query), initOf(options));
        if (!response.ok) throw errorOf(response.status, await readJson(response));
        if (response.status === HTTP_NO_CONTENT) return null as T;
        return (await readJson(response)) as T;
    },
});
