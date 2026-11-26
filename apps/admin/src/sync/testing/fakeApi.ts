/* 同步 runner 測試用嘅假 API：資料夾回應按次序回；任何一步都可以換做 throw */
import type { CoverJob } from '@r-gram/catalog';
import type { AdminApi } from '../../api/adminApi';
import type { FolderSyncResult, SiteStats, SyncOverview } from '../../api/types';
import type { ProcessedCover } from '../../covers/processCover';
import type { SyncDeps } from '../runSync';

export const STATS: SiteStats = {
    albums: 2,
    tracks: 7,
    tracksWithAudio: 5,
    tracksWithLyrics: 1,
    tracksWithMv: 1,
    albumsWithCover: 1,
};

export const overviewOf = (folders: string[], extra: Partial<SyncOverview> = {}): SyncOverview => ({
    folders: folders.map((folder) => ({
        folder,
        id: folder.split('-').slice(2).join('-'),
        category: 'album',
        categoryNo: 1,
        status: 'new',
    })),
    invalid: [],
    duplicateIds: [],
    missingAlbums: [],
    truncated: false,
    mediaBase: 'https://media.example.com/',
    ...extra,
});

export const folderResult = (
    folder: string,
    extra: Partial<FolderSyncResult> = {},
): FolderSyncResult => ({
    album: { id: folder.split('-').slice(2).join('-'), folder, title: folder, created: true },
    added: [],
    updated: [],
    unchanged: 0,
    failed: [],
    checks: [],
    pendingRemovals: [],
    coverJobs: [],
    more: false,
    nextFrom: null,
    truncated: false,
    ...extra,
});

export const coverJob = (folder: string, slot: CoverJob['slot'] = 'cover'): CoverJob => ({
    slot,
    key: `${folder}/${slot}.jpg`,
    etag: `"${slot}"`,
    bytes: 100,
});

export const processed = (extra: Partial<ProcessedCover> = {}): ProcessedCover => ({
    cover: new Blob(['big'], { type: 'image/webp' }),
    thumb: new Blob(['small'], { type: 'image/webp' }),
    accent: '#ff0000',
    notSquare: false,
    upscaled: false,
    source: { width: 1200, height: 1200 },
    ...extra,
});

type Step<T> = T | Error;
const settle = async <T>(step: Step<T> | undefined): Promise<T> => {
    if (step instanceof Error) throw step;
    if (step === undefined) throw new Error('no fake response left');
    return step;
};

export interface FakeSetup {
    overview: Step<SyncOverview>;
    /** 每個資料夾嘅回應（按叫嘅次序） */
    folders?: Record<string, Step<FolderSyncResult>[]>;
    prepare?: (job: CoverJob) => Promise<ProcessedCover>;
    uploads?: Step<{ name: string }>[];
    putCover?: Step<unknown>[];
    stats?: Step<SiteStats>;
}

export const fakeDeps = (setup: FakeSetup) => {
    const queues = Object.fromEntries(
        Object.entries(setup.folders ?? {}).map(([name, steps]) => [name, [...steps]]),
    );
    const uploads = [...(setup.uploads ?? [])];
    const covers = [...(setup.putCover ?? [])];
    let uploaded = 0;
    const api = {
        syncOverview: vi.fn(() => settle(setup.overview)),
        syncFolder: vi.fn((folder: string) => settle(queues[folder]?.shift())),
        uploadImage: vi.fn(() => settle(uploads.shift() ?? { name: `img-${++uploaded}.webp` })),
        putCover: vi.fn(() => settle(covers.shift() ?? {})),
        stats: vi.fn(() => settle(setup.stats ?? STATS)),
    } satisfies Omit<AdminApi, 'me' | 'logout'>;
    const prepareCover = vi.fn((_base: string, job: CoverJob) =>
        setup.prepare ? setup.prepare(job) : Promise.resolve(processed()),
    );
    const wait = vi.fn(async (_ms: number) => undefined);
    const deps: SyncDeps = { api, prepareCover, wait };
    return { deps, api, prepareCover, wait };
};
