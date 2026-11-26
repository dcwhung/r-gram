import { PHONE_LAYOUT } from './phone';
import type { StageLayout } from './types';
export type { TvBox, TvCurve, TvLayout } from './tvTypes';

export type {
    ArcListLayout,
    ButtonId,
    FavouritesLogoLayout,
    HeldTracksLayout,
    InfoLayout,
    LayoutId,
    MiniTurntableLayout,
    Point,
    PreloadLayout,
    StageLayout,
    TextLine,
    UpdateButtonLayout,
} from './types';
export { PHONE_LAYOUT };

/** 所有版面。加裝置 = 加一份表再放入呢度；淨空規則測試會自動包埋 */
export const LAYOUTS: readonly StageLayout[] = [PHONE_LAYOUT];
