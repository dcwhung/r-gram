/*
 * 掃描套用寫 tracks 嘅媒體連結（API-031 `media`、`clearAudio`）：全部 parameterised，欄位名只嚟自常數。
 * 永遠唔刪歌（D62）。CR-007（D71）：冇手動指定
 */
import type { MediaKind } from '@r-gram/catalog';
import { nextUpdatedAt } from '../lib/updatedAt';

const COLUMNS: Readonly<Record<MediaKind, string>> = { audio: 'audio_key', mv: 'mv_key' };

/** 寫入後嘅 updated_at；冇改到（冇咗呢首歌）→ null */
export const linkMedia = async (
    db: D1Database,
    trackId: string,
    kind: MediaKind,
    key: string,
    previous: string,
): Promise<string | null> => {
    return db
        .prepare(
            `UPDATE tracks SET ${COLUMNS[kind]} = ?1, updated_at = ?2
             WHERE id = ?3
             RETURNING updated_at`,
        )
        .bind(key, nextUpdatedAt(previous), trackId)
        .first<string>('updated_at');
};

/**
 * 清走消失咗嘅音檔連結：只喺 audio_key 仲係 `audioKey` 時清；冇音檔就冇 MV（D54；S-135），
 * 所以 MV 連結一齊清（MV 檔仲喺資料夾都清）。歌本身同其他欄唔郁。改唔到 → null
 */
export const clearAudioLink = async (
    db: D1Database,
    trackId: string,
    audioKey: string,
    previous: string,
): Promise<string | null> =>
    db
        .prepare(
            `UPDATE tracks SET audio_key = NULL, mv_key = NULL, updated_at = ?1
             WHERE id = ?2 AND audio_key = ?3
             RETURNING updated_at`,
        )
        .bind(nextUpdatedAt(previous), trackId, audioKey)
        .first<string>('updated_at');
