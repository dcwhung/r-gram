import { PHONE_LAYOUT } from '../../stage/layouts';
import { paintCloth } from './flagCloth';
import { flagSceneFor } from './flagScene';

const scene = flagSceneFor(PHONE_LAYOUT.preload, 0);
const LOGO = { width: 640, height: 525 } as unknown as CanvasImageSource & {
    width: number;
    height: number;
};

const recorder = () => {
    const calls: { name: string; args: unknown[] }[] = [];
    const state: Record<string, unknown> = {};
    const ctx = new Proxy(state, {
        get: (target, name: string) =>
            name in target ? target[name] : (...args: unknown[]) => calls.push({ name, args }),
        set: (target, name: string, value) => {
            target[name] = value;
            return true;
        },
    }) as unknown as CanvasRenderingContext2D;
    return { ctx, calls, state };
};

/* 2D 同 WebGL 兩個 renderer 共用同一張布料圖（黑布 + logo），樣先會一樣 */
describe('paintCloth', () => {
    it('should fill the whole cloth black before the logo arrives', () => {
        const { ctx, calls, state } = recorder();
        paintCloth(ctx, scene, null);
        expect(state.fillStyle).toBe('#000');
        expect(calls).toEqual([
            { name: 'fillRect', args: [0, 0, scene.cloth.width, scene.cloth.height] },
        ]);
    });

    it('should centre the logo on its place on the cloth, keeping its shape', () => {
        const { ctx, calls } = recorder();
        paintCloth(ctx, scene, LOGO);
        const { x, y, width } = scene.logo;
        const height = (width * LOGO.height) / LOGO.width;
        expect(calls[1]).toEqual({
            name: 'drawImage',
            args: [LOGO, x - width / 2, y - height / 2, width, height],
        });
    });
});
