/*
 * 搵測試碟嘅檔：讀 info.txt（packages/catalog 嘅 parser）→ 每首歌砌候選檔名 → 逐個問 bucket。
 * 每首歌搵到第一個就停；歌與歌之間同時問（上限 PROBE_CONCURRENCY）。
 */
import { type AlbumInfoTrack, parseAlbumInfo } from '@r-gram/catalog';
import { PROBE_CONCURRENCY } from '../config';
import {
    candidateNames,
    COVER_NAMES,
    folderFileUrl,
    INFO_FILE,
    type MediaKind,
} from './candidates';
import { errorText, type Fetcher, probe } from './probe';

export interface DiscoverOptions {
    base: string;
    folder: string;
    fetcher?: Fetcher;
}

export interface Discovery {
    info: 'ok' | 'missing' | 'error';
    infoError?: string;
    albumTitle: string | null;
    tracks: AlbumInfoTrack[];
    /** 搵到嘅音檔名（按歌號） */
    audio: string[];
    mv: string | null;
    cover: string | null;
    /** 發咗幾多個請求 */
    requests: number;
}

type InfoResult = Pick<Discovery, 'info' | 'infoError' | 'albumTitle' | 'tracks'>;

const readInfo = async (url: string, fetcher: Fetcher): Promise<InfoResult> => {
    const none = { albumTitle: null, tracks: [] };
    try {
        const response = await fetcher(url, { cache: 'no-store' });
        if (!response.ok) return { ...none, info: 'missing', infoError: `HTTP ${response.status}` };
        const { title, tracks } = parseAlbumInfo(await response.text());
        return {
            info: 'ok',
            albumTitle: title,
            tracks: tracks.map(({ no, title: name }) => ({ no, title: name })),
        };
    } catch (error) {
        return { ...none, info: 'error', infoError: errorText(error) };
    }
};

/** 逐個問，第一個有嘅就係 */
const firstFound = async (
    names: readonly string[],
    urlOf: (name: string) => string,
    fetcher: Fetcher,
): Promise<string | null> => {
    for (const name of names) {
        if ((await probe(urlOf(name), fetcher)).found) return name;
    }
    return null;
};

/** 同時最多跑 `limit` 個，結果按原本次序 */
const mapLimit = async <T, R>(items: readonly T[], limit: number, run: (item: T) => Promise<R>) => {
    const results: R[] = new Array<R>(items.length);
    let next = 0;
    const worker = async () => {
        while (next < items.length) {
            const index = next++;
            results[index] = await run(items[index] as T);
        }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
};

const counting = (fetcher: Fetcher) => {
    let requests = 0;
    const counted: Fetcher = (url, init) => {
        requests += 1;
        return fetcher(url, init);
    };
    return { counted, count: () => requests };
};

const defaultFetcher: Fetcher = (url, init) => fetch(url, init);

export const discover = async ({ base, folder, fetcher = defaultFetcher }: DiscoverOptions) => {
    const { counted, count } = counting(fetcher);
    const urlOf = (name: string) => folderFileUrl(base, folder, name);
    const info = await readInfo(urlOf(INFO_FILE), counted);
    const cover = await firstFound(COVER_NAMES, urlOf, counted);
    const kinds: MediaKind[] = ['audio', 'mv'];
    const jobs = info.tracks.flatMap((track) => kinds.map((kind) => ({ track, kind })));
    const found = await mapLimit(jobs, PROBE_CONCURRENCY, ({ track, kind }) =>
        firstFound(candidateNames(track, kind), urlOf, counted),
    );
    const named = (kind: MediaKind) =>
        jobs.flatMap((job, index) => {
            const name = found[index];
            return job.kind === kind && name ? [name] : [];
        });
    const result: Discovery = {
        ...info,
        audio: named('audio'),
        mv: named('mv')[0] ?? null,
        cover,
        requests: count(),
    };
    return result;
};
