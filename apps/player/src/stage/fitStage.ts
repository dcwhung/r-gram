/* 舞台縮放（純函數）。設計基準 1080 × 1920；所有尺寸以「單位」表示，1 單位 = `--u`。 */
export const DESIGN_WIDTH = 1080;
export const DESIGN_HEIGHT = 1920;

export interface StageFit {
    /** 1 個設計單位等於幾多 CSS px（`--u`） */
    unit: number;
    /** 舞台高度（單位）：最少 1920；比 9:16 高嘅畫面會多出嚟 */
    heightUnits: number;
    /** 比設計基準高出幾多單位（`--stage-extra`）。底部對齊嘅元件用佢向下移 */
    extraUnits: number;
    /** 舞台左邊離 viewport 幾多 px（比 9:16 闊嘅畫面先會置中） */
    offsetX: number;
    /** 舞台頂部離 viewport 幾多 px（= 頂部安全區） */
    offsetY: number;
}

/** 舞台唔可以用嘅位（px）：狀態列 / 動態島同底部指示條 */
export interface StageInsets {
    top: number;
    bottom: number;
}

const DESIGN_FIT: StageFit = {
    unit: 1,
    heightUnits: DESIGN_HEIGHT,
    extraUnits: 0,
    offsetX: 0,
    offsetY: 0,
};
const NO_INSETS: StageInsets = { top: 0, bottom: 0 };

const isUsable = (value: number) => Number.isFinite(value) && value > 0;

/** 用唔到嘅 inset（NaN、負數）當 0；兩邊加埋食晒成個畫面就當冇 inset */
const usableInsets = ({ top, bottom }: StageInsets, viewportHeight: number): StageInsets => {
    const safe = { top: isUsable(top) ? top : 0, bottom: isUsable(bottom) ? bottom : 0 };
    return safe.top + safe.bottom < viewportHeight ? safe : NO_INSETS;
};

/**
 * 舞台只用安全區入面嘅位（Technical Spec 實現注意事項 13）：元件唔使知有安全區。
 * - 同 9:16 一樣或者更高（手機）：闊度填滿，高出嘅部分記做 `extraUnits`
 * - 比 9:16 闊（未有專屬版面嘅裝置）：按高度縮放，保持 9:16，水平置中（Technical Spec「未匹配裝置」）
 */
export const fitStage = (
    viewportWidth: number,
    viewportHeight: number,
    insets: StageInsets = NO_INSETS,
): StageFit => {
    if (!isUsable(viewportWidth) || !isUsable(viewportHeight)) return DESIGN_FIT;
    const { top, bottom } = usableInsets(insets, viewportHeight);
    const height = viewportHeight - top - bottom;
    const isTall = height * DESIGN_WIDTH >= viewportWidth * DESIGN_HEIGHT;
    if (!isTall) {
        const unit = height / DESIGN_HEIGHT;
        const offsetX = (viewportWidth - DESIGN_WIDTH * unit) / 2;
        return { ...DESIGN_FIT, unit, offsetX, offsetY: top };
    }
    const unit = viewportWidth / DESIGN_WIDTH;
    const heightUnits = height / unit;
    return { unit, heightUnits, extraUnits: heightUnits - DESIGN_HEIGHT, offsetX: 0, offsetY: top };
};
