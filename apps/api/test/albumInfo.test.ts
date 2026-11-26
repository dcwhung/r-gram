/*
 * API-018 GET、API-019 PUT /api/albums/:id/info（T-106；Technical Spec「寫返媒體 bucket」；Functional Spec D75、FR-128）：
 * 讀寫媒體 bucket 嘅 `info.txt`；ETag 前提（STALE）；大細上限（413）；內容唔擋；寫完即刻同步呢個資料夾（同 API-034 一樣）
 */
import { INFO_TEXT_MAX_BYTES, INFO_TEXT_MAX_LINES } from '@r-gram/catalog';
import { env } from 'cloudflare:test';
import { albumRow, api, json } from './albumFixtures';
import { liveDocument } from './catalogFixtures';
import {
    ALBUM_ID,
    KOMOREBI_INFO,
    deleteMedia,
    endlessList,
    mediaKey,
    putKomorebi,
    putMedia,
    recordedMedia,
    syncFolder,
    tracksOf,
    type Loose,
} from './syncFixtures';

const INFO_KEY = mediaKey('info.txt');
const HUGE_BODY_CHARS = 2_000_000;

const getInfo = async (id = ALBUM_ID) => {
    const response = await api('GET', `/api/albums/${id}/info`);
    return { status: response.status, body: await json<Loose>(response) };
};

const putInfo = async (body: unknown, id = ALBUM_ID, bindings = env) => {
    const response = await api('PUT', `/api/albums/${id}/info`, body, {}, bindings);
    return { status: response.status, body: await json<Loose>(response) };
};

const mediaText = async (key = INFO_KEY) => (await env.MEDIA.get(key))?.text();
const etagOf = async (key = INFO_KEY) => (await env.MEDIA.head(key))?.httpEtag ?? null;

beforeEach(async () => {
    await putKomorebi();
    await syncFolder();
});

describe('GET /api/albums/:id/info', () => {
    it('should give the info.txt of the folder with its key and ETag', async () => {
        const { status, body } = await getInfo();
        expect(status).toBe(200);
        expect(body).toEqual({
            key: INFO_KEY,
            etag: await etagOf(),
            text: KOMOREBI_INFO,
            problem: null,
        });
    });

    it('should use the existing file whatever the case of its name', async () => {
        await deleteMedia('info.txt');
        await putMedia('Info.txt', KOMOREBI_INFO);
        expect((await getInfo()).body.key).toBe(mediaKey('Info.txt'));
    });

    it('should offer a text built from the stored album when the folder has no info.txt', async () => {
        await deleteMedia('info.txt');
        const { body } = await getInfo();
        expect(body).toEqual({
            key: INFO_KEY,
            etag: null,
            text: '唱片名稱：Komorebi\n發行年份：2026\n曲目：\n1. 下一位參賽者\n2. 跟住去邊度\n3. 搲撈HK\n4. 毒蟲圖鑑\n5. 太平門\n',
            problem: null,
        });
    });

    it('should say when the file is not UTF-8 or too large', async () => {
        await putMedia('info.txt', new Uint8Array([0x41, 0xff]));
        expect((await getInfo()).body).toMatchObject({ text: 'A\uFFFD', problem: 'BAD_ENCODING' });
        await putMedia('info.txt', 'x'.repeat(INFO_TEXT_MAX_BYTES + 1));
        expect((await getInfo()).body).toMatchObject({ text: null, problem: 'TOO_LARGE' });
    });

    it('should answer 404 for an unknown album', async () => {
        const { status, body } = await getInfo('nothing');
        expect(status).toBe(404);
        expect(body.error.code).toBe('NOT_FOUND');
    });
});

describe('PUT /api/albums/:id/info: saving', () => {
    it('should write the file, sync the folder and answer with the sync result', async () => {
        const etag = await etagOf();
        const text = `${KOMOREBI_INFO.replace('Komorebi', '木漏日')}\n6. 理想的下午\n???`;
        const { status, body } = await putInfo({ text, etag });
        expect(status).toBe(200);
        expect(await mediaText()).toBe(text);
        expect(body).toMatchObject({
            key: INFO_KEY,
            etag: await etagOf(),
            album: { id: ALBUM_ID, title: '木漏日' },
            added: [{ trackId: 'komorebi-06', no: 6, title: '理想的下午' }],
            pendingRemovals: [],
            coverJobs: expect.any(Array),
            catalog: { ok: true },
        });
        expect(body.checks.map(({ code }: Loose) => code)).toEqual(['INFO_UNKNOWN_LINE']);
        expect((await liveDocument())?.albums[0]?.title).toBe('木漏日');
        expect((await albumRow(ALBUM_ID))?.info_etag).toBe(body.etag);
    });

    it('should create info.txt when the folder has none', async () => {
        await deleteMedia('info.txt');
        const { status, body } = await putInfo({ text: '唱片名稱：K\n1. 甲', etag: null });
        expect(status).toBe(200);
        expect(await mediaText()).toBe('唱片名稱：K\n1. 甲');
        expect(body.album.title).toBe('K');
    });

    it('should write to the existing file whatever the case of its name', async () => {
        await deleteMedia('info.txt');
        const etag = await putMedia('Info.txt', KOMOREBI_INFO);
        const { puts, bindings } = recordedMedia();
        expect((await putInfo({ text: '唱片名稱：K', etag }, ALBUM_ID, bindings)).status).toBe(200);
        expect(puts).toEqual([mediaKey('Info.txt')]);
        expect(await mediaText()).toBeUndefined();
    });

    it('should store UTF-8 without BOM and with LF only', async () => {
        await putInfo({ text: '\uFEFF唱片名稱：K\r\n1. 甲\r\n', etag: await etagOf() });
        expect(await mediaText()).toBe('唱片名稱：K\n1. 甲\n');
    });

    it('should list a track that the new text drops and delete nothing', async () => {
        const text = KOMOREBI_INFO.replace('4. 毒蟲圖鑑\n', '');
        const { body } = await putInfo({ text, etag: await etagOf() });
        expect(body.pendingRemovals).toEqual([
            expect.objectContaining({ kind: 'track', trackId: 'komorebi-04' }),
        ]);
        expect(await tracksOf()).toHaveLength(5);
    });
});

