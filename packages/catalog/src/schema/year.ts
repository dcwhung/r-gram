/** 專輯年份範圍（CR-006，Functional Spec D63：只有年份，可選，直接輸入）；API 同 validator 共用 */
export const YEAR_MIN = 1900;
export const YEAR_MAX = 2100;

export const isAlbumYear = (value: unknown): value is number =>
    Number.isInteger(value) && (value as number) >= YEAR_MIN && (value as number) <= YEAR_MAX;
