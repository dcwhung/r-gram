import { COVER_SIDE_PX, IMAGE_MAX_BYTES, NEUTRAL_ACCENT, THUMB_SIDE_PX } from '@r-gram/catalog';
import { CoverError } from './coverError';
import { SOURCE_MAX_EDGE_PX } from './limits';
import { processCover, type ImageTools, type RenderRequest } from './processCover';

const RED = [255, 0, 0, 255];

interface FakeOptions {
    width?: number;
    height?: number;
    decodeFails?: boolean;
    renderFails?: boolean;
    outputBytes?: number;
}

/** 假 canvas：記低每次畫咩，回指定大細嘅 WebP；thumb 嘅 pixel 係純紅 */
const fakeTools = ({
    width = 1600,
    height = 1200,
    decodeFails = false,
    renderFails = false,
    outputBytes = 10,
}: FakeOptions = {}) => {
    const renders: RenderRequest[] = [];
    const close = vi.fn();
    const tools: ImageTools = {
        decode: async () => {
            if (decodeFails) throw new Error('bad image');
            return { width, height, close };
        },
        render: async (_image, request) => {
            if (renderFails) throw new Error('no canvas');
            renders.push(request);
            const blob = new Blob([new Uint8Array(outputBytes)], { type: 'image/webp' });
            return { blob, pixels: request.withPixels ? RED.concat(RED) : undefined };
        },
    };
    return { tools, renders, close };
};

const SOURCE = new Blob(['jpeg'], { type: 'image/jpeg' });

describe('processCover', () => {
    it('should render the centred square at both sizes and take the accent from the thumb', async () => {
        const { tools, renders, close } = fakeTools();
        const result = await processCover(SOURCE, tools, { accent: true });
        expect(renders).toEqual([
            { crop: { x: 200, y: 0, side: 1200 }, side: COVER_SIDE_PX, withPixels: false },
            { crop: { x: 200, y: 0, side: 1200 }, side: THUMB_SIDE_PX, withPixels: true },
        ]);
        expect(result).toMatchObject({
            accent: '#ff0000',
            notSquare: true,
            upscaled: false,
            source: { width: 1600, height: 1200 },
        });
        expect(result.cover.type).toBe('image/webp');
        expect(close).toHaveBeenCalledOnce();
    });

    it('should not compute an accent for the second cover', async () => {
        const { tools, renders } = fakeTools({ width: 640, height: 640 });
        const result = await processCover(SOURCE, tools, { accent: false });
        expect(result.accent).toBeUndefined();
        expect(result.upscaled).toBe(true);
        expect(renders.every(({ withPixels }) => !withPixels)).toBe(true);
    });

    it('should fall back to the neutral accent when the canvas gives no pixels', async () => {
        const { tools } = fakeTools();
        const render: ImageTools['render'] = async (image, request) => ({
            ...(await tools.render(image, request)),
            pixels: undefined,
        });
        const result = await processCover(SOURCE, { ...tools, render }, { accent: true });
        expect(result.accent).toBe(NEUTRAL_ACCENT);
    });

    it.each([
        [{ decodeFails: true }, 'COVER_DECODE_FAILED'],
        [{ width: SOURCE_MAX_EDGE_PX + 1 }, 'COVER_SOURCE_TOO_LARGE'],
        [{ renderFails: true }, 'COVER_ENCODE_FAILED'],
        [{ outputBytes: IMAGE_MAX_BYTES + 1 }, 'COVER_OUTPUT_TOO_LARGE'],
    ] as const)('should fail with a cover error code (%o → %s)', async (options, code) => {
        const { tools } = fakeTools(options);
        const error = await processCover(SOURCE, tools, { accent: true }).catch(
            (caught: unknown) => caught,
        );
        expect(error).toBeInstanceOf(CoverError);
        expect(error).toMatchObject({ code });
    });

    it('should release the decoded image even when rendering fails', async () => {
        const { tools, close } = fakeTools({ renderFails: true });
        await processCover(SOURCE, tools, { accent: true }).catch(() => undefined);
        expect(close).toHaveBeenCalledOnce();
    });
});