describe('PUT /api/albums/:id/info: versions', () => {
    it('should answer 409 STALE and keep the file when it changed since it was read', async () => {
        const etag = await etagOf();
        await putMedia('info.txt', `${KOMOREBI_INFO}\n6. 別處改的`);
        const { status, body } = await putInfo({ text: '唱片名稱：K', etag });
        expect(status).toBe(409);
        expect(body.error).toEqual({
            code: 'STALE',
            message: '檔案已在其他地方更改，請重新載入。',
        });
        expect(await mediaText()).toBe(`${KOMOREBI_INFO}\n6. 別處改的`);
        expect((await albumRow(ALBUM_ID))?.title).toBe('Komorebi');
    });

    it('should not create a file over one that appeared since it was read', async () => {
        const { status } = await putInfo({ text: '唱片名稱：K', etag: null });
        expect(status).toBe(409);
        expect(await mediaText()).toBe(KOMOREBI_INFO);
    });

    it('should let only one of two saves of the same version win', async () => {
        const etag = await etagOf();
        const results = await Promise.all([
            putInfo({ text: '唱片名稱：甲', etag }),
            putInfo({ text: '唱片名稱：乙', etag }),
        ]);
        expect(results.map(({ status }) => status).sort()).toEqual([200, 409]);
        const winner = results.find(({ status }) => status === 200)?.body;
        expect(await mediaText()).toBe(`唱片名稱：${winner?.album.title}`);
    });
});

describe('PUT /api/albums/:id/info: checks before writing', () => {
    it.each([
        ['bytes', 'x'.repeat(INFO_TEXT_MAX_BYTES + 1)],
        ['lines', `${'\n'.repeat(INFO_TEXT_MAX_LINES)}x`],
    ])('should answer 413 TOO_LARGE for too many %s and write nothing', async (_name, text) => {
        const { puts, bindings } = recordedMedia();
        const { status, body } = await putInfo({ text, etag: await etagOf() }, ALBUM_ID, bindings);
        expect(status).toBe(413);
        expect(body.error.code).toBe('TOO_LARGE');
        expect(puts).toEqual([]);
    });

    it('should answer 413 for a huge body without parsing it', async () => {
        const huge = 'x'.repeat(HUGE_BODY_CHARS);
        const response = await api('PUT', `/api/albums/${ALBUM_ID}/info`, huge);
        expect(response.status).toBe(413);
    });

    it.each([
        [[], '$', 'NOT_AN_OBJECT'],
        [{ etag: null }, 'text', 'REQUIRED'],
        [{ text: 1, etag: null }, 'text', 'NOT_TEXT'],
        [{ text: 'x' }, 'etag', 'REQUIRED'],
        [{ text: 'x', etag: '*' }, 'etag', 'INVALID_VALUE'],
        [{ text: 'x', etag: 'W/"abc"' }, 'etag', 'INVALID_VALUE'],
        [{ text: 'x', etag: null, key: 'album-01-x/info.txt' }, 'key', 'NOT_EDITABLE'],
    ])('should refuse %j at %s with %s', async (body, path, reason) => {
        const { puts, bindings } = recordedMedia();
        const { status, body: answer } = await putInfo(body, ALBUM_ID, bindings);
        expect(status).toBe(400);
        expect(answer.error.details).toContainEqual({ path, reason, message: expect.any(String) });
        expect(puts).toEqual([]);
    });

    it('should answer 404 for an unknown album and write nothing', async () => {
        const { puts, bindings } = recordedMedia();
        const { status } = await putInfo({ text: 'x', etag: null }, 'nothing', bindings);
        expect(status).toBe(404);
        expect(puts).toEqual([]);
    });

    it('should not write when the stored folder is not an album folder or is gone', async () => {
        const { puts, bindings } = recordedMedia();
        await env.DB.prepare("UPDATE albums SET folder = '_fonts'").run();
        expect((await putInfo({ text: 'x', etag: null }, ALBUM_ID, bindings)).status).toBe(400);
        await env.DB.prepare("UPDATE albums SET folder = 'album-12-komorebi'").run();
        expect((await putInfo({ text: 'x', etag: null }, ALBUM_ID, bindings)).status).toBe(404);
        expect(puts).toEqual([]);
        expect(await env.MEDIA.head('_fonts/info.txt')).toBeNull();
    });

    // W-048（mutant N15）：list 唔齊又搵唔到 info.txt = 唔知會唔會開多一個（例如已有 Info.txt）
    it('should answer 409 STALE and write nothing when the listing is cut short without info.txt', async () => {
        await deleteMedia('info.txt');
        const puts: string[] = [];
        const { bindings } = endlessList(puts);
        const { status, body } = await putInfo(
            { text: '唱片名稱：K', etag: null },
            ALBUM_ID,
            bindings,
        );
        expect(status).toBe(409);
        expect(body.error.code).toBe('STALE');
        expect(puts).toEqual([]);
        expect(await env.MEDIA.head(INFO_KEY)).toBeNull();
    });

    it('should never delete anything in the media bucket', async () => {
        const { calls, bindings } = recordedMedia();
        await putInfo({ text: '唱片名稱：K', etag: await etagOf() }, ALBUM_ID, bindings);
        expect(calls.delete).toBeUndefined();
    });
});
