/* 裝置資料：主畫面 App 定瀏覽器分頁、畫面大細、方向 */

const STANDALONE_QUERY = '(display-mode: standalone)';

/** iOS 主畫面 App：`navigator.standalone`；其他瀏覽器：display-mode */
export const isStandalone = (): boolean =>
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    (typeof window.matchMedia === 'function' && window.matchMedia(STANDALONE_QUERY).matches);

export const viewportText = (): string => `${window.innerWidth}×${window.innerHeight}`;

export interface OrientationReading {
    angle: number | null;
    type: string;
    /** 舊 Safari 嘅 `window.orientation`（已棄用，但 iOS 仲有） */
    legacy: number | null;
}

export const readOrientation = (): OrientationReading => {
    const orientation = typeof screen === 'undefined' ? undefined : screen.orientation;
    const legacy = (window as Window & { orientation?: number }).orientation;
    return {
        angle: typeof orientation?.angle === 'number' ? orientation.angle : (legacy ?? null),
        type: orientation?.type ?? '?',
        legacy: typeof legacy === 'number' ? legacy : null,
    };
};

/** 有冇聲嘅門檻（RMS），之下當冇訊號 */
export const SILENCE_RMS = 0.001;
