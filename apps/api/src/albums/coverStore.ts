/*
 * API-017 寫 albums（parameterised；欄位名只嚟自常數）：一個位（cover / cover2）嘅兩張圖、來源版本、檢查結果，
 * 第一張連專輯色（冇畀 = 唔郁）。第二張加 `cover IS NOT NULL`：同時另一個請求清咗第一張 → 冇改到（null），唔會撞 D1 CHECK。
 * S-187：加 `updated_at`、`checks` 一樣先寫（檢查結果由請求開頭讀嘅專輯計；同步寫 checks 唔改 updated_at，所以兩個都要對）：
 * 冇改到 → missedCover() 再讀一次分 notFound／noFirstCover／stale
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

/** 寫唔到嘅原因（route 對應錯誤回應） */
export type CoverMiss = 'notFound' | 'noFirstCover' | 'stale';

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
             WHERE id = ?7 AND updated_at = ?8 AND checks = ?9${CONDITION[body.slot]}
             RETURNING ${ALBUM_COLUMNS}`,
        )
        .bind(
            body.cover,
            body.thumb,
            body.sourceEtag,
            body.accent,
            JSON.stringify(sortChecks(checks)),
            nextUpdatedAt(album.updated_at),
            album.id,
            album.updated_at,
            album.checks,
        )
        .first<AlbumRow>();

/** storeCover() 冇改到：專輯冇咗、第二張而第一張冇咗，否則係專輯喺讀入之後改過 */
export const missedCover = async (
    db: D1Database,
    id: string,
    slot: CoverKind,
): Promise<CoverMiss> => {
    const row = await db
        .prepare('SELECT cover FROM albums WHERE id = ?')
        .bind(id)
        .first<{ cover: string | null }>();
    if (!row) return 'notFound';
    return slot === 'cover2' && row.cover === null ? 'noFirstCover' : 'stale';
};
