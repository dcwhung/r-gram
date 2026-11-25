/*
 * /catalog/v1/*：播放端讀嘅公開內容（Technical Spec API-070–072、「安全設計 → 公開路由」）。
 * CORS 只回 PLAYER_ORIGINS 入面嘅 origin（其他 origin 冇 Access-Control-Allow-Origin）；唔設 cookie。
 * T-024 只有封面圖；catalog.json、歌詞由 T-026 加
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppEnv } from '../app';
import { csvList } from '../lib/env';
import { serveImage } from './serve';

export const catalogRoutes = new Hono<AppEnv>();

const READ_METHODS = ['GET', 'HEAD'];

catalogRoutes.use(
    '*',
    cors({
        origin: (origin, c) => (csvList(c.env.PLAYER_ORIGINS).includes(origin) ? origin : null),
        allowMethods: READ_METHODS,
    }),
);

catalogRoutes.get('/img/:name', serveImage);
