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
    /** 呢個資料夾而家嘅曲目表（歌號）；null = 唔知（S-164）。`hadInfo` = 專輯之前用過 `info.txt` */
    listedNumbers: (name: string, hadInfo: boolean) => Promise<Set<number> | null>;
}

/** 呢個資料夾有冇某類（音檔、MV、`.txt` 用歌號；封面用類別）嘅檔 */
export const hasFile = (files: readonly ScanFile[], kind: string, no?: number): boolean =>
    files.some(({ key }) => {
        const found = classifyFile(key);
        return found.kind === kind && (no === undefined || ('no' in found && found.no === no));
    });

/**
 * 音檔、MV、`.txt` 嘅連結仲會由同步留住：D1 連住嗰個仲喺度，或者嗰個歌號啱啱好得一個（同步會連去佢）。
 * 幾個而冇 D1 嗰個 = 衝突，同步當冇（S-165），可以清
 */
export const keepsTrackFile = (
    files: readonly ScanFile[],
    kind: string,
    no: number,
    key: string,
): boolean => {
    const same = files.filter((file) => hasFile([file], kind, no));
    return same.length === 1 || same.some((file) => file.key === key);
};

const audioNumbers = (files: readonly ScanFile[]): Set<number> =>
    new Set(
        files.flatMap(({ key }) => {
            const found = classifyFile(key);
            return found.kind === 'audio' ? [found.no] : [];
        }),
    );

/**
 * 曲目表；null = 唔知（`info.txt` 有但用唔到，而呢張碟之前用過 `info.txt`：同步沿用 D1 嘅曲目，S-164）
 */
const numbersOf = async (
    bucket: R2Bucket,
    files: readonly ScanFile[],
    hadInfo: boolean,
): Promise<Set<number> | null> => {
    const file = infoFileOf(files);
    const read = file ? await readInfoText(bucket, file) : null;
    if (read && !read.info.usable && hadInfo) return null;
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
    const numbers = new Map<string, Promise<Set<number> | null>>();
    const listedNumbers = (name: string, hadInfo: boolean) => {
        const hit =
            numbers.get(name) ?? folder(name).then((l) => numbersOf(env.MEDIA, l.files, hadInfo));
        numbers.set(name, hit);
        return hit;
    };
    return { root: () => (root ??= listAlbumFolders(env.MEDIA)), folder, listedNumbers };
};
