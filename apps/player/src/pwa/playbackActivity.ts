import type { PlaybackState, PlaybackStatus } from '../app/playbackState';

/**
 * 新版只喺播放狀態係呢幾個時先換（Technical Spec 實現注意事項 12：idle / paused；Functional Spec D14「等停咗先更新」）。
 * 用「准許」清單：T-038 加嘅狀態（例如 loading）預設當播緊，唔會喺載入途中 reload。
 */
const UPDATE_SAFE_STATUSES: ReadonlySet<PlaybackStatus> = new Set<PlaybackStatus>([
    'idle',
    'paused',
]);

/** 播緊歌，或者 MV 電視開住（Functional Spec US-011「播緊歌 / MV 時唔即時 reload」） */
export const blocksUpdate = (playback: PlaybackState, mvOpen: boolean): boolean =>
    mvOpen || !UPDATE_SAFE_STATUSES.has(playback.status);
