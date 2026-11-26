import { useEffect, useSyncExternalStore } from 'react';
import type { UpdateManager, UpdateStatus } from './updateManager';

/** App 要用嘅 UpdateManager 部分（測試可以用假嘅） */
export type UpdatePort = Pick<
    UpdateManager,
    'subscribe' | 'getSnapshot' | 'endLaunch' | 'applyNow'
>;

/** 冇 Service Worker 嘅環境（測試、開發）：永遠冇新版 */
export const NO_UPDATES: UpdatePort = {
    subscribe: () => () => {},
    getSnapshot: () => 'none',
    endLaunch: () => {},
    applyNow: () => {},
};

/** 而家嘅更新狀態（有新版等緊 = 出提示） */
export const useUpdateStatus = (port: UpdatePort): UpdateStatus =>
    useSyncExternalStore(port.subscribe, port.getSnapshot);

/** Preload 完咗（主頁出咗）就話畀 UpdateManager 知：之後唔再自動換版（S-197） */
export const useLaunchEnd = (port: UpdatePort, launched: boolean): void => {
    useEffect(() => {
        if (launched) port.endLaunch();
    }, [port, launched]);
};
