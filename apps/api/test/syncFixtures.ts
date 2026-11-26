/* 同步 test 共用（T-105）：test 媒體 bucket 入面嘅細假檔、三個 sync endpoint、包住媒體 bucket 嘅 proxy */
import { env } from 'cloudflare:test';
import { api, json } from './albumFixtures';

export const FOLDER = 'album-11-komorebi';
export const ALBUM_ID = 'komorebi';

export const KOMOREBI_INFO = [
    '唱片名稱：Komorebi',
    '發行年份：2026',
    '曲目：',
    '1. 下一位參賽者',
    '2. 跟住去邊度',
    '3. 搲撈HK',
    '4. 毒蟲圖鑑',
    '5. 太平門',
].join('\n');

export const TEXT_05 = '太平門\n曲：RubberBand\n詞：Tim Lui\n\n[00:01.00]第一句\n[00:05.00]第二句';

export const mediaKey = (name: string, folder = FOLDER) => `${folder}/${name}`;

/** 放一個檔落媒體 bucket；回佢嘅 httpEtag */
export const putMedia = async (
    name: string,
    body: string | Uint8Array = 'media',
    folder = FOLDER,
) => (await env.MEDIA.put(mediaKey(name, folder), body))?.httpEtag ?? '';

export const deleteMedia = (name: string, folder = FOLDER) =>
    env.MEDIA.delete(mediaKey(name, folder));

/** KOMOREBI：info.txt（5 首）、第 1、3、5 首音檔、第 5 首歌曲文字同 MV、封面 */
export const putKomorebi = async () => {
    await putMedia('info.txt', KOMOREBI_INFO);
    for (const name of ['01 下一位參賽者.m4a', '03 搲撈HK.mp3', '05 太平門.m4a', '05 太平門.mp4'])
        await putMedia(name);
    await putMedia('05 太平門.txt', TEXT_05);
    await putMedia('cover.jpg', 'jpeg');
};

// 回應好深：test 逐項 toMatchObject 驗，唔逐層寫型別
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Loose = Record<string, any>;

export const syncOverview = async (bindings = env) =>
    json<Loose>(await api('GET', '/api/sync', undefined, {}, bindings));

export const syncFolderResponse = (folder = FOLDER, query = '', bindings = env) =>
    api('POST', `/api/sync/folders/${encodeURIComponent(folder)}${query}`, undefined, {}, bindings);

export const syncFolder = async (folder = FOLDER, query = '', bindings = env) => {
    const response = await syncFolderResponse(folder, query, bindings);
    return { status: response.status, body: await json<Loose>(response) };
};

export const confirmRemovals = async (items: unknown, bindings = env) => {
    const response = await api('POST', '/api/sync/removals', { items }, {}, bindings);
    return { status: response.status, body: await json<Loose>(response) };
};

type MediaMethod = 'get' | 'head' | 'put' | 'delete' | 'list';

/** 媒體 bucket 嘅 proxy：`overrides` 換走某啲 method（第二個參數係原本嗰個）；`calls` 記低每個 method 叫過幾多次 */
export const mediaWith = (
    overrides: Partial<
        Record<MediaMethod, (args: unknown[], original: (...a: unknown[]) => unknown) => unknown>
    > = {},
) => {
    const calls: Record<string, number> = {};
    const bucket = new Proxy(env.MEDIA, {
        get(target, key: string) {
            const value = (target as unknown as Record<string, unknown>)[key];
            if (typeof value !== 'function') return value;
            const original = (...args: unknown[]) =>
                (value as (...a: unknown[]) => unknown).apply(target, args);
            return (...args: unknown[]) => {
                calls[key] = (calls[key] ?? 0) + 1;
                const override = overrides[key as MediaMethod];
                return override ? override(args, original) : original(...args);
            };
        },
    });
    return { bindings: { ...env, MEDIA: bucket }, calls };
};

/**
 * 第一頁係真嘅，之後每頁都話「仲有」（永遠讀唔完）。`puts`：有畀就記低每次 put 嘅 key（T-106 寫入守門）
 */
export const endlessList = (puts?: string[]) =>
    mediaWith({
        list: async (args, original) => {
            const [options] = args as [R2ListOptions | undefined];
            if (options?.cursor)
                return { objects: [], delimitedPrefixes: [], truncated: true, cursor: 'next' };
            const page = (await original(options)) as R2Objects;
            return { ...page, truncated: true, cursor: 'next' };
        },
        put: (args, original) => {
            puts?.push(String(args[0]));
            return original(...args);
        },
    });

/** 媒體 bucket 嘅寫入記錄（T-106）：每次 put 嘅 key；calls 記低每個 method 叫過幾多次 */
export const recordedMedia = () => {
    const puts: string[] = [];
    const { bindings, calls } = mediaWith({
        put: (args, original) => {
            puts.push(String(args[0]));
            return original(...args);
        },
    });
    return { bindings, puts, calls };
};

export const tracksOf = async (albumId = ALBUM_ID) =>
    (
        await env.DB.prepare(
            'SELECT id, "no", title, audio_key, mv_key, text_key, text_source_etag, composer FROM tracks WHERE album_id = ? ORDER BY "no"',
        )
            .bind(albumId)
            .all<Loose>()
    ).results;

export const updatedAts = async () =>
    (
        await env.DB.prepare(
            'SELECT id, updated_at FROM albums UNION ALL SELECT id, updated_at FROM tracks ORDER BY 1',
        ).all<Loose>()
    ).results;
