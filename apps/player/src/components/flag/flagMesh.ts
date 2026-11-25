/** 未實作（TDD 紅燈） */
export interface Cloth {
    width: number;
    height: number;
    x: number;
    y: number;
    cols: number;
    rows: number;
    lightCols: number;
    lightRows: number;
    amp: number;
    focal: number;
}
export interface WaveSample {
    z: number;
    zx: number;
    zy: number;
    lift: number;
}
export type Triangle = readonly [number, number, number, number, number, number];
export const newSample = (): WaveSample => ({ z: 0, zx: 0, zy: 0, lift: 0 });
export const flagWave = (
    _c: Cloth,
    _u: number,
    _v: number,
    _p: number,
    _g: number,
    out: WaveSample,
): WaveSample => ({ ...out, z: 1 });
export const gustAt = (_ms: number): number => 0;
export const projectCloth = (
    _c: Cloth,
    _p: number,
    _g: number,
    _centre: { x: number; y: number },
    _out: { sx: Float32Array; sy: Float32Array },
): void => {};
export const shadeAt = (_s: WaveSample): { light: boolean; alpha: number } => ({
    light: false,
    alpha: 1,
});
export const affineFor = (_s: Triangle, _d: Triangle): Triangle => [0, 0, 0, 0, 0, 0];
