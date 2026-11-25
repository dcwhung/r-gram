import { useSyncExternalStore } from 'react';
import { fitStage, type StageFit } from './fitStage';

const VIEWPORT_EVENTS = ['resize', 'orientationchange'] as const;

const subscribe = (onChange: () => void) => {
    VIEWPORT_EVENTS.forEach((name) => window.addEventListener(name, onChange));
    return () => VIEWPORT_EVENTS.forEach((name) => window.removeEventListener(name, onChange));
};

/** `useSyncExternalStore` 要求快照喺冇變時係同一個值：用字串做快照，再計返 fit */
const viewportKey = () => `${window.innerWidth}x${window.innerHeight}`;

/** 跟住 viewport 大細計舞台縮放 */
export const useStageFit = (): StageFit => {
    const key = useSyncExternalStore(subscribe, viewportKey);
    const [width = 0, height = 0] = key.split('x').map(Number);
    return fitStage(width, height);
};
