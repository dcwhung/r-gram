import { PHONE_LAYOUT } from '../../stage/layouts';
import { showLive } from './flagPlayback';
import { flagSceneFor } from './flagScene';

/** 一個開到 context、但開唔到 shader 嘅 WebGL（renderer 起到一半失敗） */
const brokenGl = (loseContext: () => void) => ({
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    createShader: () => null,
    getExtension: (name: string) => (name === 'WEBGL_lose_context' ? { loseContext } : null),
});

/* S-256：WebGL renderer 開唔到（gl-failed）：放低嗰個 context，連佢已經開咗嘅 program、buffer、texture */
describe('showLive', () => {
    it('should report gl-failed and lose the half-made WebGL context', () => {
        const loseContext = vi.fn();
        const canvas = { getContext: () => brokenGl(loseContext) } as unknown as HTMLCanvasElement;
        const onEvent = vi.fn();
        const stop = showLive(canvas, flagSceneFor(PHONE_LAYOUT.preload, 0), 1, onEvent);
        expect(onEvent).toHaveBeenCalledWith('gl-failed');
        expect(loseContext).toHaveBeenCalledTimes(1);
        expect(() => stop()).not.toThrow();
    });
});
