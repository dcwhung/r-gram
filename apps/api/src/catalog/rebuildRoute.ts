/*
 * API-061 POST /api/catalog/rebuild（T-026）：重新生成 catalog.json。平時唔使叫（每個寫入之後自動生成），
 * 只係畀管理端喺生成失敗之後「重試」用（Functional Spec D30）。已經過 session + same-origin 守門（api/routes.ts）。
 * 自己就係生成，所以唔行寫入後置步驟（skipPostWrite：唔會生成兩次，backlog B-043 ③）。
 * 200：CatalogStatus + unchanged；失敗：422 INVALID_DOCUMENT / 502 CATALOG_WRITE_FAILED（catalog_state 已記低）
 */
import { Hono } from 'hono';
import { skipPostWrite, type PostWriteHook } from '../api/afterWrite';
import type { AppEnv } from '../app';
import { catalogError, FAILURE_SITUATION } from './errors';
import { rebuildCatalog, statusOf } from './rebuild';
import type { CatalogFailure } from './state';

export const catalogAdminRoutes = new Hono<AppEnv>();

catalogAdminRoutes.post('/rebuild', skipPostWrite, async (c) => {
    const result = await rebuildCatalog(c.env, c.get('email'));
    if (result.ok) return c.json(result);
    return catalogError(c, FAILURE_SITUATION[result.error as CatalogFailure]);
});

/** api/afterWrite.ts 嘅 hook：每個成功嘅 /api 寫入之後生成，回應加 `catalog` */
export const rebuildAfterWrite: PostWriteHook = async (c) =>
    statusOf(await rebuildCatalog(c.env, c.get('email')));
