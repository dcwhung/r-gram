/* 封面工作嘅瀏覽器實作：由媒體 bucket 攞來源 → processCover（第一張先抽專輯色） */
import type { CoverJob } from '@r-gram/catalog';
import { browserTools } from '../covers/browserTools';
import { fetchCoverSource, type MediaFetch } from '../covers/fetchSource';
import { processCover, type ImageTools } from '../covers/processCover';
import type { SyncDeps } from '../sync/runSync';

export const createPrepareCover =
    (
        fetchImpl: MediaFetch = (url, init) => fetch(url, init),
        tools: ImageTools = browserTools(),
    ): SyncDeps['prepareCover'] =>
    async (mediaBase: string, job: CoverJob) => {
        const source = await fetchCoverSource(fetchImpl, mediaBase, job);
        return processCover(source, tools, { accent: job.slot === 'cover' });
    };
