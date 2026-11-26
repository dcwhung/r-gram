import { PHONE_LAYOUT } from '../../stage/layouts';
import { createFlagGl } from './flagGl';
import { gustAt, projectCloth } from './flagMesh';
import { flagSceneFor } from './flagScene';
import { waveShifts } from './flagShader';

interface Call {
    name: string;
    args: unknown[];
}

const CANVAS = { width: 786, height: 1704 };
const SCALE = 0.728;
const scene = flagSceneFor(PHONE_LAYOUT.preload, 0);
const { cols, rows } = scene.cloth;
const POINTS = (cols + 1) * (rows + 1);

interface FakeOptions {
    compiles?: boolean;
    maxTexture?: number;
}

/**
 * 假嘅 WebGL context（jsdom 冇 WebGL）：記低每個 method call；常數（大楷）回自己個名，
 * create* 回一個有名嘅物件，查詢一律成功（除非 `compiles: false`）
 */
const fakeGl = ({ compiles = true, maxTexture = 4096 }: FakeOptions = {}) => {
    const calls: Call[] = [];
    let created = 0;
    const answers: Record<string, (...args: unknown[]) => unknown> = {
        getShaderParameter: () => compiles,
        getProgramParameter: () => true,
        getShaderInfoLog: () => 'broken',
        getUniformLocation: (_program, name) => ({ uniform: name }),
        getAttribLocation: (_program, name) => `attribute ${String(name)}`,
        getParameter: (name) => (name === 'MAX_TEXTURE_SIZE' ? maxTexture : null),
        isContextLost: () => false,
    };
    const gl = new Proxy(
        { canvas: CANVAS, drawingBufferWidth: CANVAS.width, drawingBufferHeight: CANVAS.height },
        {
            get: (target, name: string) => {
                if (name in target) return target[name as keyof typeof target];
                if (/^[A-Z_0-9]+$/.test(name)) return name;
                return (...args: unknown[]) => {
                    calls.push({ name, args });
                    if (name in answers) return answers[name]?.(...args);
                    created += 1;
                    return name.startsWith('create') ? { made: name, id: created } : undefined;
                };
            },
        },
    );
    return { gl: gl as unknown as WebGLRenderingContext, calls };
};

/** 離屏 2D canvas（布料圖）：記低大細同畫咗乜 */
const fakeMaker = () => {
    const made: { width: number; height: number; painted: Call[] }[] = [];
    const make = (width: number, height: number) => {
        const painted: Call[] = [];
        const ctx = new Proxy(
            {},
            {
                get:
                    (_target, name: string) =>
                    (...args: unknown[]) =>
                        painted.push({ name, args }),
                set: () => true,
            },
        );
        const canvas = {
            width,
            height,
            painted,
            getContext: () => ctx as CanvasRenderingContext2D,
        };
        made.push(canvas);
        return canvas;
    };
    return { make, made };
};

const named = (calls: Call[], name: string) => calls.filter((call) => call.name === name);

const setup = (options?: FakeOptions, scale = SCALE) => {
    const { gl, calls } = fakeGl(options);
    const { make, made } = fakeMaker();
    const renderer = createFlagGl(gl, scene, scale, make);
    return { renderer, calls, made };
};

const LOGO = { width: 640, height: 525 } as unknown as CanvasImageSource & {
    width: number;
    height: number;
};

/* Technical Spec「CR-010 → Preload 旗幟用 WebGL」 */
describe('createFlagGl', () => {
    it('should upload the grid layout and the cloth texture once, up front', () => {
        const { calls, made } = setup();
        expect(named(calls, 'texImage2D')).toHaveLength(1);
        const staticData = named(calls, 'bufferData').filter((c) => c.args[2] === 'STATIC_DRAW');
        expect(staticData.map((call) => (call.args[1] as ArrayLike<number>).length)).toEqual([
            POINTS * 2,
            cols * rows * 6,
        ]);
        // 布料圖用畫面解像度（1 設計單位 = scale 像素），唔係 1 單位 1 像素
        expect(made[0]).toMatchObject({
            width: Math.ceil(scene.cloth.width * SCALE),
            height: Math.ceil(scene.cloth.height * SCALE),
        });
    });

    it('should keep the cloth texture within the GPU limit and never above one pixel per unit', () => {
        expect(setup({}, 2).made[0]?.width).toBe(scene.cloth.width);
        const limited = setup({ maxTexture: 1024 }).made[0];
        expect(Math.max(limited?.width ?? 0, limited?.height ?? 0)).toBeLessThanOrEqual(1024);
    });

    it('should only move the points and draw once per frame', () => {
        const { renderer, calls } = setup();
        calls.length = 0;
        const elapsedMs = 1234;
        renderer.draw(elapsedMs);
        const mesh = { sx: new Float32Array(POINTS), sy: new Float32Array(POINTS) };
        const centre = { x: scene.screen.width / 2, y: scene.screen.height / 2 };
        projectCloth(scene.cloth, elapsedMs / 1000, gustAt(elapsedMs), centre, mesh);
        const moved = named(calls, 'bufferSubData').map((call) =>
            Array.from(call.args[2] as Float32Array),
        );
        expect(moved).toEqual([Array.from(mesh.sx), Array.from(mesh.sy)]);
        expect(named(calls, 'texImage2D')).toHaveLength(0);
        expect(named(calls, 'drawElements')).toEqual([
            { name: 'drawElements', args: ['TRIANGLES', cols * rows * 6, 'UNSIGNED_SHORT', 0] },
        ]);
        const [shift] = named(calls, 'uniform3fv');
        expect(Array.from(shift?.args[1] as Float32Array)).toEqual(
            Array.from(waveShifts(elapsedMs / 1000, new Float32Array(3))),
        );
        expect(named(calls, 'uniform1f')[0]?.args[1]).toBe(scene.cloth.amp * gustAt(elapsedMs));
    });

    it('should map design units to the whole canvas', () => {
        const { calls } = setup();
        const screen = named(calls, 'uniform2f').find(
            (call) => (call.args[0] as { uniform: string }).uniform === 'uScreen',
        );
        expect(screen?.args.slice(1)).toEqual([CANVAS.width / SCALE, CANVAS.height / SCALE]);
        expect(named(calls, 'viewport')[0]?.args).toEqual([0, 0, CANVAS.width, CANVAS.height]);
    });

    it('should repaint and upload the texture once more when the logo arrives', () => {
        const { renderer, calls, made } = setup();
        renderer.setLogo(LOGO);
        expect(named(calls, 'texImage2D')).toHaveLength(2);
        expect(named(made[0]?.painted ?? [], 'drawImage')[0]?.args[0]).toBe(LOGO);
    });

    it('should throw when the shaders do not compile', () => {
        expect(() => setup({ compiles: false })).toThrow(/broken/);
    });

    it('should release every GL resource when disposed', () => {
        const { renderer, calls } = setup();
        renderer.dispose();
        expect(named(calls, 'deleteBuffer')).toHaveLength(4);
        expect(named(calls, 'deleteTexture')).toHaveLength(1);
        expect(named(calls, 'deleteProgram')).toHaveLength(1);
    });
});
