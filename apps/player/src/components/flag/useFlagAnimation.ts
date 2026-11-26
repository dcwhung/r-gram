import { type RefObject, useEffect, useState } from 'react';
import { prefersReducedMotion } from '../../utils/motion';
import { type FlagEvent, type FlagMode, initialFlagMode, nextFlagMode } from './flagMode';
import { showLive, showStill } from './flagPlayback';
import type { FlagScene } from './flagScene';

/**
 * Preload 旗幟動畫（Technical Spec「CR-010 → Preload 旗幟用 WebGL」，T-114）：WebGL 逐格飄；
 * 冇 WebGL、WebGL renderer 開唔到、context lost、減少動態效果 → 2D renderer 畫一格靜止（冇 animation loop）。
 * `scale` = 1 個設計單位幾多個 canvas 像素（已計 DPR 上限）。
 * 回傳而家嘅 mode：用嚟做 canvas 嘅 key（用過 WebGL 嘅 canvas 攞唔到 2D context，靜止要換一塊新嘅）。
 */
export const useFlagAnimation = (
    ref: RefObject<HTMLCanvasElement | null>,
    scene: FlagScene,
    scale: number,
): FlagMode => {
    const [mode, setMode] = useState(() => initialFlagMode(prefersReducedMotion()));
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return undefined;
        if (mode === 'still') return showStill(canvas, scene, scale);
        const onEvent = (event: FlagEvent) => setMode((now) => nextFlagMode(now, event));
        return showLive(canvas, scene, scale, onEvent);
    }, [ref, scene, scale, mode]);
    return mode;
};
