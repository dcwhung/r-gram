import { useSyncExternalStore } from 'react';
import { fitStage, type StageFit } from './fitStage';
import { readSafeAreaInsets } from './safeArea';

const VIEWPORT_EVENTS = ['resize', 'orientationchange'] as const;

const subscribe = (onChange: () => void) => {
    VIEWPORT_EVENTS.forEach((name) => window.addEventListener(name, onChange));
    return () => VIEWPORT_EVENTS.forEach((name) => window.removeEventListener(name, onChange));
};

/** `useSyncExternalStore` 要求快照喺冇變時係同一個值：用字串做快照，再計返 fit */
const viewportKey = () => {
    const { top, bottom } = readSafeAreaInsets();
    return [window.innerWidth, window.innerHeight, top, bottom].join(' ');
};

/** 跟住 viewport 大細同安全區計舞台縮放 */
export const useStageFit = (): StageFit => {
    const key = useSyncExternalStore(subscribe, viewportKey);
    const [width = 0, height = 0, top = 0, bottom = 0] = key.split(' ').map(Number);
    return fitStage(width, height, { top, bottom });
};
