/*
 * API-031 `media`（媒體配對）同 `clearAudio`（音檔已不在資料夾，Functional Spec D62）逐項套用：
 * - media：檔仲喺資料夾（唔係 → STALE）；手動指定嘅唔郁（MANUAL_KEPT）；MV 要嗰個歌號有音檔（NO_AUDIO，D54）
 * - clearAudio：audio_key 仲係預覽嗰個、唔係手動指定、個檔仲係唔喺資料夾，先清（否則 STALE）；冇音檔就冇 MV，
 *   掃描配對嘅 MV 連結一齊清（MV 檔仲喺資料夾都清，S-135）；手動指定嘅 MV 同手動指定嘅音檔一樣唔郁
 * 一項出 exception → 嗰項 INTERNAL，其他照做（applyGuard.ts）
 */
import type { ApplyContext } from './applyContext';
import type { ClearItem, MediaItem } from './applyShape';
import { guardItem } from './applyGuard';
import { failedItem } from './applyResult';
import { itemMessage, type ItemCode } from './errors';
import { clearAudioLink, linkMedia } from './store';

/** 出 exception 嘅項目（W-035） */
const INTERNAL: ItemCode = 'INTERNAL';

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
        const code = await guardItem(() => applyOne(db, context, item), INTERNAL);
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
    const updatedAt = await clearAudioLink(db, track.id, item.audioKey, track.updatedAt);
    if (updatedAt === null) return failedItem('STALE');
    const mvKey = track.mvManual ? track.mvKey : null;
    context.tracks.set(track.id, { ...track, audioKey: null, mvKey, updatedAt });
    return { ok: true as const };
};

export const applyClearAudio = async (
    db: D1Database,
    context: ApplyContext,
    items: ClearItem[],
) => {
    const results = [];
    for (const item of items) {
        const result = await guardItem(() => clearOne(db, context, item), failedItem(INTERNAL));
        results.push({ trackId: item.trackId, ...result });
    }
    return results;
};
