/*
 * 登入後返回嘅 path：GET /auth/google/start?next=<path>。
 * 防 open redirect：只收同站 path，唔合規當冇（返 /）
 * - 要 / 開頭，唔可以 // 開頭（protocol-relative = 第二個 host）
 * - 唔可以有 \（瀏覽器當 /，「/\evil.example」會變 //evil.example）或者控制字元（header 注入；tab / 換行會被瀏覽器刪走）
 * - 唔可以係 /auth/*（登入完又行返 login / callback）；percent-encode 咗嘅（/%61uth）一樣唔得
 * - path 唔可以有 dot-segment（. / ..，包括 %2e）：瀏覽器會 normalise，/x/../auth/… 一樣行返 /auth
 * - 最後用 URL parser 再對一次：解出嚟嘅 origin 一定要係 Worker 自己（上面嘅規則漏咗都過唔到）
 */
/** 按 byte 計：`next` 會放入 state cookie（瀏覽器上限 4096 byte） */
const MAX_NEXT_BYTES = 2048;
/** C0 控制字元（< U+0020）同 DEL（U+007F） */
const SPACE_CODE = 0x20;
const DEL_CODE = 0x7f;
const AUTH_PREFIX = '/auth';

const hasControlCharacter = (text: string): boolean =>
    [...text].some((ch) => {
        const code = ch.charCodeAt(0);
        return code < SPACE_CODE || code === DEL_CODE;
    });

/** query / hash 之前嘅 path（dot-segment 同 /auth 只睇呢段） */
const pathOf = (next: string): string => next.split(/[?#]/u)[0] ?? '';

/** router 會先 decode path 先配對，所以要用 decode 咗嘅 path 嚟判斷；escape 寫錯（decode 唔到）當唔安全 */
const decodedPath = (next: string): string | undefined => {
    try {
        return decodeURIComponent(pathOf(next));
    } catch {
        return undefined;
    }
};

const isAuthPath = (next: string): boolean => {
    const path = decodedPath(next);
    return path === undefined || path === AUTH_PREFIX || path.startsWith(`${AUTH_PREFIX}/`);
};

/** WHATWG URL：%2e（大細楷）喺 path segment 入面同 . 一樣當 dot-segment */
const ENCODED_DOT = /%2e/giu;
const DOT_SEGMENTS: ReadonlySet<string> = new Set(['.', '..']);

const hasDotSegment = (next: string): boolean =>
    pathOf(next)
        .split('/')
        .some((segment) => DOT_SEGMENTS.has(segment.replace(ENCODED_DOT, '.')));

/**
 * 用 URL parser 解一次：origin 一定要係 Worker 自己；回 parser 編碼好嘅 path + query + hash
 *（非 ASCII 字元只編碼一次，redirect 時唔會再被編碼）
 */
const onOriginPath = (next: string, workerOrigin: string): string | undefined => {
    try {
        const url = new URL(next, workerOrigin);
        return url.origin === workerOrigin ? url.pathname + url.search + url.hash : undefined;
    } catch {
        return undefined;
    }
};

const byteLength = (text: string): number => new TextEncoder().encode(text).length;

export const safeNext = (next: unknown, workerOrigin: string): string | undefined => {
    if (typeof next !== 'string' || byteLength(next) > MAX_NEXT_BYTES) return undefined;
    if (!next.startsWith('/') || next.startsWith('//')) return undefined;
    if (next.includes('\\') || hasControlCharacter(next)) return undefined;
    if (hasDotSegment(next) || isAuthPath(next)) return undefined;
    return onOriginPath(next, workerOrigin);
};
