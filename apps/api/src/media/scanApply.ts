/*
 * API-031 POST /api/albums/:albumId/scan/apply（T-025）：只套用 body 列出、管理員確認咗嘅項目。
 * 次序：驗形狀（400）→ 冇呢張碟（404）→ 讀狀態 + list 資料夾 → 驗同呢張碟對唔對得上（400）→
 * clearAudio → media → create → songTexts，逐項回結果（一項失敗唔影響其他；一項出 exception = 嗰項 INTERNAL，
 * 回應照 200，review W-035）。
 * 封面唔經呢度（管理端處理圖之後行 API-050 + API-013）。成功（200）之後 api/afterWrite.ts 生成一次 catalog，回應加 `catalog`
 */
import type { Context } from 'hono';
import { findAlbum } from '../albums/store';
import type { AppEnv } from '../app';
import { readJsonObject } from '../lib/http';
import { contextIssues, loadApplyContext } from './applyContext';
import { applyCreate } from './applyCreate';
import { applyClearAudio, applyMedia } from './applyMedia';
import { readApplyShape } from './applyShape';
import { applySongTexts } from './applyText';
import { scanError, scanNotAnObject, scanValidationError } from './errors';

export const scanApply = async (c: Context<AppEnv>, albumId: string) => {
    const raw = await readJsonObject(c);
    if (!raw) return scanNotAnObject(c);
    const body = readApplyShape(raw);
    if (Array.isArray(body)) return scanValidationError(c, body);
    const album = await findAlbum(c.env.DB, albumId);
    if (!album) return scanError(c, 'notFound');
    const context = await loadApplyContext(c.env.DB, c.env.MEDIA, album);
    const issues = contextIssues(context, body);
    if (issues.length > 0) return scanValidationError(c, issues);
    const clearAudio = await applyClearAudio(c.env.DB, context, body.clearAudio);
    const media = await applyMedia(c.env.DB, context, body.media);
    const create = await applyCreate(c, context, body.create);
    const songTexts = await applySongTexts(c, context, body.songTexts);
    return c.json({ media, create, songTexts, clearAudio });
};
