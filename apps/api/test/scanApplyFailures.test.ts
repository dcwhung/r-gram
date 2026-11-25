/*
 * API-031 套用中途出 exception（review W-035）：出錯嗰項回 INTERNAL（通用書面語 message，唔漏內部細節），
 * 其他項目照做，回應仍然係 200、逐項結果真實，catalog 生成一次；出錯嗰項啱啱寫嘅歌詞檔照收
 */
import { env } from 'cloudflare:test';
import { zhHant } from '../src/i18n/zh-Hant';
import { api, json } from './albumFixtures';
import {
    ALBUM_ID,
    insertScanTrack,
    mediaKey,
    putMedia,
    putMediaFiles,
    seedScanAlbum,
} from './scanFixtures';
import type { Loose } from './scanFixtures';
import { lyricsFiles, trackRow } from './trackFixtures';

/** 錯誤 message 入面嘅內部細節：唔可以出現喺回應 */
const INTERNAL_DETAIL = 'r2 key album-11-komorebi/secret';
const TEXT = '歌\n曲：RubberBand\n\n[00:01.00]第一句';

/** binding 嘅 wrapper：`method` 由 `shouldFail(第幾次叫, 第一個參數)` 決定 throw（帶內部細節）定照做 */
const failing = <T extends object>(
    target: T,
    method: string,
    shouldFail: (call: number, first: unknown) => boolean,
): T => {
    let calls = 0;
    return new Proxy(target, {
        get(object, key) {
            const value = Reflect.get(object, key) as unknown;
            if (typeof value !== 'function') return value;
            if (key !== method) return value.bind(object);
            return (...args: unknown[]) => {
                calls += 1;
                if (shouldFail(calls, args[0])) throw new Error(INTERNAL_DETAIL);
                return value.apply(object, args);
            };
        },
    });
};

const applyWith = async (body: unknown, bindings: Partial<Cloudflare.Env>) => {
    const path = `/api/albums/${ALBUM_ID}/scan/apply`;
    const response = await api('POST', path, body, {}, { ...env, ...bindings });
    return { status: response.status, body: await json<Loose>(response) };
};

const INTERNAL_ITEM = { ok: false, code: 'INTERNAL', message: zhHant.scan.items.INTERNAL };

beforeEach(async () => {
    await seedScanAlbum();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('POST /api/albums/:id/scan/apply: an item throws', () => {
    it('should answer 200 with INTERNAL for that item and still apply the others', async () => {
        await insertScanTrack(5, { audio_key: mediaKey('05 a.m4a') });
        await insertScanTrack(6, { audio_key: mediaKey('06 b.m4a') });
        await putMediaFiles(['05 a.m4a', '06 b.m4a', '07 c.m4a']);
        const etag5 = await putMedia('05 a.txt', TEXT);
        const etag6 = await putMedia('06 b.txt', TEXT);
        const MEDIA = failing(env.MEDIA, 'get', (_, key) => key === mediaKey('05 a.txt'));
        const { status, body } = await applyWith(
            {
                songTexts: [
                    { trackId: 'komorebi-05', key: mediaKey('05 a.txt'), etag: etag5 },
                    { trackId: 'komorebi-06', key: mediaKey('06 b.txt'), etag: etag6 },
                ],
                create: [{ no: 7, audioKey: mediaKey('07 c.m4a') }],
            },
            { MEDIA },
        );
        expect(status).toBe(200);
        expect(body.songTexts).toEqual([
            { trackId: 'komorebi-05', ...INTERNAL_ITEM },
            { trackId: 'komorebi-06', ok: true },
        ]);
        expect(body.create[0]).toMatchObject({ no: 7, ok: true });
        expect(body.catalog).toMatchObject({ ok: true, trackCount: 3 });
        expect(JSON.stringify(body)).not.toContain(INTERNAL_DETAIL);
        expect((await trackRow('komorebi-05'))?.text_source_etag).toBeNull();
    });

    it('should report a media link that throws among the skipped items', async () => {
        await insertScanTrack(1);
        await insertScanTrack(2);
        await putMediaFiles(['01 a.m4a', '02 b.m4a', '02 b.mp4']);
        // 只有音檔連結嘅 UPDATE throw；MV 連結照寫
        const DB = failing(env.DB, 'prepare', (_, sql) =>
            String(sql).trimStart().startsWith('UPDATE tracks SET audio_key = ?1'),
        );
        const { status, body } = await applyWith(
            {
                media: [
                    { trackId: 'komorebi-01', kind: 'audio', key: mediaKey('01 a.m4a') },
                    { trackId: 'komorebi-02', kind: 'mv', key: mediaKey('02 b.mp4') },
                ],
            },
            { DB },
        );
        expect(status).toBe(200);
        expect(body.media).toEqual({
            applied: 1,
            skipped: [
                {
                    trackId: 'komorebi-01',
                    kind: 'audio',
                    code: 'INTERNAL',
                    message: zhHant.scan.items.INTERNAL,
                },
            ],
        });
        expect((await trackRow('komorebi-02'))?.mv_key).toBe(mediaKey('02 b.mp4'));
    });

    it('should drop the lyrics file of a created track whose insert throws', async () => {
        await putMediaFiles(['03 c.m4a', '04 d.m4a']);
        const etag = await putMedia('03 c.txt', TEXT);
        // batch 第 1 次 = 讀狀態，第 2 次 = 第一首歌嘅 INSERT
        const DB = failing(env.DB, 'batch', (call) => call === 2);
        const { status, body } = await applyWith(
            {
                create: [
                    {
                        no: 3,
                        audioKey: mediaKey('03 c.m4a'),
                        text: { key: mediaKey('03 c.txt'), etag },
                    },
                    { no: 4, audioKey: mediaKey('04 d.m4a') },
                ],
            },
            { DB },
        );
        expect(status).toBe(200);
        expect(body.create).toEqual([
            { no: 3, ...INTERNAL_ITEM },
            { no: 4, ok: true, trackId: 'komorebi-04', textApplied: false },
        ]);
        expect(await lyricsFiles()).toEqual([]);
        expect(body.catalog).toMatchObject({ ok: true, trackCount: 1 });
    });
});
