import { useEffect, useSyncExternalStore } from 'react';
import type { UpdateManager, UpdateStatus } from './updateManager';

/** App 要用嘅 UpdateManager 部分（測試可以用假嘅） */
export type UpdatePort = Pick<
    UpdateManager,
    'subscribe' | 'getSnapshot' | 'setPlaying' | 'applyNow'
>;

/** 冇 Service Worker 嘅環境（測試、開發）：永遠冇新版 */
export const NO_UPDATES: UpdatePort = {
    subscribe: () => () => {},
    getSnapshot: () => 'none',
    setPlaying: () => {},
    applyNow: () => {},
};

/** 將播放狀態交畀 UpdateManager，返回而家嘅更新狀態 */
export const useUpdateStatus = (port: UpdatePort, playing: boolean): UpdateStatus => {
    useEffect(() => {
        port.setPlaying(playing);
    }, [port, playing]);
    return useSyncExternalStore(port.subscribe, port.getSnapshot);
};
