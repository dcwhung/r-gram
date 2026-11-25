/* 回應 header（Technical Spec「安全設計 → Header / 搜尋引擎」） */
import type { MiddlewareHandler } from 'hono';
import {
    FRAME_ANCESTORS_POLICY,
    FRAME_OPTIONS_VALUE,
    NO_STORE,
    ROBOTS_HEADER_VALUE,
} from '../config';

/** Worker 所有回應 */
export const noIndex: MiddlewareHandler = async (c, next) => {
    await next();
    c.header('x-robots-tag', ROBOTS_HEADER_VALUE);
};

/**
 * /api、/auth：唔准 frame、唔准 cache（回應跟住 session）。
 * route 自己設咗更嚴嘅 CSP（例如「沒有權限」頁）就保留；X-Frame-Options 照加畀唔識 frame-ancestors 嘅舊瀏覽器
 */
export const privateResponse: MiddlewareHandler = async (c, next) => {
    await next();
    c.header('x-frame-options', FRAME_OPTIONS_VALUE);
    c.header('cache-control', NO_STORE);
    if (!c.res.headers.has('content-security-policy')) {
        c.header('content-security-policy', FRAME_ANCESTORS_POLICY);
    }
};
