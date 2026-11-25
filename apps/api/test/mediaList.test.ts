/*
 * API-032 GET /api/media?prefix=（T-025；手動指定音檔 / MV 時揀檔用）：媒體 bucket 一層（資料夾 + 檔）。
 * `_` 開頭嘅第一層資料夾（例如 `_fonts/`）唔係專輯，唔列亦唔可以開（Technical Spec CR-004）
 */
import { api, json } from './albumFixtures';
import { call } from './helpers';
import { putMedia, type Loose } from './scanFixtures';
import { scanErrorMessage, scanReasonMessage, itemMessage } from '../src/media/errors';
import { zhHant } from '../src/i18n/zh-Hant';

const list = async (prefix?: string) => {
    const query = prefix === undefined ? '' : `?prefix=${encodeURIComponent(prefix)}`;
    const response = await api('GET', `/api/media${query}`);
    return { status: response.status, body: await json<Loose>(response) };
};

describe('GET /api/media', () => {
    beforeEach(async () => {
        await putMedia('01 一早地下鐵.m4a', 'audio', 'album-01-apollo-18');
        await putMedia('cover.jpg', 'img', 'album-01-apollo-18');
        await putMedia('extra/x.mp4', 'mv', 'album-01-apollo-18');
        await putMedia('lubalin-graph-book.otf', 'font', '_fonts');
    });

    it('should list the album folders at the top level, hiding reserved ones', async () => {
        const { status, body } = await list();
        expect(status).toBe(200);
        expect(body).toEqual({ prefix: '', folders: ['album-01-apollo-18/'], files: [] });
    });

    it('should list the files and sub-folders of a folder', async () => {
        const { body } = await list('album-01-apollo-18/');
        expect(body.folders).toEqual(['album-01-apollo-18/extra/']);
        expect(body.files).toEqual([
            {
                key: 'album-01-apollo-18/01 一早地下鐵.m4a',
                bytes: 5,
                etag: expect.stringMatching(/^"/),
            },
            { key: 'album-01-apollo-18/cover.jpg', bytes: 3, etag: expect.any(String) },
        ]);
    });

    it.each(['album-01-apollo-18', '../', '/album/', '_fonts/', 'a/../b/'])(
        'should refuse the prefix %s',
        async (prefix) => {
            const { status, body } = await list(prefix);
            expect(status).toBe(400);
            expect(body.error.details[0]).toMatchObject({
                path: 'prefix',
                reason: 'INVALID_PREFIX',
            });
        },
    );

    it('should need a session', async () => {
        expect((await call('/api/media')).status).toBe(401);
    });
});

describe('scan messages', () => {
    const BRACE = /[{}]/;

    it('should leave no placeholder in any scan message', () => {
        const reasons = Object.keys(zhHant.scan.reasons) as (keyof typeof zhHant.scan.reasons)[];
        for (const reason of reasons) expect(scanReasonMessage(reason), reason).not.toMatch(BRACE);
        const errors = Object.keys(zhHant.scan.errors) as (keyof typeof zhHant.scan.errors)[];
        for (const error of errors) expect(scanErrorMessage(error), error).not.toMatch(BRACE);
        const items = Object.keys(zhHant.scan.items) as (keyof typeof zhHant.scan.items)[];
        for (const item of items) expect(itemMessage(item), item).not.toMatch(BRACE);
    });
});
