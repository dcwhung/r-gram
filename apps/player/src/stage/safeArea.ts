import './safeArea.css';

/** 安全區：狀態列 / 動態島（top）同底部指示條（bottom）佔咗幾多 px */
export interface SafeAreaInsets {
    top: number;
    bottom: number;
}

const PROBE_CLASS = 'safe-area-probe';

/** 一粒睇唔見嘅 element：CSS 用 `env(safe-area-inset-*)` 做佢嘅 padding，JS 讀返計好嘅 px */
const probeElement = (): HTMLElement => {
    const existing = document.querySelector<HTMLElement>(`.${PROBE_CLASS}`);
    if (existing) return existing;
    const probe = document.createElement('div');
    probe.className = PROBE_CLASS;
    probe.setAttribute('aria-hidden', 'true');
    document.body.append(probe);
    return probe;
};

/** `'59px'` → 59；讀唔到（唔支援 `env()`）當 0 */
const pixels = (value: string): number => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/** 每次叫都重新讀：轉向、分屏之後安全區會變 */
export const readSafeAreaInsets = (): SafeAreaInsets => {
    const style = window.getComputedStyle(probeElement());
    return { top: pixels(style.paddingTop), bottom: pixels(style.paddingBottom) };
};
