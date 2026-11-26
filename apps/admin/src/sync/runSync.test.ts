import { ApiError, NETWORK_ERROR } from '../api/client';
import { CoverError } from '../covers/coverError';
import { MAX_ATTEMPTS } from './retry';
import { runSync, type SyncEvent } from './runSync';
import {
    coverJob,
    fakeDeps,
    folderResult,
    overviewOf,
    processed,
    STATS,
    type FakeSetup,
} from './testing/fakeApi';

const A = 'album-11-komorebi';
const B = 'album-12-other';

const run = async (setup: FakeSetup) => {
    const fake = fakeDeps(setup);
    const events: SyncEvent[] = [];
    const summary = await runSync(fake.deps, (event) => events.push(event));
    return { ...fake, events, summary, types: events.map(({ type }) => type) };
};

const serverDown = () => new ApiError(500, 'INTERNAL', 'x');
const stale = () => new ApiError(409, 'DUPLICATE_ALBUM_ID', 'x');

describe('runSync', () => {
    it('should sync every folder, process its covers and end with the site statistics', async () => {
        const removal = { kind: 'track' as const, albumId: 'komorebi', trackId: 't', no: 4 };
        const { events, api, prepareCover, summary } = await run({
            overview: overviewOf([A, B], {
                invalid: [{ folder: 'Bad', code: 'INVALID_FOLDER_NAME', message: '' }],
                duplicateIds: [{ id: 'x', folders: ['album-01-x', 'ep-01-x'] }],
                missingAlbums: [
                    { kind: 'album', albumId: 'gone', folder: 'album-09-gone', title: 'G' },
                ],
            }),
            folders: {
                [A]: [
                    folderResult(A, {
                        added: [{ no: 1 }, { no: 2 }],
                        checks: [{ level: 'warning', code: 'NO_AUDIO', message: '' }],
                        pendingRemovals: [removal],
                        coverJobs: [coverJob(A, 'cover2'), coverJob(A, 'cover')],
                    }),
                ],
                [B]: [folderResult(B, { unchanged: 3 })],
            },
            prepare: async (job) =>
                job.slot === 'cover' ? processed({ notSquare: true, upscaled: true }) : processed(),
        });
        expect(api.syncFolder.mock.calls).toEqual([
            [A, undefined],
            [B, undefined],
        ]);
        // 第一張封面先做（第二張要有第一張）；專輯色只跟第一張
        expect(prepareCover.mock.calls.map(([, job]) => job.slot)).toEqual(['cover', 'cover2']);
        expect(api.putCover.mock.calls).toEqual([
            [
                'komorebi',
                {
                    slot: 'cover',
                    cover: 'img-1.webp',
                    thumb: 'img-2.webp',
                    sourceKey: `${A}/cover.jpg`,
                    sourceEtag: '"cover"',
                    accent: '#ff0000',
                    notSquare: true,
                },
            ],
            [
                'komorebi',
                {
                    slot: 'cover2',
                    cover: 'img-3.webp',
                    thumb: 'img-4.webp',
                    sourceKey: `${A}/cover2.jpg`,
                    sourceEtag: '"cover2"',
                    notSquare: false,
                },
            ],
        ]);
        expect(events.map(({ type }) => type)).toEqual([
            'started',
            'invalidFolder',
            'duplicateId',
            'folderDone',
            'coverDone',
            'coverDone',
            'folderDone',
            'removal',
            'removal',
            'finished',
        ]);
        expect(events[3]).toMatchObject({ folder: A, added: 2, updated: 0, created: true });
        expect(events[4]).toMatchObject({ slot: 'cover', upscaled: true, notSquare: true });
        expect(events[7]).toMatchObject({ folder: A, removal });
        expect(events[8]).toMatchObject({ folder: 'album-09-gone', removal: { albumId: 'gone' } });
        expect(summary).toEqual({
            stats: STATS,
            folders: 2,
            failedFolders: 0,
            coversDone: 2,
            coverProblems: 0,
            checks: 1,
            pendingRemovals: 2,
            stopped: null,
        });
    });

    it('should call a folder again from nextFrom while it has more', async () => {
        const { api, events } = await run({
            overview: overviewOf([A]),
            folders: {
                [A]: [
                    folderResult(A, { added: [{ no: 1 }], more: true, nextFrom: 101 }),
                    folderResult(A, { added: [{ no: 101 }], updated: [{ no: 102 }], unchanged: 5 }),
                ],
            },
        });
        expect(api.syncFolder.mock.calls).toEqual([
            [A, undefined],
            [A, 101],
        ]);
        expect(events.find(({ type }) => type === 'folderDone')).toMatchObject({
            added: 2,
            updated: 1,
            unchanged: 5,
        });
    });

    it('should retry a folder after a network or server failure', async () => {
        const network = new ApiError(0, NETWORK_ERROR, 'offline');
        const { types, wait, summary } = await run({
            overview: overviewOf([A]),
            folders: { [A]: [network, serverDown(), folderResult(A)] },
        });
        expect(types).toEqual(['started', 'retry', 'retry', 'folderDone', 'finished']);
        expect(wait).toHaveBeenCalledTimes(2);
        expect(summary.failedFolders).toBe(0);
    });

    it('should report a folder that keeps failing and carry on with the next', async () => {
        const failures = Array.from({ length: MAX_ATTEMPTS }, serverDown);
        const { events, summary } = await run({
            overview: overviewOf([A, B]),
            folders: { [A]: failures, [B]: [folderResult(B)] },
        });
        expect(events.filter(({ type }) => type === 'retry')).toHaveLength(MAX_ATTEMPTS - 1);
        expect(events).toContainEqual({ type: 'folderProblem', folder: A, code: 'INTERNAL' });
        expect(events).toContainEqual(expect.objectContaining({ type: 'folderDone', folder: B }));
        expect(summary.failedFolders).toBe(1);
    });

    it('should not retry a refusal that would only be refused again', async () => {
        const { types } = await run({
            overview: overviewOf([A, B]),
            folders: { [A]: [stale()], [B]: [folderResult(B)] },
        });
        expect(types).toEqual(['started', 'folderProblem', 'folderDone', 'finished']);
    });

    it('should stop when the session has expired', async () => {
        const { api, events, summary } = await run({
            overview: overviewOf([A, B]),
            folders: { [A]: [new ApiError(401, 'UNAUTHORIZED', 'x')] },
        });
        expect(api.syncFolder).toHaveBeenCalledOnce();
        expect(events.at(-2)).toEqual({ type: 'stopped', code: 'UNAUTHORIZED' });
        expect(summary).toMatchObject({ stopped: 'UNAUTHORIZED', stats: null });
    });

    it('should stop when the folder list cannot be read', async () => {
        const { types, summary, api } = await run({ overview: serverDown() });
        expect(types).toEqual(['retry', 'retry', 'stopped', 'finished']);
        expect(summary).toMatchObject({ stopped: 'INTERNAL', folders: 0 });
        expect(api.stats).not.toHaveBeenCalled();
    });

    it('should report a cover that cannot be processed and not store anything for it', async () => {
        const { events, api, summary } = await run({
            overview: overviewOf([A]),
            folders: { [A]: [folderResult(A, { coverJobs: [coverJob(A)] })] },
            prepare: () => Promise.reject(new CoverError('COVER_FETCH_FAILED', '403')),
        });
        expect(events).toContainEqual({
            type: 'coverProblem',
            folder: A,
            slot: 'cover',
            code: 'COVER_FETCH_FAILED (403)',
        });
        expect(api.uploadImage).not.toHaveBeenCalled();
        expect(api.putCover).not.toHaveBeenCalled();
        expect(summary).toMatchObject({ coversDone: 0, coverProblems: 1 });
    });

    it('should name the field and reason when the Worker refuses a cover result', async () => {
        const refused = new ApiError(400, 'VALIDATION_ERROR', 'x', [
            { path: 'cover', reason: 'WRONG_SIZE' },
        ]);
        const { events } = await run({
            overview: overviewOf([A]),
            folders: { [A]: [folderResult(A, { coverJobs: [coverJob(A)] })] },
            putCover: [refused],
        });
        expect(events).toContainEqual(
            expect.objectContaining({
                type: 'coverProblem',
                code: 'VALIDATION_ERROR (cover: WRONG_SIZE)',
            }),
        );
    });

    it('should still finish when the statistics cannot be read', async () => {
        const { summary } = await run({
            overview: overviewOf([A]),
            folders: { [A]: [folderResult(A)] },
            stats: stale(),
        });
        expect(summary).toMatchObject({ stats: null, stopped: null, folders: 1 });
    });

    it('should report failed tracks and check results of a folder', async () => {
        const failed = [{ no: 3, trackId: null, code: 'STALE', message: '' }];
        const { events, summary } = await run({
            overview: overviewOf([A]),
            folders: { [A]: [folderResult(A, { failed })] },
        });
        expect(events).toContainEqual(expect.objectContaining({ type: 'folderDone', failed }));
        expect(summary.failedFolders).toBe(0);
    });
});
