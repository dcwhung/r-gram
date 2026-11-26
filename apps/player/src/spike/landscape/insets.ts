/*
 * 四邊安全區（`env(safe-area-inset-*)`）：spike 自己嘅探針（產品嘅 stage/safeArea.ts 只讀 top、bottom；T-111 先加 left、right）
 */
import type { QuarterTurn } from './rotation';

export interface Insets {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

const PROBE_CLASS = 'spike-inset-probe';

const probe = (): HTMLElement => {
    const existing = document.querySelector<HTMLElement>(`.${PROBE_CLASS}`);
    if (existing) return existing;
    const element = document.createElement('div');
    element.className = PROBE_CLASS;
    element.setAttribute('aria-hidden', 'true');
    document.body.append(element);
    return element;
};

const pixels = (value: string) => Number.parseFloat(value) || 0;

export const readInsets = (): Insets => {
    const style = window.getComputedStyle(probe());
    return {
        top: pixels(style.paddingTop),
        right: pixels(style.paddingRight),
        bottom: pixels(style.paddingBottom),
        left: pixels(style.paddingLeft),
    };
};

/**
 * 舞台四邊對應 viewport 邊一邊（同 `stageBox` 一樣嘅轉法）。
 * −90：舞台頂 = viewport 左、舞台左 = viewport 底；+90：舞台頂 = viewport 右、舞台左 = viewport 頂
 */
export const stageInsets = (turn: QuarterTurn, insets: Insets): Insets => {
    const { top, right, bottom, left } = insets;
    if (turn === -90) return { top: left, right: top, bottom: right, left: bottom };
    if (turn === 90) return { top: right, right: bottom, bottom: left, left: top };
    return insets;
};
