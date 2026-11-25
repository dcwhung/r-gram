import { type RefObject, useEffect } from 'react';
import logoUrl from '../../assets/logo-full.png';
import { MOTION } from '../../config/motion';
import { prefersReducedMotion } from '../../utils/motion';
import { createFlagRenderer, type FlagRenderer } from './flagRenderer';
import type { FlagScene } from './flagScene';

/** 減少動態效果時畫邊一刻：風已經去到全力，摺皺最自然 */
const STILL_FRAME_MS = MOTION.scene.flagGustMs;

const makeCanvas = (width: number, height: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
};

/** 開離屏 canvas；瀏覽器畀唔到 2D context = 冇旗（黑底照有，Preload 照行） */
const rendererFor = (scene: FlagScene): FlagRenderer | null => {
    try {
        return createFlagRenderer(scene, makeCanvas);
    } catch {
        return null;
    }
};

/** 載入 logo（隨 app 嘅圖，Service Worker 有 precache）；載入咗先叫 `onLoad` */
const loadLogo = (onLoad: (image: HTMLImageElement) => void): (() => void) => {
    const image = new Image();
    let live = true;
    image.onload = () => {
        if (live) onLoad(image);
    };
    image.src = logoUrl;
    return () => {
        live = false;
    };
};

/** 每格畫面畫一次，直到拆走 */
const animate = (draw: (elapsedMs: number) => void): (() => void) => {
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
        start ??= now;
        draw(now - start);
        frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
};

/**
 * Preload 旗幟動畫（Technical Spec「旗幟」：canvas 2D、移植 mockup 嘅布料網格）。
 * `scale` = 1 個設計單位幾多個 canvas 像素（已計 DPR 上限）。減少動態效果：畫一格靜止（logo 到咗再畫一次）。
 */
export const useFlagAnimation = (
    ref: RefObject<HTMLCanvasElement | null>,
    scene: FlagScene,
    scale: number,
): void => {
    useEffect(() => {
        const ctx = ref.current?.getContext('2d');
        const renderer = ctx ? rendererFor(scene) : null;
        if (!ctx || !renderer) return undefined;
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        const drawStill = () => renderer.draw(ctx, STILL_FRAME_MS);
        const still = prefersReducedMotion();
        const stopLogo = loadLogo((image) => {
            renderer.setLogo(image);
            if (still) drawStill();
        });
        if (still) drawStill();
        const stopAnimation = still ? () => {} : animate((ms) => renderer.draw(ctx, ms));
        return () => {
            stopLogo();
            stopAnimation();
        };
    }, [ref, scene, scale]);
};
