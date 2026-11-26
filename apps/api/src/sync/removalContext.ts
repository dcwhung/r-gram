/*
 * API-035 逐項再對一次媒體 bucket（Technical Spec API-035）：同一個請求入面 bucket 第一層同每個資料夾只 list 一次，
 * 每張碟嘅曲目表（`info.txt` 用得 = 佢嘅歌號；否則音檔歌號，同 planFolderSync 一樣）只讀一次
 */
import { classifyFile, type ScanFile } from '@r-gram/catalog';
import type { Env } from '../env';
import { listFolder, type FolderListing } from '../media/listing';
import { listAlbumFolders, type BucketFolders } from './folders';
import { infoFileOf, readInfoText } from './infoFile';

export interface RemovalContext {
    root: () => Promise<BucketFolders>;
    folder: (name: string) => Promise<FolderListing>;
    /** 呢個資料夾而家嘅曲目表（歌號） */
    listedNumbers: (name: string) => Promise<Set<number>>;
}

/** 呢個資料夾有冇某類（音檔、MV、`.txt` 用歌號；封面用類別）嘅檔 */
export const hasFile = (files: readonly ScanFile[], kind: string, no?: number): boolean =>
    files.some(({ key }) => {
        const found = classifyFile(key);
        return found.kind === kind && (no === undefined || ('no' in found && found.no === no));
    });

const audioNumbers = (files: readonly ScanFile[]): Set<number> =>
    new Set(
        files.flatMap(({ key }) => {
            const found = classifyFile(key);
            return found.kind === 'audio' ? [found.no] : [];
        }),
    );

const numbersOf = async (bucket: R2Bucket, files: readonly ScanFile[]): Promise<Set<number>> => {
    const file = infoFileOf(files);
    const read = file ? await readInfoText(bucket, file) : null;
    if (!read?.info.usable) return audioNumbers(files);
    return new Set(read.info.tracks.map(({ no }) => no));
};

const cached = <T>(load: (name: string) => Promise<T>) => {
    const cache = new Map<string, Promise<T>>();
    return (name: string): Promise<T> => {
        const hit = cache.get(name) ?? load(name);
        cache.set(name, hit);
        return hit;
    };
};

export const removalContext = (env: Pick<Env, 'MEDIA'>): RemovalContext => {
    let root: Promise<BucketFolders> | undefined;
    const folder = cached((name) => listFolder(env.MEDIA, name));
    const listedNumbers = cached(async (name) => numbersOf(env.MEDIA, (await folder(name)).files));
    return { root: () => (root ??= listAlbumFolders(env.MEDIA)), folder, listedNumbers };
};
