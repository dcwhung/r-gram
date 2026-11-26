/*
 * 歌曲 API，掛喺 /api/tracks（Technical Spec API-040、041）。喺 api/routes.ts 嘅 session + same-origin 守門之後
 *（backlog B-019 ①）；寫入成功之後生成 catalog 係 api/afterWrite.ts 嘅後置步驟（T-026）。
 * CR-007：改歌號、參考欄、手動指定（API-021）同刪歌（API-022）取消；T-106：歌曲文字讀寫媒體 bucket（text.ts）
 */
import { Hono } from 'hono';
import type { AppEnv } from '../app';
import { getTrackText, putTrackText } from './text';

export const trackRoutes = new Hono<AppEnv>();

trackRoutes.get('/:id/text', getTrackText);
trackRoutes.put('/:id/text', putTrackText);
