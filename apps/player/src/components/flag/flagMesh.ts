/*
 * Preload 旗幟嘅布料數學（純函數；移植自設計稿 _mockups_/r-gram/src/anim.js（v16）嘅
 * flagWave()、shadeFlag()、projectFlag()、texturedTriangle()）。唔掂 DOM，所以可以直接 unit test。
 * 坐標係設計單位（1080 闊），布料嘅 (u, v) 由旗杆左上 (0, 0) 去到旗尾右下 (1, 1)。
 */
import { MOTION } from '../../config/motion';
import type { PreloadLayout } from '../../stage/layouts';

export type Cloth = PreloadLayout['flag'];

/** 布料一點：高度 z（向鏡頭為正）、兩個方向嘅斜率（已除以布料闊 / 高）、向上下嘅漂移 */
export interface WaveSample {
    z: number;
    zx: number;
    zy: number;
    lift: number;
}

/** 三角形三個角：x0, y0, x1, y1, x2, y2 */
export type Triangle = readonly [number, number, number, number, number, number];

const TAU = Math.PI * 2;

/** 沿布料行嘅三道波：沿旗（ku）、向下（kv）嘅周期數、速度、強度、起始相位（v16 WAVE） */
const WAVES = [
    { ku: 1.6, kv: 0.45, speed: 3.6, gain: 1, offset: 0 },
    { ku: 2.7, kv: -0.7, speed: 5.4, gain: 0.45, offset: 1.7 },
    { ku: 0.6, kv: 1.2, speed: 2.3, gain: 0.32, offset: 0.4 },
] as const;

/** 旗杆嗰邊釘住：波幅 = base + gain × u^power（u 太細時用 minU 計斜率，避免除零） */
const HOIST = { base: 0.14, gain: 0.86, power: 0.85, minU: 0.002 } as const;
/** 上下漂移：第三道波嘅相位再加 phase，強度 × gain */
const LIFT = { gain: 0.38, phase: 0.9 } as const;
/** 開場嘅風由幾多成力開始（v16：0.7 → 1） */
const GUST_START = 0.7;

export const newSample = (): WaveSample => ({ z: 0, zx: 0, zy: 0, lift: 0 });

/** 三道波加埋：高度、沿旗同向下嘅斜率（未乘波幅）、第三道波嘅角度（上下漂移用）。寫入 `out`，唔起新物件 */
const WAVE_SUM = { height: 0, slopeU: 0, slopeV: 0, third: 0 };
const sumWaves = (u: number, v: number, phase: number) => {
    WAVE_SUM.height = 0;
    WAVE_SUM.slopeU = 0;
    WAVE_SUM.slopeV = 0;
    for (const wave of WAVES) {
        const angle = TAU * (wave.ku * u + wave.kv * v) - phase * wave.speed + wave.offset;
        const cos = Math.cos(angle);
        WAVE_SUM.height += wave.gain * Math.sin(angle);
        WAVE_SUM.slopeU += wave.gain * wave.ku * cos;
        WAVE_SUM.slopeV += wave.gain * wave.kv * cos;
        WAVE_SUM.third = angle;
    }
    return WAVE_SUM;
};

/**
 * 布料喺 (u, v) 嘅高度同斜率；`phase` = 秒，`gust` = 風力（0 = 平放）。
 * 寫入 `out` 再回傳：每格都叫（一格畫面一萬幾次），所以唔起新物件
 */
export const flagWave = (
    cloth: Cloth,
    u: number,
    v: number,
    phase: number,
    gust: number,
    out: WaveSample,
): WaveSample => {
    const { height, slopeU, slopeV, third } = sumWaves(u, v, phase);
    const safeU = Math.max(u, HOIST.minU);
    const envelope = HOIST.base + HOIST.gain * safeU ** HOIST.power;
    const envelopeSlope = HOIST.gain * HOIST.power * safeU ** (HOIST.power - 1);
    const amp = cloth.amp * gust;
    out.z = amp * envelope * height;
    out.zx = (amp * (envelopeSlope * height + envelope * TAU * slopeU)) / cloth.width;
    out.zy = (amp * envelope * TAU * slopeV) / cloth.height;
    out.lift = amp * LIFT.gain * envelope * Math.sin(third + LIFT.phase);
    return out;
};

/** 開場風力：GUST_START → 1，用 flagGustMs、ease-out（v16 lerp(0.7, 1, easeOut(seg(t, 0, 1)))） */
export const gustAt = (elapsedMs: number): number => {
    const progress = Math.min(1, Math.max(0, elapsedMs / MOTION.scene.flagGustMs));
    const eased = 1 - (1 - progress) ** 3;
    return GUST_START + (1 - GUST_START) * eased;
};

