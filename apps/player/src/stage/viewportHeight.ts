import { readSafeAreaInsets } from './safeArea';
import './viewportHeight.css';

/*
 * 舞台用嘅 viewport 高度。
 * 瀏覽器分頁：innerHeight（同以前一樣）。
 * 主畫面 app（standalone）：iOS 26+ 嘅 innerHeight、100dvh、visualViewport 會喺「螢幕 − 頂部安全區」同成個螢幕之間
 * 不停跳（真機 diag：793 ↔ 852，每 ~33ms），舞台跟住跳 = 底部安全區閃；100vh / 100lvh 一直係成個螢幕。
 * 所以 standalone 用 max(innerHeight, 100lvh)（唔支援 lvh 嘅用 100vh；同 global.css 嘅 standalone 頁面高度一致）。
 */

/** 高度嚟自邊度：innerHeight，定係隱藏 probe 量到嘅 100lvh / 100vh */
export type HeightSource = 'inner' | 'lvh' | 'vh';

export interface StageHeight {
    source: HeightSource;
    height: number;
}

/** 隱藏 probe 量到嘅全螢幕高度 */
export interface FullScreenHeight {
    source: 'lvh' | 'vh';
    height: number;
}

const STANDALONE_QUERY = '(display-mode: standalone)';
const PROBE_CLASS = 'full-height-probe';
const LARGE_VIEWPORT_HEIGHT = '100lvh';

/** 分頁照用 innerHeight；standalone 揀高嗰個（一樣高都用全螢幕：來源唔會跟住 innerHeight 跳） */
export const pickStageHeight = (
    innerHeight: number,
    standalone: boolean,
    full: FullScreenHeight,
): StageHeight =>
    standalone && full.height >= innerHeight ? full : { source: 'inner', height: innerHeight };

/** 主畫面 app：display-mode media query；iOS 舊 API `navigator.standalone` 都算 */
export const isStandalone = (): boolean => {
    const query =
        typeof window.matchMedia === 'function' ? window.matchMedia(STANDALONE_QUERY) : undefined;
    return (
        query?.matches === true ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
};

/** 一粒睇唔見嘅 element：CSS 高度 100vh，識 lvh 嘅瀏覽器用 100lvh（viewportHeight.css） */
const probeElement = (): HTMLElement => {
    const existing = document.querySelector<HTMLElement>(`.${PROBE_CLASS}`);
    if (existing) return existing;
    const probe = document.createElement('div');
    probe.className = PROBE_CLASS;
    probe.setAttribute('aria-hidden', 'true');
    document.body.append(probe);
    return probe;
};

const supportsLargeViewport = () =>
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('height', LARGE_VIEWPORT_HEIGHT);

const readFullScreenHeight = (): FullScreenHeight => ({
    source: supportsLargeViewport() ? 'lvh' : 'vh',
    height: probeElement().getBoundingClientRect().height,
});

/** 每次叫都重新讀（轉向會變）；分頁唔整 probe */
export const readStageHeight = (): StageHeight => {
    const inner = window.innerHeight;
    if (!isStandalone()) return { source: 'inner', height: inner };
    return pickStageHeight(inner, true, readFullScreenHeight());
};

/**
 * useStageFit 嘅快照（`useSyncExternalStore` 要求冇變時係同一個值：用字串）：
 * `闊 高 頂部安全區 底部安全區`
 */
export const viewportKey = (): string => {
    const { top, bottom } = readSafeAreaInsets();
    return [window.innerWidth, readStageHeight().height, top, bottom].join(' ');
};
