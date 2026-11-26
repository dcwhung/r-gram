/*
 * 邊啲裝置當「手機打橫」（T-039；Functional Spec US-015、FR-018、C11：唔做手機橫版，顯示「請打直」）。
 * 其他打橫嘅畫面（平板、iPhone Duo 打開、電腦）照用直度舞台置中（FR-018 後半；fitStage）。
 */

/**
 * 手機打橫時嘅短邊（CSS px）上限：最大嘅手機約 430–440；iPhone Duo 打開（612）、平板（≥ 744）都大過佢。
 * 數值係 T-039 嘅建議，Duo 闔上・橫（426）喺 Duo 版面（FR-027）出 mockup 時再定
 */
export const PHONE_MAX_SHORT_SIDE_PX = 500;
/** 主要輸入係手指：電腦拉細視窗唔會當係手機 */
export const COARSE_POINTER_QUERY = '(pointer: coarse)';

export interface ViewportInfo {
    width: number;
    height: number;
    coarsePointer: boolean;
}

export const isPhoneLandscape = ({ width, height, coarsePointer }: ViewportInfo): boolean =>
    coarsePointer && width > height && height <= PHONE_MAX_SHORT_SIDE_PX;