/** 摺得太斜嘅格最多縮到幾多（v16：sqrt(1 − min(0.75, zx²))，即係最少保留一半闊度） */
const MAX_FOLD = 0.75;

/**
 * 網格每點投影到畫面（v16 projectFlag）：沿布料嘅長度不變（摺得斜嘅位會縮埋），再按 z 做透視（以 `centre` 為中心）。
 * 結果寫入 `out.sx / out.sy`，次序 = 行 × (cols + 1) + 列
 */
export const projectCloth = (
    cloth: Cloth,
    phase: number,
    gust: number,
    centre: { x: number; y: number },
    out: { sx: Float32Array; sy: Float32Array },
): void => {
    const columns = cloth.cols + 1;
    const step = cloth.width / cloth.cols;
    const sample = newSample();
    for (let row = 0; row <= cloth.rows; row += 1) {
        const v = row / cloth.rows;
        let run = 0;
        for (let col = 0; col <= cloth.cols; col += 1) {
            flagWave(cloth, col / cloth.cols, v, phase, gust, sample);
            if (col > 0) run += step * Math.sqrt(1 - Math.min(MAX_FOLD, sample.zx ** 2));
            const depth = cloth.focal / (cloth.focal - sample.z);
            const index = row * columns + col;
            out.sx[index] = centre.x + (cloth.x + run - centre.x) * depth;
            out.sy[index] =
                centre.y + (cloth.y + v * cloth.height + sample.lift - centre.y) * depth;
        }
    }
};

const normalize = ([x, y, z]: readonly [number, number, number]) => {
    const length = Math.hypot(x, y, z);
    return [x / length, y / length, z / length] as const;
};

/** 光由左上前方嚟（v16 LIGHT）；HALF = 光同視線（0, 0, 1）中間嘅方向，計反光 */
const LIGHT = normalize([-0.55, -0.38, 0.74]);
const HALF = normalize([LIGHT[0], LIGHT[1], LIGHT[2] + 1]);
/** v16 shadeFlag 嘅光暗：散射、反光（銳度、強度）、整體偏暗少少；光最多 42 % 白，暗最多 72 % 黑 */
const SHADE = {
    diffuse: 0.75,
    shine: 60,
    specular: 0.1,
    bias: 0.035,
    maxLight: 0.42,
    maxShade: 0.72,
    shadeGain: 2.6,
} as const;

/** 布料一點嘅光暗：`light` = 疊白（否則疊黑），`alpha` 0–1。平放 = 幾乎唔變 */
export const shadeAt = (sample: WaveSample): { light: boolean; alpha: number } => {
    const inverse = 1 / Math.hypot(sample.zx, sample.zy, 1);
    const nx = -sample.zx * inverse;
    const ny = -sample.zy * inverse;
    const facing = nx * LIGHT[0] + ny * LIGHT[1] + inverse * LIGHT[2];
    const diffuse = facing - LIGHT[2];
    const shine = Math.max(0, nx * HALF[0] + ny * HALF[1] + inverse * HALF[2]) ** SHADE.shine;
    const lit = diffuse * SHADE.diffuse + shine * SHADE.specular - SHADE.bias;
    return lit > 0
        ? { light: true, alpha: Math.min(SHADE.maxLight, lit) }
        : { light: false, alpha: Math.min(SHADE.maxShade, -lit * SHADE.shadeGain) };
};

/** 將來源三角形映射到目標三角形嘅 2D 仿射變換 [a, b, c, d, e, f]（canvas `transform()` 嘅次序） */
export const affineFor = (source: Triangle, target: Triangle): Triangle => {
    const [s0x, s0y, s1x, s1y, s2x, s2y] = source;
    const [d0x, d0y, d1x, d1y, d2x, d2y] = target;
    const den = s0x * (s1y - s2y) + s1x * (s2y - s0y) + s2x * (s0y - s1y);
    const solve = (p0: number, p1: number, p2: number) => [
        (p0 * (s1y - s2y) + p1 * (s2y - s0y) + p2 * (s0y - s1y)) / den,
        (p0 * (s2x - s1x) + p1 * (s0x - s2x) + p2 * (s1x - s0x)) / den,
        (p0 * (s1x * s2y - s2x * s1y) +
            p1 * (s2x * s0y - s0x * s2y) +
            p2 * (s0x * s1y - s1x * s0y)) /
            den,
    ];
    const [a = 0, c = 0, e = 0] = solve(d0x, d1x, d2x);
    const [b = 0, d = 0, f = 0] = solve(d0y, d1y, d2y);
    return [a, b, c, d, e, f];
};
