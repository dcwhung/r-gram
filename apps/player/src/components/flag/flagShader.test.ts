import { HOIST, LIGHT, LIGHT_HALF, SHADE, TAU, WAVES } from './flagMesh';
import { FLAG_FRAGMENT_SOURCE, FLAG_VERTEX_SOURCE, glslFloat, waveShifts } from './flagShader';

/** `const float NAME = 1.0;` / `const vec3 NAME = vec3(1.0, 2.0, 3.0);` → { NAME: number[] } */
const declaredConstants = (source: string) => {
    const found: Record<string, number[]> = {};
    const pattern = /const (?:float|vec3) (\w+) = (?:vec3\()?([^;)]+)\)?;/g;
    for (const [, name = '', values = ''] of source.matchAll(pattern)) {
        found[name] = values.split(',').map(Number);
    }
    return found;
};

/** 每一個 GLSL 常數都應該等於 flagMesh.ts 入面同一個值（同一個 TS 物件，唔寫兩份） */
const EXPECTED: Record<string, readonly number[]> = {
    TAU: [TAU],
    WAVE_KU: WAVES.map((wave) => wave.ku),
    WAVE_KV: WAVES.map((wave) => wave.kv),
    WAVE_GAIN: WAVES.map((wave) => wave.gain),
    HOIST_BASE: [HOIST.base],
    HOIST_GAIN: [HOIST.gain],
    HOIST_POWER: [HOIST.power],
    HOIST_MIN_U: [HOIST.minU],
    LIGHT_DIR: LIGHT,
    LIGHT_HALF: LIGHT_HALF,
    SHADE_DIFFUSE: [SHADE.diffuse],
    SHADE_SHINE: [SHADE.shine],
    SHADE_SPECULAR: [SHADE.specular],
    SHADE_BIAS: [SHADE.bias],
    SHADE_MAX_LIGHT: [SHADE.maxLight],
    SHADE_MAX_SHADE: [SHADE.maxShade],
    SHADE_SHADE_GAIN: [SHADE.shadeGain],
};

/** 拎走常數宣告之後，shader 本體只准有 0.0、1.0、2.0（其他數字一定要經 flagMesh 嘅常數） */
const strayNumbers = (source: string) =>
    source
        .split('\n')
        .filter((line) => !line.trim().startsWith('const '))
        .join('\n')
        .replace(/\w*[A-Za-z_]\w*/g, ' ')
        .match(/\d+(\.\d+)?/g)
        ?.filter((literal) => !['0.0', '1.0', '2.0'].includes(literal)) ?? [];

/* Technical Spec「CR-010 → Preload 旗幟用 WebGL」：GLSL 常數由 flagMesh.ts 生成 */
describe('flag shaders', () => {
    it('should declare every wave, hoist, light and shade constant with the flagMesh value', () => {
        const declared = declaredConstants(FLAG_FRAGMENT_SOURCE);
        expect(Object.keys(declared).sort()).toEqual(Object.keys(EXPECTED).sort());
        for (const [name, values] of Object.entries(EXPECTED)) {
            expect(declared[name], name).toHaveLength(values.length);
            values.forEach((value, index) => expect(declared[name]?.[index]).toBe(value));
        }
    });

    it('should keep every other number out of the shader bodies', () => {
        expect(strayNumbers(FLAG_FRAGMENT_SOURCE)).toEqual([]);
        expect(strayNumbers(FLAG_VERTEX_SOURCE)).toEqual([]);
    });

    it('should ask for high precision where the device has it (wave angles grow with time)', () => {
        expect(FLAG_FRAGMENT_SOURCE).toMatch(
            /#ifdef GL_FRAGMENT_PRECISION_HIGH\s+precision highp float;\s+#else\s+precision mediump float;/,
        );
    });
});

describe('glslFloat', () => {
    it('should always write a decimal point and never an exponent', () => {
        expect(glslFloat(1)).toBe('1.0');
        expect(glslFloat(-3)).toBe('-3.0');
        expect(glslFloat(0.45)).toBe('0.45');
        expect(glslFloat(-0.7)).toBe('-0.7');
        expect(glslFloat(1e-7)).not.toMatch(/e/);
        expect(Number(glslFloat(1e-7))).toBeCloseTo(1e-7, 12);
    });
});

describe('waveShifts', () => {
    it('should give the same wave angle as flagMesh, folded into one turn', () => {
        const shifts = new Float32Array(WAVES.length);
        for (const phase of [0, 0.4, 7.3, 123.45]) {
            waveShifts(phase, shifts);
            WAVES.forEach((wave, index) => {
                const shift = shifts[index] ?? Number.NaN;
                expect(shift).toBeGreaterThanOrEqual(0);
                expect(shift).toBeLessThan(TAU);
                const base = TAU * (wave.ku * 0.3 + wave.kv * 0.8);
                const original = base - phase * wave.speed + wave.offset;
                expect(Math.sin(base - shift)).toBeCloseTo(Math.sin(original), 5);
                expect(Math.cos(base - shift)).toBeCloseTo(Math.cos(original), 5);
            });
        }
    });
});
