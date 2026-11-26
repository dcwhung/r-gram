/*
 * albums 表嘅讀取（parameterised；欄位名只嚟自 rows.ts 嘅常數）。
 * CR-007：專輯由同步建立同更新（T-105），封面結果經 API-017（T-106）；人手寫入嘅 API 拎走
 */
import { ALBUM_COLUMNS, type AlbumRow } from './rows';

export const findAlbum = (db: D1Database, id: string) =>
    db.prepare(`SELECT ${ALBUM_COLUMNS} FROM albums WHERE id = ?`).bind(id).first<AlbumRow>();
