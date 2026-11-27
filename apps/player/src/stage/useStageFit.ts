import { useSyncExternalStore } from 'react';
import { fitStage, type StageFit } from './fitStage';
import { viewportKey } from './viewportHeight';

const VIEWPORT_EVENTS = ['resize', 'orientationchange'] as const;

const subscribe = (onChange: () => void) => {
    VIEWPORT_EVENTS.forEach((name) => window.addEventListener(name, onChange));
    return () => VIEWPORT_EVENTS.forEach((name) => window.removeEventListener(name, onChange));
};

/**
 * 跟住 viewport 大細同安全區計舞台縮放。快照係字串（viewportKey），再計返 fit；
 * 主畫面 app 嘅高度用全螢幕（stage/viewportHeight.ts），iOS 跳嚟跳去嘅 innerHeight 唔會令舞台跟住跳
 */
export const useStageFit = (): StageFit => {
    const key = useSyncExternalStore(subscribe, viewportKey);
    const [width = 0, height = 0, top = 0, bottom = 0] = key.split(' ').map(Number);
    return fitStage(width, height, { top, bottom });
};
