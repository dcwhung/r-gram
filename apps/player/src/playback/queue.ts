/*
 * 播放隊列（純函數，冇 I/O；Technical Spec「playback/queue.ts」、T-011 報告 §2.1）。
 * 只計播得嘅歌（有音檔，D11）：叫嘅一方傳入嘅 `trackIds` 已經係播得嘅歌、碟嘅次序。
 * 引擎嘅 `ended` handler 會同步叫 `nextTrack()`，所以呢度一定要同步、唔可以讀 React state。
 * 隨機（US-014）：喺而家隻碟入面，一輪之內唔重覆；播完一輪再洗牌（新一輪第一首唔會係啱啱播完嗰首）。
 * Favourites 碟（T-070）一樣用：佢只係另一串 `trackIds`（收藏有變就 `refreshQueue`）。
 */
import type { PlayMode } from './playModes';

export interface Queue {
    readonly mode: PlayMode;
    /** 播得嘅歌，碟嘅次序 */
    readonly trackIds: readonly string[];
    /** 今輪播嘅次序：順序同重覆 = `trackIds`；隨機 = 今輪洗牌結果 */
    readonly order: readonly string[];
}

export type Random = () => number;

/** 自動（一首播完）定係用戶要求（鎖屏下一首）：重覆一首只影響自動 */
export type Step = 'auto' | 'skip';

export interface QueueMove {
    queue: Queue;
    /** null = 冇下一首（順序播放播完最後一首） */
    trackId: string | null;
}

/** Fisher–Yates */
const shuffle = (ids: readonly string[], random: Random): string[] => {
    const out = [...ids];
    for (let index = out.length - 1; index > 0; index -= 1) {
        const pick = Math.floor(random() * (index + 1));
        [out[index], out[pick]] = [out[pick] ?? '', out[index] ?? ''];
    }
    return out;
};

/** 隨機開始：揀咗嗰首排第一，其餘洗牌 */
const roundFrom = (ids: readonly string[], first: string | null, random: Random) =>
    first && ids.includes(first)
        ? [
              first,
              ...shuffle(
                  ids.filter((id) => id !== first),
                  random,
              ),
          ]
        : shuffle(ids, random);

/** 一輪播完再洗：啱啱播完嗰首唔排第一（得一首就冇得揀） */
const nextRound = (ids: readonly string[], last: string, random: Random): string[] => {
    const round = shuffle(ids, random);
    if (round.length > 1 && round[0] === last) [round[0], round[1]] = [round[1] ?? '', last];
    return round;
};

export const createQueue = (
    trackIds: readonly string[],
    mode: PlayMode,
    currentId: string | null,
    random: Random,
): Queue => ({
    mode,
    trackIds,
    order: mode === 'shuffle' ? roundFrom(trackIds, currentId, random) : trackIds,
});

/** 轉模式：轉去隨機 = 由而家嗰首開始新一輪；離開隨機 = 返碟嘅次序 */
export const withMode = (
    queue: Queue,
    mode: PlayMode,
    currentId: string | null,
    random: Random,
): Queue => createQueue(queue.trackIds, mode, currentId, random);

/**
 * 載入嘅碟換咗歌單（T-070：Favourites 碟播緊時收藏有變）：唔重新開始。順序同重覆 = 新歌單；
 * 隨機 = 今輪照舊（拎走冇咗嘅歌），新加嘅歌洗牌後排喺今輪最尾
 */
export const refreshQueue = (queue: Queue, trackIds: readonly string[], random: Random): Queue => {
    if (queue.mode !== 'shuffle') return { ...queue, trackIds, order: trackIds };
    const kept = queue.order.filter((id) => trackIds.includes(id));
    const added = trackIds.filter((id) => !queue.order.includes(id));
    return { ...queue, trackIds, order: [...kept, ...shuffle(added, random)] };
};

/** 已經係最後一首時嘅下一首：順序 = 冇；隨機 = 新一輪；重覆 = 返第一首 */
const afterLast = (queue: Queue, last: string, random: Random): QueueMove => {
    if (queue.mode === 'order') return { queue, trackId: null };
    if (queue.mode !== 'shuffle') return { queue, trackId: queue.order[0] ?? null };
    const order = nextRound(queue.trackIds, last, random);
    return { queue: { ...queue, order }, trackId: order[0] ?? null };
};

export const nextTrack = (
    queue: Queue,
    currentId: string,
    step: Step,
    random: Random,
): QueueMove => {
    const index = queue.order.indexOf(currentId);
    if (index === -1) return { queue, trackId: queue.order[0] ?? null };
    if (step === 'auto' && queue.mode === 'one') return { queue, trackId: currentId };
    const next = queue.order[index + 1];
    return next === undefined ? afterLast(queue, currentId, random) : { queue, trackId: next };
};

/**
 * 次序上嘅上一首（純函數，唔睇播咗幾耐）。「播咗超過 3 秒 = 由頭」（D110）喺 controller 嘅 `previous()`。
 * 第一首之前：重覆兩個模式兜去最後一首；順序同隨機（今輪開頭）= 冇
 */
export const previousTrack = (queue: Queue, currentId: string): string | null => {
    const index = queue.order.indexOf(currentId);
    if (index > 0) return queue.order[index - 1] ?? null;
    const wraps = index === 0 && (queue.mode === 'all' || queue.mode === 'one');
    return wraps ? (queue.order[queue.order.length - 1] ?? null) : null;
};

/** 未揀歌㩒 play、播完之後再播（D85、D99）：碟嘅第一首播得嘅歌，所有模式一樣 */
export const firstTrack = (queue: Queue): string | null => queue.trackIds[0] ?? null;
