/*
 * 掃描套用寫 tracks 嘅媒體連結（API-031 `media`、`clearAudio`）：全部 parameterised，欄位名只嚟自常數。
 * 手動指定嘅（`*_manual = 1`）一律唔郁（WHERE 條件），所以讀同寫之間被人手指定都唔會蓋走。永遠唔刪歌（D62）
 */
import type { MediaKind } from '@r-gram/catalog';
import { nextUpdatedAt } from '../lib/updatedAt';

const COLUMNS: Readonly<Record<MediaKind, { key: string; manual: string }>> = {
    audio: { key: 'audio_key', manual: 'audio_manual' },
    mv: { key: 'mv_key', manual: 'mv_manual' },
};

/** 寫入後嘅 updated_at；冇改到（手動指定咗或者冇咗呢首歌）→ null */
export const linkMedia = async (
    db: D1Database,
    trackId: string,
    kind: MediaKind,
    key: string,
    previous: string,
): Promise<string | null> => {
    const { key: column, manual } = COLUMNS[kind];
    return db
        .prepare(
            `UPDATE tracks SET ${column} = ?1, updated_at = ?2
             WHERE id = ?3 AND ${manual} = 0
             RETURNING updated_at`,
        )
        .bind(key, nextUpdatedAt(previous), trackId)
        .first<string>('updated_at');
};

/**
 * 清走消失咗嘅音檔連結：只喺 audio_key 仲係 `audioKey`、而且唔係手動指定時清；`clearMv` = MV 都唔喺資料夾，
 * 一齊清（手動指定嘅 MV 唔清）。其他欄唔郁。改唔到 → null
 */
export const clearAudioLink = async (
    db: D1Database,
    trackId: string,
    audioKey: string,
    clearMv: boolean,
    previous: string,
): Promise<string | null> =>
    db
        .prepare(
            `UPDATE tracks SET audio_key = NULL,
                 mv_key = CASE WHEN ?1 = 1 AND mv_manual = 0 THEN NULL ELSE mv_key END,
                 updated_at = ?2
             WHERE id = ?3 AND audio_manual = 0 AND audio_key = ?4
             RETURNING updated_at`,
        )
        .bind(clearMv ? 1 : 0, nextUpdatedAt(previous), trackId, audioKey)
        .first<string>('updated_at');
