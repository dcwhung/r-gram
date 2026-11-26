/*
 * 旗幟點樣上畫面（T-114）：WebGL 逐格飄（showLive），或者 2D renderer 畫一格靜止（showStill）。
 * 兩個都回傳拆走嘅 function：拆走之後冇 animation frame、冇 listener、冇 GL 資源留低。
 */
import logoUrl from '../../assets/logo-full.png';
import { MOTION } from '../../config/motion';
import { createFlagGl, type FlagGl } from './flagGl';
import type { FlagEvent } from './flagMode';
import { createFlagRenderer, type FlagRenderer } from './flagRenderer';
import type { FlagScene } from './flagScene';

/** 靜止嗰格畫邊一刻：風已經去到全力，摺皺最自然 */
const STILL_FRAME_MS = MOTION.scene.flagGustMs;

/** 唔要 alpha（全畫面不透明）、唔要 depth / stencil；邊位要 antialias（布料同黑底交界） */
const GL_OPTIONS: WebGLContextAttributes = {
    alpha: false,
    antialias: true,
    depth: false,
    stencil: false,
};

const CONTEXT_LOST = 'webglcontextlost';

const noop = () => {};

const makeCanvas = (width: number, height: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
};

/** 開離屏 canvas；瀏覽器畀唔到 2D context = 冇旗（黑底照有，Preload 照行） */
const stillRendererFor = (scene: FlagScene): FlagRenderer | null => {
    try {
        return createFlagRenderer(scene, makeCanvas);
    } catch {
        return null;
    }
};

const liveRendererFor = (gl: WebGLRenderingContext, scene: FlagScene, scale: number) => {
    try {
        return createFlagGl(gl, scene, scale, makeCanvas);
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

/** 2D 靜止一格（logo 到咗再畫一次）；`scale` = 1 個設計單位幾多個 canvas 像素 */
export const showStill = (
    canvas: HTMLCanvasElement,
    scene: FlagScene,
    scale: number,
): (() => void) => {
    const ctx = canvas.getContext('2d');
    const renderer = ctx ? stillRendererFor(scene) : null;
    if (!ctx || !renderer) return noop;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const draw = () => renderer.draw(ctx, STILL_FRAME_MS);
    draw();
    return loadLogo((image) => {
        renderer.setLogo(image);
        draw();
    });
};

/** WebGL 飄起：每格畫，context lost 即刻停 */
const wave = (canvas: HTMLCanvasElement, renderer: FlagGl, onEvent: (e: FlagEvent) => void) => {
    const stopAnimation = animate(renderer.draw);
    const stopLogo = loadLogo(renderer.setLogo);
    const onLost = () => {
        stopAnimation();
        onEvent('context-lost');
    };
    canvas.addEventListener(CONTEXT_LOST, onLost);
    return () => {
        canvas.removeEventListener(CONTEXT_LOST, onLost);
        stopLogo();
        stopAnimation();
        renderer.dispose();
    };
};

/**
 * WebGL 飄揚。開唔到 context：同一塊 canvas 未有 context，直接畫 2D 靜止一格。
 * 有 context 但 renderer 開唔到、或者之後 context lost：`onEvent` 通知（呼叫者換一塊新 canvas 畫靜止）
 */
export const showLive = (
    canvas: HTMLCanvasElement,
    scene: FlagScene,
    scale: number,
    onEvent: (event: FlagEvent) => void,
): (() => void) => {
    const gl = canvas.getContext('webgl', GL_OPTIONS);
    if (!gl) return showStill(canvas, scene, scale);
    const renderer = liveRendererFor(gl, scene, scale);
    if (renderer) return wave(canvas, renderer, onEvent);
    // 起到一半失敗：放低成個 context，佢已經開咗嘅 program、buffer、texture 一齊釋放（S-256）
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    onEvent('gl-failed');
    return noop;
};
