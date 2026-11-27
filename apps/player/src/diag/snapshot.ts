/*
 * 臨時嘅 viewport 診斷（iPhone 主畫面 app 第一次開唔係全螢幕、底部安全區閃）：一次量度嘅資料形狀。
 * 成個 diag 資料夾係量度工具，查完就連 main.tsx 嗰一行一齊刪走。
 */

/** 隱藏量度 element 用嘅高度（CSS 值）；量到 null = 瀏覽器唔支援呢個單位 */
export const UNIT_PROBES = {
    vh: '100vh',
    svh: '100svh',
    lvh: '100lvh',
    dvh: '100dvh',
    fill: '-webkit-fill-available',
} as const;

export type UnitName = keyof typeof UNIT_PROBES;

/** 要量高度同 getBoundingClientRect 嘅 element */
export const BOX_SELECTORS = ['html', 'body', '#root', '.stage-frame', '.stage'] as const;

export type BoxSelector = (typeof BOX_SELECTORS)[number];

/** useStageFit 寫落 `.stage-frame` 嘅 CSS 變數（Stage.tsx stageVariables） */
export const FIT_VARIABLES = {
    u: '--u',
    heightUnits: '--stage-height-units',
    offsetY: '--stage-offset-y',
    bleedTop: '--stage-bleed-top',
    bleedBottom: '--stage-bleed-bottom',
} as const;

export type FitName = keyof typeof FIT_VARIABLES;

export interface Box {
    height: number;
    top: number;
    bottom: number;
}

export interface VisualViewportSize {
    width: number;
    height: number;
    offsetTop: number;
    pageTop: number;
    scale: number;
}

export interface Insets {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export interface Snapshot {
    /** 量度時間（ms，由 navigation start 計，performance.now()） */
    t: number;
    displayMode: string;
    /** `navigator.standalone`（只有 iOS 有）：'true' / 'false' / 'undefined' */
    navStandalone: string;
    dpr: number;
    /** `screen.orientation.type` */
    orientation: string;
    /** `window.orientation`（iOS 舊 API） */
    windowOrientation: string;
    screen: readonly [number, number];
    inner: readonly [number, number];
    client: readonly [number, number];
    vv: VisualViewportSize | null;
    units: Readonly<Record<UnitName, number | null>>;
    boxes: Readonly<Record<BoxSelector, Box | null>>;
    /** 自己嘅 probe 讀 `env(safe-area-inset-*)` */
    safe: Insets;
    /** `.stage-frame` 上面嘅 CSS 變數；舞台未出 = null */
    fit: Readonly<Record<FitName, string>> | null;
    /** 同 useStageFit 一樣砌法嘅 key：`innerWidth innerHeight insetTop insetBottom` */
    fitKey: string;
}

/** 開 app 之後三個時間點嘅量度 */
export interface LoadSnapshot {
    label: string;
    snapshot: Snapshot;
}

/** 過去一秒 fit key 變咗幾多次（now），同開咗之後最多試過幾多次（max） */
export interface FlickerStats {
    keyNow: number;
    keyMax: number;
    fitNow: number;
    fitMax: number;
}
