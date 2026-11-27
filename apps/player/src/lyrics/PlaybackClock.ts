import { createContext, useContext } from 'react';

/**
 * 而家播到邊（秒；播放 controller 嘅 `positionSec`）：歌書跟歌行用（T-082）。主頁（HomeScene）提供；
 * 預設 0（測試、冇 controller）
 */
export const PlaybackClock = createContext<() => number>(() => 0);

export const usePlaybackClock = (): (() => number) => useContext(PlaybackClock);
