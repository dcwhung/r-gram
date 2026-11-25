import { PHONE_LAYOUT } from '../../stage/layouts';
import { createFlagRenderer, type FlagCanvas } from './flagRenderer';
import { flagSceneFor } from './flagScene';

interface Call {
    name: string;
    args: unknown[];
}

/** 假嘅 2D context：記低每個 method call（jsdom 冇 canvas） */
const fakeContext = () => {
    const calls: Call[] = [];
    const state: Record<string, unknown> = {};
    const context = new Proxy(state, {
        get: (target, name: string) => {
            if (name === 'calls') return calls;
            if (name === 'createImageData') {
                return (width: number, height: number) => ({
                    width,
                    height,
                    data: new Uint8ClampedArray(width * height * 4),
                });
            }
            if (name in target) return target[name];
            return (...args: unknown[]) => {
                calls.push({ name, args });
            };
        },
        set: (target, name: string, value) => {
            target[name] = value;
            return true;
        },
    });
    return context as unknown as CanvasRenderingContext2D & { calls: Call[] };
};

const fakeCanvas = (width: number, height: number) => {
    const context = fakeContext();
    return { width, height, getContext: () => context, context } as unknown as FlagCanvas & {
        context: ReturnType<typeof fakeContext>;
    };
};

const scene = flagSceneFor(PHONE_LAYOUT.preload, 0);
const LOGO = { width: 640, height: 525 } as unknown as CanvasImageSource & {
    width: number;
    height: number;
};

const setup = () => {
    const made: ReturnType<typeof fakeCanvas>[] = [];
    const renderer = createFlagRenderer(scene, (width, height) => {
        const canvas = fakeCanvas(width, height);
        made.push(canvas);
        return canvas;
    });
    const screen = fakeContext();
    return { renderer, made, screen };
};

const named = (context: { calls: Call[] }, name: string) =>
    context.calls.filter((call) => call.name === name);

/* Technical Spec：旗幟 canvas 2D，移植 mockup（v16）嘅布料網格 */
describe('createFlagRenderer', () => {
    it('should paint the cloth texture and the light map off screen', () => {
        const { made } = setup();
        const sizes = made.map(({ width, height }) => [width, height]);
        expect(sizes).toContainEqual([scene.cloth.width, scene.cloth.height]);
        expect(sizes).toContainEqual([scene.cloth.lightCols, scene.cloth.lightRows]);
    });

    it('should clear the screen to the flag black and cover it with cloth triangles', () => {
        const { renderer, screen } = setup();
        renderer.draw(screen, 0);
        expect(named(screen, 'fillRect')[0]?.args).toEqual([0, 0, 1080, 1920]);
        const triangles = named(screen, 'drawImage').length;
        // 每格兩個三角形；畫面以外嘅格唔畫
        expect(triangles).toBeGreaterThan(0);
        expect(triangles).toBeLessThanOrEqual(2 * scene.cloth.cols * scene.cloth.rows);
        expect(named(screen, 'clip')).toHaveLength(triangles);
    });

    it('should paint the logo onto the cloth at its place once it has loaded', () => {
        const { renderer, made, screen } = setup();
        const texture = made.find((canvas) => canvas.width === scene.cloth.width);
        renderer.draw(screen, 0);
        expect(named(texture?.context ?? fakeContext(), 'drawImage')).toHaveLength(1);
        renderer.setLogo(LOGO);
        renderer.draw(screen, 0);
        const height = (scene.logo.width * LOGO.height) / LOGO.width;
        const logoCall = named(texture?.context ?? fakeContext(), 'drawImage').find(
            (call) => call.args[0] === LOGO,
        );
        expect(logoCall?.args.slice(1)).toEqual([
            scene.logo.x - scene.logo.width / 2,
            scene.logo.y - height / 2,
            scene.logo.width,
            height,
        ]);
    });

    it('should write the light map every frame', () => {
        const { renderer, made, screen } = setup();
        const light = made.find((canvas) => canvas.width === scene.cloth.lightCols);
        renderer.draw(screen, 0);
        renderer.draw(screen, 16);
        expect(named(light?.context ?? fakeContext(), 'putImageData')).toHaveLength(2);
    });
});
