import type { ImageTools } from '../covers/processCover';
import { createPrepareCover } from './prepareCover';

const tools: ImageTools = {
    decode: async () => ({ width: 1200, height: 1200, close: () => undefined }),
    render: async (_image, { withPixels }) => ({
        blob: new Blob(['w'], { type: 'image/webp' }),
        pixels: withPixels ? [0, 0, 255, 255] : undefined,
    }),
};

describe('createPrepareCover', () => {
    it('should fetch the source from the media base and take the accent from the first cover only', async () => {
        const fetchImpl = vi.fn(async () => new Response('jpeg'));
        const prepare = createPrepareCover(fetchImpl, tools);
        const job = { slot: 'cover' as const, key: 'a/cover.jpg', etag: '"e"', bytes: 4 };
        const first = await prepare('https://media.example.com/', job);
        const second = await prepare('https://media.example.com/', { ...job, slot: 'cover2' });
        expect(fetchImpl).toHaveBeenCalledWith(
            'https://media.example.com/a/cover.jpg',
            expect.anything(),
        );
        expect(first.accent).toBe('#0000ff');
        expect(second.accent).toBeUndefined();
    });
});
