/*
 * 播放端本機資料（localStorage）嘅 key：集中喺呢度（Technical Spec「播放端本機資料」）。
 * 讀取時驗 shape，壞咗就當冇。改 shape 就改 key 嘅版本號。
 */

/** `{ etag, document }`：上次成功載入嘅 catalog */
export const CATALOG_STORAGE_KEY = 'rgram.catalog.v1';
