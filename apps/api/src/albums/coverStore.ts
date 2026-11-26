/*
 * API-017 寫 albums（parameterised；欄位名只嚟自常數）：一個位（cover / cover2）嘅兩張圖、來源版本、檢查結果，
 * 第一張連專輯色（冇畀 = 唔郁）。第二張加 `cover IS NOT NULL`：同時另一個請求清咗第一張 → 冇改到（null），唔會撞 D1 CHECK
 */
import { sortChecks, type Check, type CoverKind } from '@r-gram/catalog';
import { nextUpdatedAt } from '../lib/updatedAt';
import type { CoverBody } from './coverBody';
import { ALBUM_COLUMNS, type AlbumRow } from './rows';

const SLOT_SQL: Readonly<Record<CoverKind, string>> = {
    cover: `cover = ?1, thumb = ?2, cover_source_etag = ?3, accent = COALESCE(?4, accent)`,
    // ?4（專輯色）唔用：SQLite 嘅參數數目 = 最大嘅編號，多綁一個冇問題
    cover2: 'cover2 = ?1, thumb2 = ?2, cover2_source_etag = ?3',
};

const CONDITION: Readonly<Record<CoverKind, string>> = {
    cover: '',
    cover2: ' AND cover IS NOT NULL',
};

export const storeCover = (
    db: D1Database,
    album: AlbumRow,
    body: CoverBody,
    checks: readonly Check[],
): Promise<AlbumRow | null> =>
    db
        .prepare(
            `UPDATE albums SET ${SLOT_SQL[body.slot]}, checks = ?5, updated_at = ?6
             WHERE id = ?7${CONDITION[body.slot]} RETURNING ${ALBUM_COLUMNS}`,
        )
        .bind(
            body.cover,
            body.thumb,
            body.sourceEtag,
            body.accent,
            JSON.stringify(sortChecks(checks)),
            nextUpdatedAt(album.updated_at),
            album.id,
        )
        .first<AlbumRow>();
