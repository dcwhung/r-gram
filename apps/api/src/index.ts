/*
 * r-gram-api：
 * - /auth/*：Google login（管理員）
 * - /api/*：管理端 SPA 用嘅 API（/api/health 公開，其餘要 session；改資料要 same-origin）
 * - /catalog/v1/*：公開 catalog.json、封面圖、歌詞（播放端用，CORS 只開畀 PLAYER_ORIGINS）
 */
import { Hono } from 'hono';
import { apiRoutes } from './api/routes';
import type { AppEnv } from './app';
import { handleError, handleNotFound } from './lib/http';
import { noIndex, privateResponse } from './lib/securityHeaders';

const app = new Hono<AppEnv>();

app.use('*', noIndex);
app.use('/api/*', privateResponse);
app.use('/auth/*', privateResponse);
app.route('/api', apiRoutes);
app.notFound(handleNotFound);
app.onError(handleError);

export default app;
