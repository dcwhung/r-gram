/* catalog 生成（T-026）test 共用：讀 R2 嘅 catalog.json、catalog_state、包住 R2 bucket 嘅 proxy */
import { env } from 'cloudflare:test';

export const CATALOG_KEY = 'catalog/v1/catalog.json';
export const SHA256_HEX = /^[0-9a-f]{64}$/;
export const IMAGE_BASE = `${env.WORKER_ORIGIN}/catalog/v1/img/`;
export const LYRICS_BASE = `${env.WORKER_ORIGIN}/catalog/v1/lyrics/`;

export interface LiveDocument {
    version: number;
    generatedAt: string;
    mediaBase: string;
    imageBase: string;
    lyricsBase: string;
    albums: LiveAlbum[];
}

export type LiveAlbum = Record<string, unknown> & {
    id: string;
    title: string;
    tracks: Record<string, unknown>[];
};

/** R2 而家嗰份 catalog.json；未有 → null */
export const liveDocument = async (): Promise<LiveDocument | null> => {
    const object = await env.CATALOG.get(CATALOG_KEY);
    return object ? ((await object.json()) as LiveDocument) : null;
};

export const liveObject = () => env.CATALOG.head(CATALOG_KEY);

export const stateRow = () =>
    env.DB.prepare('SELECT * FROM catalog_state WHERE id = 1').first<Record<string, unknown>>();

type BucketMethod = 'get' | 'head' | 'put' | 'delete' | 'list';

/**
 * R2 bucket 嘅 proxy：`overrides` 入面嘅 method 換做自己嘅版本（第二個參數係原本嗰個），
 * 其他照用真 bucket；`calls` 記低每個 method 叫過幾多次
 */
export const bucketWith = (
    overrides: Partial<
        Record<BucketMethod, (args: unknown[], original: (...a: unknown[]) => unknown) => unknown>
    > = {},
) => {
    const calls: Record<string, number> = {};
    const bucket = new Proxy(env.CATALOG, {
        get(target, key: string) {
            const value = (target as unknown as Record<string, unknown>)[key];
            if (typeof value !== 'function') return value;
            const original = (...args: unknown[]) =>
                (value as (...a: unknown[]) => unknown).apply(target, args);
            return (...args: unknown[]) => {
                calls[key] = (calls[key] ?? 0) + 1;
                const override = overrides[key as BucketMethod];
                return override ? override(args, original) : original(...args);
            };
        },
    });
    return { bucket, calls };
};
