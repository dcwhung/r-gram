import { probe } from './probe';

const URL_UNDER_TEST = 'https://media.test/a/01%20x.m4a';
const respond = (status: number) => Promise.resolve(new Response(null, { status }));

describe('probe', () => {
    it('should find a file with one HEAD request', async () => {
        const fetcher = vi.fn(() => respond(200));
        await expect(probe(URL_UNDER_TEST, fetcher)).resolves.toEqual({
            found: true,
            status: 200,
            method: 'HEAD',
        });
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(fetcher).toHaveBeenCalledWith(
            URL_UNDER_TEST,
            expect.objectContaining({ method: 'HEAD' }),
        );
    });

    it('should report a missing file without a second request', async () => {
        const fetcher = vi.fn(() => respond(404));
        await expect(probe(URL_UNDER_TEST, fetcher)).resolves.toMatchObject({
            found: false,
            status: 404,
        });
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it.each([403, 405, 501])(
        'should fall back to a one-byte ranged GET when HEAD answers %i',
        async (status) => {
            const fetcher = vi
                .fn()
                .mockReturnValueOnce(respond(status))
                .mockReturnValueOnce(respond(206));
            await expect(probe(URL_UNDER_TEST, fetcher)).resolves.toEqual({
                found: true,
                status: 206,
                method: 'GET',
            });
            expect(fetcher).toHaveBeenLastCalledWith(
                URL_UNDER_TEST,
                expect.objectContaining({ method: 'GET', headers: { Range: 'bytes=0-0' } }),
            );
        },
    );

    it('should fall back to GET when HEAD fails on the network, and report the error if GET fails too', async () => {
        const fetcher = vi.fn(() => Promise.reject(new TypeError('Load failed')));
        await expect(probe(URL_UNDER_TEST, fetcher)).resolves.toEqual({
            found: false,
            status: null,
            method: 'GET',
            error: 'TypeError: Load failed',
        });
        expect(fetcher).toHaveBeenCalledTimes(2);
    });
});
