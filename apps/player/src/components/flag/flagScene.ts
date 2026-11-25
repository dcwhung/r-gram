/*
 * 旗幟要畫嘅嘢（純函數）：由版面表（stage/layouts）同畫面多出嚟嘅高度砌出布料、logo（布料上嘅位置）同畫面大細。
 */
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../../stage/fitStage';
import type { PreloadLayout } from '../../stage/layouts';
import type { Cloth } from './flagMesh';

export interface FlagScene {
    cloth: Cloth;
    /** logo 喺布料（平放）上面嘅中心同闊度，布料左上角 = (0, 0) */
    logo: { x: number; y: number; width: number };
    /** 畫面（設計單位） */
    screen: { width: number; height: number };
}

const HALF = 2;

/**
 * 高身手機（`extra` > 0）：布料向下伸 `extra` 蓋住成個畫面，logo 跟畫面中間落 `extra / 2`
 *（進度線同文字由 Preload 嘅 SVG 貼底，見 PreloadScreen）
 */
export const flagSceneFor = (preload: PreloadLayout, extra: number): FlagScene => {
    const { flag, logo } = preload;
    return {
        cloth: { ...flag, height: flag.height + extra },
        logo: {
            x: logo.x + logo.drift - flag.x,
            y: logo.y + extra / HALF - flag.y,
            width: logo.width,
        },
        screen: { width: DESIGN_WIDTH, height: DESIGN_HEIGHT + extra },
    };
};
