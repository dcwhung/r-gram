import { readStageHeight, viewportKey } from '../stage/viewportHeight';
import {
    BOX_SELECTORS,
    type Box,
    FIT_VARIABLES,
    type FitName,
    type Insets,
    type Snapshot,
    UNIT_PROBES,
    type UnitName,
    type VisualViewportSize,
} from './snapshot';

/*
 * 讀數用嘅隱藏 element：inline style（唔使等 CSS 載入，DOMContentLoaded 嗰刻已經量得），
 * position: fixed 唔佔位、睇唔見、㩒唔到。診斷閂咗就拆走。
 */
const HIDDEN = 'position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none;';
const SAFE_PADDING =
    'height:0;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) ' +
    'env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);';
const DISPLAY_MODES = ['standalone', 'fullscreen', 'minimal-ui', 'browser'] as const;
const NONE = '-';

export interface Probes {
    host: HTMLElement;
    /** 唔支援嘅單位 = null（唔會整 element） */
    units: Readonly<Record<UnitName, HTMLElement | null>>;
    safe: HTMLElement;
}

const supports = (value: string) =>
    typeof CSS === 'undefined' || typeof CSS.supports !== 'function'
        ? true
        : CSS.supports('height', value);

const probe = (host: HTMLElement, style: string): HTMLElement => {
    const element = document.createElement('div');
    element.style.cssText = HIDDEN + style;
    host.append(element);
    return element;
};

export const createProbes = (): Probes => {
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.dataset.diag = 'probes';
    const units = Object.fromEntries(
        Object.entries(UNIT_PROBES).map(([name, value]) => [
            name,
            supports(value) ? probe(host, `height:${value};`) : null,
        ]),
    ) as Record<UnitName, HTMLElement | null>;
    const safe = probe(host, SAFE_PADDING);
    document.body.append(host);
    return { host, units, safe };
};

const pixels = (value: string) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const readUnits = ({ units }: Probes) =>
    Object.fromEntries(
        Object.entries(units).map(([name, element]) => [
            name,
            element ? element.getBoundingClientRect().height : null,
        ]),
    ) as Record<UnitName, number | null>;

const readSafe = ({ safe }: Probes): Insets => {
    const style = window.getComputedStyle(safe);
    return {
        top: pixels(style.paddingTop),
        right: pixels(style.paddingRight),
        bottom: pixels(style.paddingBottom),
        left: pixels(style.paddingLeft),
    };
};

const readBox = (selector: string): Box | null => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const { height, top, bottom } = element.getBoundingClientRect();
    return { height, top, bottom };
};

const readBoxes = () =>
    Object.fromEntries(BOX_SELECTORS.map((selector) => [selector, readBox(selector)])) as Record<
        (typeof BOX_SELECTORS)[number],
        Box | null
    >;

/** useStageFit 實際寫落外框嘅數（Stage.tsx）；舞台未出 = null */
export const readFit = (): Record<FitName, string> | null => {
    const frame = document.querySelector<HTMLElement>('.stage-frame');
    if (!frame) return null;
    return Object.fromEntries(
        Object.entries(FIT_VARIABLES).map(([name, variable]) => [
            name,
            frame.style.getPropertyValue(variable) || NONE,
        ]),
    ) as Record<FitName, string>;
};

/** useStageFit 嘅快照（stage/viewportHeight.ts viewportKey，同一個函數） */
export const readFitKey = (): string => viewportKey();

const readDisplayMode = () =>
    typeof window.matchMedia === 'function'
        ? (DISPLAY_MODES.find((mode) => window.matchMedia(`(display-mode: ${mode})`).matches) ??
          NONE)
        : NONE;

const readVisualViewport = (): VisualViewportSize | null => {
    const vv = window.visualViewport;
    if (!vv) return null;
    const { width, height, offsetTop, pageTop, scale } = vv;
    return { width, height, offsetTop, pageTop, scale };
};

const readDevice = () => ({
    displayMode: readDisplayMode(),
    navStandalone: String((navigator as Navigator & { standalone?: boolean }).standalone),
    dpr: window.devicePixelRatio,
    orientation: window.screen.orientation?.type ?? NONE,
    windowOrientation: String((window as Window & { orientation?: number }).orientation),
});

const readSizes = () => {
    const { clientWidth, clientHeight } = document.documentElement;
    return {
        screen: [window.screen.width, window.screen.height] as const,
        inner: [window.innerWidth, window.innerHeight] as const,
        client: [clientWidth, clientHeight] as const,
        vv: readVisualViewport(),
    };
};

export const takeSnapshot = (probes: Probes, t: number): Snapshot => ({
    t,
    ...readDevice(),
    ...readSizes(),
    units: readUnits(probes),
    boxes: readBoxes(),
    safe: readSafe(probes),
    fit: readFit(),
    fitKey: readFitKey(),
    stageHeight: readStageHeight(),
});
