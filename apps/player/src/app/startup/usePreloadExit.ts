import { useEffect, useEffectEvent, useState } from 'react';
import { MOTION } from '../../config/motion';
import { durationFor } from '../../utils/motion';

/** Preload 畫面：顯示中 → 淡出中（主頁已經喺下面）→ 拆走 */
export type PreloadExit = 'shown' | 'leaving' | 'gone';

/**
 * 載入完之後點樣離開 Preload（Functional Spec US-001「成塊旗淡出，露出主頁」；設計稿 v16 時間線）：
 * 等進度線行完最後一步再停一停 → 叫 `onLeave()`（場景變主頁）同開始淡出 → 淡出完拆走 Preload。
 * 減少動態效果：兩段都係 0 毫秒（即時，只係等一個計時器）。
 */
export const usePreloadExit = (ready: boolean, onLeave: () => void): PreloadExit => {
    const [exit, setExit] = useState<PreloadExit>('shown');
    const leave = useEffectEvent(onLeave);
    useEffect(() => {
        if (!ready) return undefined;
        const { preloadStepMs, preloadHoldMs, flagFadeMs } = MOTION.scene;
        const fade = durationFor(flagFadeMs);
        let fadeTimer: ReturnType<typeof setTimeout> | undefined;
        const holdTimer = setTimeout(
            () => {
                leave();
                setExit('leaving');
                fadeTimer = setTimeout(() => setExit('gone'), fade);
            },
            durationFor(preloadStepMs + preloadHoldMs),
        );
        return () => {
            clearTimeout(holdTimer);
            clearTimeout(fadeTimer);
        };
    }, [ready]);
    return exit;
};
