import { useSyncExternalStore } from 'react';
import { COARSE_POINTER_QUERY, isPhoneLandscape } from './deviceClass';

const VIEWPORT_EVENTS = ['resize', 'orientationchange'] as const;

/** 舊瀏覽器（同 jsdom）可能冇 matchMedia，或者回嘅結果冇 addEventListener */
const pointerQuery = (): (Partial<EventTarget> & { matches: boolean }) | undefined =>
    typeof window.matchMedia === 'function' ? window.matchMedia(COARSE_POINTER_QUERY) : undefined;

const subscribe = (onChange: () => void) => {
    const query = pointerQuery();
    VIEWPORT_EVENTS.forEach((name) => window.addEventListener(name, onChange));
    query?.addEventListener?.('change', onChange);
    return () => {
        VIEWPORT_EVENTS.forEach((name) => window.removeEventListener(name, onChange));
        query?.removeEventListener?.('change', onChange);
    };
};

const snapshot = () =>
    isPhoneLandscape({
        width: window.innerWidth,
        height: window.innerHeight,
        coarsePointer: pointerQuery()?.matches ?? false,
    });

/** 手機係咪打橫緊（跟住轉機、視窗大細同主要輸入） */
export const usePhoneLandscape = (): boolean => useSyncExternalStore(subscribe, snapshot);
