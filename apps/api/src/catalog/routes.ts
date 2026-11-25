/*
 * /catalog/v1/*：播放端讀嘅公開內容（Technical Spec API-070–072、「安全設計 → 公開路由」）。
 * - CORS 只回 PLAYER_ORIGINS 入面嘅 origin（其他 origin 冇 Access-Control-Allow-Origin），一律 Vary: Origin；
 *   公開 ETag 畀播放端讀（backlog B-035）
 * - 所有回應：nosniff、`default-src 'none'; sandbox`（圖同管理端同一個 origin，backlog B-051）；錯誤唔 cache
 * - 唔設 cookie、唔使 session
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppEnv } from '../app';
import { ETAG_HEADER } from '../config';
import { csvList } from '../lib/env';
import { publicContent } from '../lib/securityHeaders';
import { serveCatalog, serveImage, serveLyrics } from './serve';

export const catalogRoutes = new Hono<AppEnv>();

const READ_METHODS = ['GET', 'HEAD'];

catalogRoutes.use('*', publicContent);
catalogRoutes.use(
    '*',
    cors({
        origin: (origin, c) => (csvList(c.env.PLAYER_ORIGINS).includes(origin) ? origin : null),
        allowMethods: READ_METHODS,
        exposeHeaders: [ETAG_HEADER],
    }),
);

catalogRoutes.get('/catalog.json', serveCatalog);
catalogRoutes.get('/img/:name', serveImage);
catalogRoutes.get('/lyrics/:name', serveLyrics);
