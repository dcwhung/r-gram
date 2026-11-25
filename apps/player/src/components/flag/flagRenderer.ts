import type { FlagScene } from './flagScene';
/** 未實作（TDD 紅燈） */
export interface FlagCanvas {
    width: number;
    height: number;
    getContext(type: '2d'): CanvasRenderingContext2D | null;
}
export type LogoImage = CanvasImageSource & { width: number; height: number };
export const createFlagRenderer = (
    _scene: FlagScene,
    _make: (w: number, h: number) => FlagCanvas,
) => ({
    draw: (_ctx: CanvasRenderingContext2D, _ms: number): void => {},
    setLogo: (_logo: LogoImage): void => {},
});
