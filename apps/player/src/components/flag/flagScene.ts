import type { PreloadLayout } from '../../stage/layouts';
import type { Cloth } from './flagMesh';
/** 未實作（TDD 紅燈） */
export interface FlagScene {
    cloth: Cloth;
    logo: { x: number; y: number; width: number };
    screen: { width: number; height: number };
}
export const flagSceneFor = (preload: PreloadLayout, _extra: number): FlagScene => ({
    cloth: preload.flag,
    logo: { x: 0, y: 0, width: 0 },
    screen: { width: 0, height: 0 },
});
