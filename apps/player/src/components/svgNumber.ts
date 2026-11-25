const ONE_DECIMAL = 10;
const FOUR_DECIMALS = 10_000;

/** SVG 屬性用嘅數字：一位小數就夠（設計單位） */
export const px = (value: number): number => Math.round(value * ONE_DECIMAL) / ONE_DECIMAL;

/** 比例、單位圓座標：四位小數 */
export const ratio = (value: number): number => Math.round(value * FOUR_DECIMALS) / FOUR_DECIMALS;
