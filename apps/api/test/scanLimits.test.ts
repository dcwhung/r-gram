/*
 * 掃描嘅操作上限（review S-136）：list 最多讀 SCAN_LIST_PAGES_MAX 頁、其他資料夾嘅手動指定檔最多 head
 * SCAN_MANUAL_HEADS_MAX 個；到咗上限就停，喺回應講明（listTruncated、manualUnchecked、truncated），唔會一直讀落去。
 * list 唔完整時，「檔案已唔喺資料夾」唔可靠：預覽唔列 audioMissing，套用唔清音檔連結（STALE）
 */
import { env } from 'cloudflare:test';
import { SCAN_LIST_PAGES_MAX, SCAN_MANUAL_HEADS_MAX } from '../src/config';
import { api, json } from './albumFixtures';
import {
    ALBUM_ID,
    insertScanTrack,
    mediaKey,
    putMediaFiles,
    seedScanAlbum,
    type Loose,
} from './scanFixtures';
import { trackRow } from './trackFixtures';

/** 遠多過任何合理上限：到咗就當無限 loop */
const RUNAWAY_CALLS = 100;

interface Counted {
    bucket: R2Bucket;
    calls: () => number;
}

/**
 * 媒體 bucket：第一頁係真嘅，之後每頁都話「仲有」（永遠讀唔完）；計 list 次數。
 * 叫到 RUNAWAY_CALLS 次就 throw，test 唔會無限 loop
 */
const endlessList = (): Counted => {
    let calls = 0;
    const list = async (options?: R2ListOptions) => {
        calls += 1;
        if (calls > RUNAWAY_CALLS) throw new Error('listing never stops');
        if (options?.cursor)
            return { objects: [], delimitedPrefixes: [], truncated: true, cursor: 'next' };
        return { ...(await env.MEDIA.list(options)), truncated: true, cursor: 'next' };
    };
    return { bucket: wrapBucket({ list }), calls: () => calls };
};

/** 媒體 bucket：計 head 次數 */
const countedHead = (): Counted => {
    let calls = 0;
    const head = (key: string) => {
        calls += 1;
        return env.MEDIA.head(key);
    };
    return { bucket: wrapBucket({ head }), calls: () => calls };
};

const wrapBucket = (overrides: Record<string, unknown>): R2Bucket =>
    new Proxy(env.MEDIA, {
        get(target, key: string) {
            if (key in overrides) return overrides[key];
            const value = Reflect.get(target, key) as unknown;
            return typeof value === 'function' ? value.bind(target) : value;
        },
    });

const call = async (method: string, path: string, MEDIA: R2Bucket, body?: unknown) => {
    const response = await api(method, path, body, {}, { ...env, MEDIA });
    return { status: response.status, body: await json<Loose>(response) };
};

beforeEach(async () => {
    await seedScanAlbum();
});

describe('scan limits: listing pages', () => {
    it('should stop the preview listing at the page limit and say so', async () => {
        await insertScanTrack(9, { audio_key: mediaKey('09 gone.m4a') });
        await putMediaFiles(['01 a.m4a']);
        const media = endlessList();
        const { status, body } = await call('GET', `/api/albums/${ALBUM_ID}/scan`, media.bucket);
        expect(status).toBe(200);
        expect(media.calls()).toBe(SCAN_LIST_PAGES_MAX);
        expect(body.listTruncated).toBe(true);
        expect(body.newTracks.map(({ no }: Loose) => no)).toEqual([1]);
        // 冇讀晒：唔可以話 09 嘅音檔唔見咗
        expect(body.audioMissing).toEqual([]);
    });

    it('should say the listing is complete when it is', async () => {
        await putMediaFiles(['01 a.m4a']);
        const { body } = await call('GET', `/api/albums/${ALBUM_ID}/scan`, env.MEDIA);
        expect(body).toMatchObject({ listTruncated: false, manualUnchecked: [] });
    });

    it('should not clear an audio link when the apply listing is incomplete', async () => {
        await insertScanTrack(9, { audio_key: mediaKey('09 gone.m4a') });
        await putMediaFiles(['01 a.m4a']);
        const media = endlessList();
        const item = { trackId: 'komorebi-09', audioKey: mediaKey('09 gone.m4a') };
        const path = `/api/albums/${ALBUM_ID}/scan/apply`;
        const { body } = await call('POST', path, media.bucket, { clearAudio: [item] });
        expect(media.calls()).toBe(SCAN_LIST_PAGES_MAX);
        expect(body.clearAudio[0]).toMatchObject({ ok: false, code: 'STALE' });
        expect((await trackRow('komorebi-09'))?.audio_key).toBe(mediaKey('09 gone.m4a'));
    });

    it('should stop the media listing at the page limit and say so', async () => {
        await putMediaFiles(['01 a.m4a']);
        const media = endlessList();
        const { body } = await call('GET', '/api/media', media.bucket);
        expect(media.calls()).toBe(SCAN_LIST_PAGES_MAX);
        expect(body).toMatchObject({ folders: ['album-11-komorebi/'], truncated: true });
    });
});

describe('scan limits: manual files in the album folder', () => {
    it('should check them against the listing, or leave them unchecked when it is incomplete', async () => {
        const manual = { trackId: 'komorebi-02', kind: 'mv', key: mediaKey('02 old.mp4') };
        await insertScanTrack(2, { mv_key: manual.key, mv_manual: 1 });
        await putMediaFiles(['01 a.m4a']);
        const path = `/api/albums/${ALBUM_ID}/scan`;
        const complete = (await call('GET', path, env.MEDIA)).body;
        expect(complete).toMatchObject({ manualMissing: [manual], manualUnchecked: [] });
        const partial = (await call('GET', path, endlessList().bucket)).body;
        expect(partial).toMatchObject({ manualMissing: [], manualUnchecked: [manual] });
    });
});

describe('scan limits: manual files in other folders', () => {
    it('should head at most the limit and list the rest as unchecked', async () => {
        const count = SCAN_MANUAL_HEADS_MAX + 1;
        for (let no = 1; no <= count; no += 1)
            await insertScanTrack(no, { audio_key: `other/${no}.m4a`, audio_manual: 1 });
        await putMediaFiles(['01 a.txt']);
        const media = countedHead();
        const { body } = await call('GET', `/api/albums/${ALBUM_ID}/scan`, media.bucket);
        expect(media.calls()).toBe(SCAN_MANUAL_HEADS_MAX);
        expect(body.manualMissing).toHaveLength(SCAN_MANUAL_HEADS_MAX);
        expect(body.manualUnchecked).toEqual([
            { trackId: `${ALBUM_ID}-${count}`, kind: 'audio', key: `other/${count}.m4a` },
        ]);
    });
});
