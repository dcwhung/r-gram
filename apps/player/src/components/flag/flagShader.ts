/*
 * Preload 旗幟嘅 WebGL shader（T-114；Technical Spec「CR-010 → Preload 旗幟用 WebGL」）。
 * 光暗逐像素計：flagMesh.ts 嘅 flagWave()（斜率部分）同 shadeAt() 移植做 GLSL。
 * 所有數字由 flagMesh.ts 嘅 WAVES／HOIST／LIGHT／SHADE 生成，唔寫兩份（flagShader.test.ts 會擋）。
 * 布料位置（連上下漂移 LIFT 同透視）唔喺 shader 計：CPU 每格用 projectCloth() 計好再上載。
 */
import { HOIST, LIGHT, LIGHT_HALF, SHADE, TAU, WAVES } from './flagMesh';

/** shader 嘅輸入名（flagGl.ts 用同一份） */
export const FLAG_ATTRIBUTE = { x: 'aX', y: 'aY', uv: 'aUv' } as const;
export const FLAG_UNIFORM = {
    screen: 'uScreen',
    size: 'uSize',
    amp: 'uAmp',
    shift: 'uShift',
    cloth: 'uCloth',
} as const;

/** 好細嘅數唔可以寫成 1e-7（GLSL 唔認），用定點寫 */
const FIXED_DIGITS = 12;

/** GLSL 嘅 float 一定要有小數點：1 → 1.0 */
export const glslFloat = (value: number): string => {
    if (Number.isInteger(value)) return value.toFixed(1);
    const text = String(value);
    return text.includes('e') ? value.toFixed(FIXED_DIGITS).replace(/0+$/, '') : text;
};

const vec3 = (values: readonly number[]) => `vec3(${values.map(glslFloat).join(', ')})`;
const float = (name: string, value: number) => `const float ${name} = ${glslFloat(value)};`;
const vector = (name: string, values: readonly number[]) => `const vec3 ${name} = ${vec3(values)};`;

/** 三道波各一個分量（WAVES 有三道，所以用 vec3） */
const CONSTANTS = [
    float('TAU', TAU),
    vector(
        'WAVE_KU',
        WAVES.map((wave) => wave.ku),
    ),
    vector(
        'WAVE_KV',
        WAVES.map((wave) => wave.kv),
    ),
    vector(
        'WAVE_GAIN',
        WAVES.map((wave) => wave.gain),
    ),
    float('HOIST_BASE', HOIST.base),
    float('HOIST_GAIN', HOIST.gain),
    float('HOIST_POWER', HOIST.power),
    float('HOIST_MIN_U', HOIST.minU),
    vector('LIGHT_DIR', LIGHT),
    vector('LIGHT_HALF', LIGHT_HALF),
    float('SHADE_DIFFUSE', SHADE.diffuse),
    float('SHADE_SHINE', SHADE.shine),
    float('SHADE_SPECULAR', SHADE.specular),
    float('SHADE_BIAS', SHADE.bias),
    float('SHADE_MAX_LIGHT', SHADE.maxLight),
    float('SHADE_MAX_SHADE', SHADE.maxShade),
    float('SHADE_SHADE_GAIN', SHADE.shadeGain),
].join('\n');

const { x, y, uv } = FLAG_ATTRIBUTE;
const { screen, size, amp, shift, cloth } = FLAG_UNIFORM;

/** 頂點：畫面坐標（設計單位，y 向下）→ clip space；布料 (u, v) 照傳落去 */
export const FLAG_VERTEX_SOURCE = `
attribute float ${x};
attribute float ${y};
attribute vec2 ${uv};
uniform vec2 ${screen};
varying vec2 vUv;

void main() {
    vUv = ${uv};
    vec2 clip = vec2(${x}, ${y}) / ${screen} * 2.0 - 1.0;
    gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
`;

/**
 * 像素：flagWave() 嘅斜率 → 法線 → shadeAt() 嘅光暗，疊喺布料圖（黑布 + logo）上面。
 * uShift = 每道波嘅 phase × speed − offset（CPU 摺返一圈之內，見 waveShifts），角度細先夠準
 */
export const FLAG_FRAGMENT_SOURCE = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

${CONSTANTS}

uniform sampler2D ${cloth};
uniform vec3 ${shift};
uniform float ${amp};
uniform vec2 ${size};
varying vec2 vUv;

void main() {
    vec3 angle = TAU * (WAVE_KU * vUv.x + WAVE_KV * vUv.y) - ${shift};
    vec3 cosine = cos(angle);
    float height = dot(WAVE_GAIN, sin(angle));
    float slopeU = dot(WAVE_GAIN * WAVE_KU, cosine);
    float slopeV = dot(WAVE_GAIN * WAVE_KV, cosine);
    float u = max(vUv.x, HOIST_MIN_U);
    float envelope = HOIST_BASE + HOIST_GAIN * pow(u, HOIST_POWER);
    float envelopeSlope = HOIST_GAIN * HOIST_POWER * pow(u, HOIST_POWER - 1.0);
    float zx = ${amp} * (envelopeSlope * height + envelope * TAU * slopeU) / ${size}.x;
    float zy = ${amp} * envelope * TAU * slopeV / ${size}.y;
    vec3 normal = normalize(vec3(-zx, -zy, 1.0));
    float diffuse = dot(normal, LIGHT_DIR) - LIGHT_DIR.z;
    float shine = pow(max(0.0, dot(normal, LIGHT_HALF)), SHADE_SHINE);
    float lit = diffuse * SHADE_DIFFUSE + shine * SHADE_SPECULAR - SHADE_BIAS;
    float alpha = lit > 0.0
        ? min(SHADE_MAX_LIGHT, lit)
        : min(SHADE_MAX_SHADE, -lit * SHADE_SHADE_GAIN);
    vec3 tone = lit > 0.0 ? vec3(1.0) : vec3(0.0);
    gl_FragColor = vec4(mix(texture2D(${cloth}, vUv).rgb, tone, alpha), 1.0);
}
`;

/** 每道波嘅相位移（phase × speed − offset），摺入 [0, TAU)：時間耐咗角度都唔會大到失準 */
export const waveShifts = (phase: number, out: Float32Array): Float32Array => {
    WAVES.forEach((wave, index) => {
        const turn = (phase * wave.speed - wave.offset) % TAU;
        out[index] = turn < 0 ? turn + TAU : turn;
    });
    return out;
};
