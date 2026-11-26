import { browserTools, type CanvasDeps } from './browserTools';
import { WEBP_QUALITY } from './limits';

interface FakeCanvas {
    width: number;
    height: number;
    getContext: (kind: string) => unknown;
    toBlob: (done: (blob: Blob | null) => void, type?: string, quality?: number) => void;
}

const imageData = (side: number) => ({ data: new Uint8ClampedArray(side * side * 4), width: side });

/** 假 canvas：nativeType = toBlob 出咩格式（Safari 會靜靜雞出 PNG）；null = 冇 2D context */
const fakeDeps = (nativeType: string | null = 'image/webp', hasContext = true) => {
    const context = {
        imageSmoothingEnabled: false,
        imageSmoothingQuality: 'low',
        drawImage: vi.fn(),
        getImageData: vi.fn((_x: number, _y: number, w: number) => imageData(w)),
    };
    const toBlobCalls: [string | undefined, number | undefined][] = [];
    const canvases: FakeCanvas[] = [];
    const deps: CanvasDeps = {
        createCanvas: (width, height) => {
            const canvas: FakeCanvas = {
                width,
                height,
                getContext: () => (hasContext ? context : null),
                toBlob: (done, type, quality) => {
                    toBlobCalls.push([type, quality]);
                    done(nativeType ? new Blob(['n'], { type: nativeType }) : null);
                },
            };
            canvases.push(canvas);
            return canvas as unknown as HTMLCanvasElement;
        },
        decode: vi.fn(async () => ({ width: 10, height: 20, close: vi.fn() })),
        wasmEncode: vi.fn(async () => new Uint8Array([1, 2]).buffer),
    };
    return { deps, context, toBlobCalls, canvases };
};

const REQUEST = { crop: { x: 0, y: 5, side: 10 }, side: 320, withPixels: false };

describe('browserTools', () => {
    it('should decode through the injected decoder', async () => {
        const { deps } = fakeDeps();
        const image = await browserTools(deps).decode(new Blob(['x']));
        expect(image).toMatchObject({ width: 10, height: 20 });
    });

    it('should draw the crop smoothly onto a square canvas and encode WebP natively', async () => {
        const { deps, context, toBlobCalls, canvases } = fakeDeps();
        const image = { width: 10, height: 20, close: vi.fn() };
        const result = await browserTools(deps).render(image, REQUEST);
        expect(canvases[0]).toMatchObject({ width: 320, height: 320 });
        expect(context.imageSmoothingEnabled).toBe(true);
        expect(context.imageSmoothingQuality).toBe('high');
        expect(context.drawImage).toHaveBeenCalledWith(image, 0, 5, 10, 10, 0, 0, 320, 320);
        expect(toBlobCalls).toEqual([['image/webp', WEBP_QUALITY]]);
        expect(result.blob.type).toBe('image/webp');
        expect(result.pixels).toBeUndefined();
        expect(deps.wasmEncode).not.toHaveBeenCalled();
    });

    it('should hand back the pixels when asked', async () => {
        const { deps } = fakeDeps();
        const image = { width: 10, height: 20, close: vi.fn() };
        const result = await browserTools(deps).render(image, { ...REQUEST, withPixels: true });
        expect(result.pixels).toHaveLength(320 * 320 * 4);
    });

    it.each(['image/png', null])(
        'should fall back to the wasm encoder when the canvas gives %s',
        async (nativeType) => {
            const { deps } = fakeDeps(nativeType);
            const image = { width: 10, height: 20, close: vi.fn() };
            const result = await browserTools(deps).render(image, REQUEST);
            expect(deps.wasmEncode).toHaveBeenCalledOnce();
            expect(result.blob.type).toBe('image/webp');
            expect(result.blob.size).toBe(2);
        },
    );

    it('should fail when the browser gives no 2D context', async () => {
        const { deps } = fakeDeps('image/webp', false);
        const image = { width: 10, height: 20, close: vi.fn() };
        await expect(browserTools(deps).render(image, REQUEST)).rejects.toThrow();
    });
});
