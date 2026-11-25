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
}

const DESIGN_FIT: StageFit = { unit: 1, heightUnits: DESIGN_HEIGHT, extraUnits: 0, offsetX: 0 };

const isUsable = (value: number) => Number.isFinite(value) && value > 0;

/**
 * - 同 9:16 一樣或者更高（手機）：闊度填滿，高出嘅部分記做 `extraUnits`
 * - 比 9:16 闊（未有專屬版面嘅裝置）：按高度縮放，保持 9:16，水平置中（Technical Spec「未匹配裝置」）
 */
export const fitStage = (viewportWidth: number, viewportHeight: number): StageFit => {
    if (!isUsable(viewportWidth) || !isUsable(viewportHeight)) return DESIGN_FIT;
    const isTall = viewportHeight * DESIGN_WIDTH >= viewportWidth * DESIGN_HEIGHT;
    if (!isTall) {
        const unit = viewportHeight / DESIGN_HEIGHT;
        return { ...DESIGN_FIT, unit, offsetX: (viewportWidth - DESIGN_WIDTH * unit) / 2 };
    }
    const unit = viewportWidth / DESIGN_WIDTH;
    const heightUnits = viewportHeight / unit;
    return { unit, heightUnits, extraUnits: heightUnits - DESIGN_HEIGHT, offsetX: 0 };
};
