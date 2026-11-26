/*
 * 播放端本機資料（localStorage）嘅 key：集中喺呢度（Technical Spec「播放端本機資料」）。
 * 讀取時驗 shape，壞咗就當冇。改 shape 就改 key 嘅版本號。
 */

/** `{ etag, document }`：上次成功載入嘅 catalog */
export const CATALOG_STORAGE_KEY = 'rgram.catalog.v1';

/** `[{ trackId, addedAt }]`：收藏咗嘅歌，按收藏先後（favourites/store.ts） */
export const FAVOURITES_STORAGE_KEY = 'rgram.favourites.v1';

/** `{ shuffle, repeat }`：播放模式（Functional Spec「播放模式」儲存；playback/playModes.ts） */
export const PLAY_MODE_STORAGE_KEY = 'rgram.playMode.v1';

/**
 * sessionStorage（只限呢個分頁）：上次因為新版而 reload 嘅時間（毫秒）。PWA 更新防 loop 用
 *（Technical Spec 實現注意事項 12；pwa/reloadGuard.ts）
 */
export const UPDATE_RELOAD_STORAGE_KEY = 'rgram.update.reloadedAt.v1';
