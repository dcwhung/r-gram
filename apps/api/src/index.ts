/*
 * r-gram-api：
 * - /auth/*：Google login（管理員）
 * - /api/*：管理端 SPA 用嘅 API（/api/health 公開，其餘要 session；改資料要 same-origin）
 * - /catalog/v1/*：公開 catalog.json、封面圖、歌詞（播放端用，CORS 只開畀 PLAYER_ORIGINS）
 */
import { Hono } from 'hono';
import type { AppEnv } from './app';

const app = new Hono<AppEnv>();

export default app;
