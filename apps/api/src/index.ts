/*
 * r-gram-api：
 * - /auth/*：Google login（管理員）
 * - /api/*：管理端 SPA 用嘅 API（/api/health 公開，其餘要 session；改資料要 same-origin）
 * - /catalog/v1/*：公開 catalog.json、封面圖、歌詞（播放端用，CORS 只開畀 PLAYER_ORIGINS）；T-026 先加，而家回 404
 * 次序：回應 header（包住所有回應，連錯誤）→ env 驗證 → route
 */
import { Hono } from 'hono';
import { apiRoutes } from './api/routes';
import type { AppEnv } from './app';
import { authRoutes } from './auth/routes';
import { handleError, handleNotFound } from './lib/http';
import { noIndex, privateResponse } from './lib/securityHeaders';
import { requireValidEnv } from './lib/validateEnv';

const app = new Hono<AppEnv>();

app.use('*', noIndex);
app.use('/api/*', privateResponse);
app.use('/auth/*', privateResponse);
app.use('*', requireValidEnv);
app.route('/auth', authRoutes);
app.route('/api', apiRoutes);
app.notFound(handleNotFound);
app.onError(handleError);

export default app;
