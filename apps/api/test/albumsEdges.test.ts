/* 專輯 API 嘅邊界：updated_at 一定向前行、PATCH body 唔係 object、資料夾 / 日期細節、同時刪除 */
import { env } from 'cloudflare:test';
import { deleteAlbum } from '../src/albums/store';
import { nextUpdatedAt } from '../src/lib/updatedAt';
import { NOW, api, insertAlbum, json } from './albumFixtures';

interface ErrorBody {
    error: { details?: { path: string; reason: string }[] };
}

const reasonsOf = async (response: Response) =>
    (await json<ErrorBody>(response)).error.details?.map((d) => `${d.path}:${d.reason}`);

describe('nextUpdatedAt', () => {
    const now = new Date('2026-11-25T08:00:00.000Z');

    it('should use the current time when it is later than the previous value', () => {
        expect(nextUpdatedAt(NOW, now)).toBe('2026-11-25T08:00:00.000Z');
    });

    it('should move 1 ms past a previous value in the same or a later millisecond', () => {
        expect(nextUpdatedAt('2026-11-25T08:00:00.000Z', now)).toBe('2026-11-25T08:00:00.001Z');
        expect(nextUpdatedAt('2026-11-25T09:00:00.000Z', now)).toBe('2026-11-25T09:00:00.001Z');
    });

    it('should fall back to the current time without a readable previous value', () => {
        expect(nextUpdatedAt(undefined, now)).toBe(now.toISOString());
        expect(nextUpdatedAt('not a date', now)).toBe(now.toISOString());
    });
});

describe('album edge cases', () => {
    it('should answer VALIDATION_ERROR for a PATCH body that is not a JSON object', async () => {
        await insertAlbum('a', 1);
        const response = await api('PATCH', '/api/albums/a', '[]', { 'if-match': `"${NOW}"` });
        expect(response.status).toBe(400);
        expect(await reasonsOf(response)).toEqual(['$:NOT_AN_OBJECT']);
    });

    it('should tell an over-long folder from a bad one, and refuse a malformed date string', async () => {
        const response = await api('POST', '/api/albums', {
            id: 'x',
            title: 'X',
            folder: 'f'.repeat(201),
            releaseDate: '26/09/2008',
        });
        expect((await reasonsOf(response))?.sort()).toEqual([
            'folder:TOO_LONG',
            'releaseDate:INVALID_DATE',
        ]);
    });

    it('should report an album deleted by another request as gone', async () => {
        expect(await deleteAlbum(env.DB, 'never-there')).toBeUndefined();
    });
});
