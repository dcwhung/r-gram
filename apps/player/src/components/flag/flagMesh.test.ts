import { MOTION } from '../../config/motion';
import { PHONE_LAYOUT } from '../../stage/layouts';
import {
    affineFor,
    type Cloth,
    flagWave,
    gustAt,
    newSample,
    projectCloth,
    shadeAt,
    type Triangle,
} from './flagMesh';

const CLOTH: Cloth = PHONE_LAYOUT.preload.flag;
const CENTRE = { x: 540, y: 960 };
const PHASES = Array.from({ length: 40 }, (_, step) => step * 0.37);

const peak = (u: number) =>
    Math.max(
        ...PHASES.flatMap((phase) =>
            [0, 0.5, 1].map((v) => Math.abs(flagWave(CLOTH, u, v, phase, 1, newSample()).z)),
        ),
    );

const grid = () => {
    const size = (CLOTH.cols + 1) * (CLOTH.rows + 1);
    return { sx: new Float32Array(size), sy: new Float32Array(size) };
};

/* 設計稿 r-gram v16 嘅布料旗：行進波、旗杆嗰邊釘住、尾端自由（Technical Spec：旗幟 canvas 移植 mockup 嘅布料網格） */
describe('flagWave', () => {
    it('should lie flat without wind', () => {
        // −0 都算 0
        const sample = flagWave(CLOTH, 0.6, 0.4, 2, 0, newSample());
        expect(Object.values(sample).every((value) => value === 0)).toBe(true);
    });

    it('should move the fly end far more than the hoist', () => {
        expect(peak(1)).toBeGreaterThan(peak(0) * 4);
        expect(peak(1)).toBeLessThanOrEqual(CLOTH.amp * (1 + 0.45 + 0.32));
    });
});

describe('gustAt', () => {
    // v16：gust = lerp(0.7, 1, easeOut(t / 1 s))
    it('should build the wind from 70 % to full over the gust time', () => {
        expect(gustAt(0)).toBeCloseTo(0.7);
        expect(gustAt(MOTION.scene.flagGustMs / 2)).toBeCloseTo(0.7 + 0.3 * (1 - 0.5 ** 3));
        expect(gustAt(MOTION.scene.flagGustMs)).toBe(1);
        expect(gustAt(MOTION.scene.flagGustMs * 3)).toBe(1);
    });
});

describe('projectCloth', () => {
    it('should lay the mesh on a flat grid without wind', () => {
        const out = grid();
        projectCloth(CLOTH, 0, 0, CENTRE, out);
        const last = (CLOTH.cols + 1) * (CLOTH.rows + 1) - 1;
        expect(out.sx[0]).toBeCloseTo(CLOTH.x);
        expect(out.sy[0]).toBeCloseTo(CLOTH.y);
        expect(out.sx[last]).toBeCloseTo(CLOTH.x + CLOTH.width);
        expect(out.sy[last]).toBeCloseTo(CLOTH.y + CLOTH.height);
    });

    // v16：每格沿布料嘅長度不變，摺得斜嘅位會縮埋：旗尾一定唔會比平放時更出
    it('should fold the cloth shorter in the wind', () => {
        const out = grid();
        projectCloth(CLOTH, 1.3, 1, CENTRE, out);
        const rowEnd = CLOTH.cols;
        expect(out.sx.every(Number.isFinite)).toBe(true);
        expect(out.sx[rowEnd]).toBeLessThan(CLOTH.x + CLOTH.width);
    });
});

describe('shadeAt', () => {
    it('should leave a flat cloth almost untouched', () => {
        const sample = newSample();
        expect(shadeAt(sample).alpha).toBeLessThan(0.1);
    });

    it('should light a fold that faces the light and darken one that faces away', () => {
        // 光由左上嚟：斜面向左上 = 光，向右下 = 暗
        const towards = { ...newSample(), zx: 0.4, zy: 0.3 };
        const away = { ...newSample(), zx: -0.4, zy: -0.3 };
        expect(shadeAt(towards)).toMatchObject({ light: true });
        expect(shadeAt(away)).toMatchObject({ light: false });
        expect(shadeAt(away).alpha).toBeGreaterThan(0.1);
    });

    it('should keep the light and the shade within the mockup limits', () => {
        const steep = { ...newSample(), zx: 5, zy: 5 };
        const back = { ...newSample(), zx: -5, zy: -5 };
        expect(shadeAt(steep).alpha).toBeLessThanOrEqual(0.42);
        expect(shadeAt(back).alpha).toBeLessThanOrEqual(0.72);
    });
});

describe('affineFor', () => {
    it('should map each corner of the source triangle onto the target', () => {
        const source: Triangle = [0, 0, 10, 0, 0, 10];
        const target: Triangle = [100, 50, 120, 54, 96, 70];
        const [a, b, c, d, e, f] = affineFor(source, target);
        for (let corner = 0; corner < 3; corner += 1) {
            const x = source[corner * 2] ?? 0;
            const y = source[corner * 2 + 1] ?? 0;
            expect(a * x + c * y + e).toBeCloseTo(target[corner * 2] ?? NaN);
            expect(b * x + d * y + f).toBeCloseTo(target[corner * 2 + 1] ?? NaN);
        }
    });
});
