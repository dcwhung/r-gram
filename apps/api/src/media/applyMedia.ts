/*
 * API-031 `media`（媒體配對）同 `clearAudio`（音檔已不在資料夾，Functional Spec D62）逐項套用：
 * - media：檔仲喺資料夾（唔係 → STALE）；手動指定嘅唔郁（MANUAL_KEPT）；MV 要嗰個歌號有音檔（NO_AUDIO，D54）
 * - clearAudio：audio_key 仲係預覽嗰個、唔係手動指定、個檔仲係唔喺資料夾，先清（否則 STALE）；MV 都唔喺度就一齊清
 */
import type { ApplyContext } from './applyContext';
import type { ClearItem, MediaItem } from './applyShape';
import { failedItem } from './applyResult';
import { itemMessage, type ItemCode } from './errors';
import { clearAudioLink, linkMedia } from './store';

/** 套用一項；唔套用 → 原因 */
const applyOne = async (
    db: D1Database,
    context: ApplyContext,
    item: MediaItem,
): Promise<ItemCode | undefined> => {
    const track = context.tracks.get(item.trackId);
    if (!track || !context.files.has(item.key)) return 'STALE';
    if (item.kind === 'audio' ? track.audioManual : track.mvManual) return 'MANUAL_KEPT';
    if (!context.hasAudio(track.no)) return 'NO_AUDIO';
    const updatedAt = await linkMedia(db, track.id, item.kind, item.key, track.updatedAt);
    if (updatedAt === null) return 'STALE';
    context.tracks.set(track.id, { ...track, updatedAt });
    return undefined;
};

/** 回應：`{ applied, skipped: [{ trackId, kind, code, message }] }` */
export const applyMedia = async (db: D1Database, context: ApplyContext, items: MediaItem[]) => {
    const skipped = [];
    for (const item of items) {
        const code = await applyOne(db, context, item);
        const { trackId, kind } = item;
        if (code) skipped.push({ trackId, kind, code, message: itemMessage(code) });
    }
    return { applied: items.length - skipped.length, skipped };
};

const clearOne = async (db: D1Database, context: ApplyContext, item: ClearItem) => {
    const track = context.tracks.get(item.trackId);
    const current =
        track &&
        !track.audioManual &&
        track.audioKey === item.audioKey &&
        !context.files.has(item.audioKey);
    if (!track || !current) return failedItem('STALE');
    const clearMv = track.mvKey !== null && !context.files.has(track.mvKey);
    const updatedAt = await clearAudioLink(db, track.id, item.audioKey, clearMv, track.updatedAt);
    if (updatedAt === null) return failedItem('STALE');
    context.tracks.set(track.id, { ...track, audioKey: null, updatedAt });
    return { ok: true as const };
};

export const applyClearAudio = async (
    db: D1Database,
    context: ApplyContext,
    items: ClearItem[],
) => {
    const results = [];
    for (const item of items)
        results.push({ trackId: item.trackId, ...(await clearOne(db, context, item)) });
    return results;
};
