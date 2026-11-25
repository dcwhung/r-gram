/* 專輯欄位規則（fieldRules.ts）：資料夾名做 R2 key prefix 嘅安全限制（review W-013） */
import { FIELD_RULES } from '../src/albums/fieldRules';
import { api, json } from './albumFixtures';

const reasonOf = (field: keyof typeof FIELD_RULES, value: unknown) => {
    const result = FIELD_RULES[field](value);
    return result.ok ? 'OK' : result.reason;
};

describe('folder rule', () => {
    it('should refuse dot segments and characters that break a media URL', () => {
        for (const name of ['.', '..', ' .. ', 'a/b', 'a\\b', 'a?b', 'a#b', 'a%20b', '%']) {
            expect(reasonOf('folder', name), name).toBe('INVALID_FOLDER');
        }
    });

    it('should keep ordinary names: letters, digits, hyphen, underscore, spaces, CJK, inner dots', () => {
        for (const name of [
            'Beaming 2005',
            'apollo-18',
            'lost_found',
            '《原始的你》',
            'vol.2',
            '...',
        ]) {
            expect(reasonOf('folder', name), name).toBe('OK');
        }
    });

    it('should answer 400 INVALID_FOLDER through the API for a parent-directory name', async () => {
        const response = await api('POST', '/api/albums', { id: 'x', title: 'X', folder: '..' });
        expect(response.status).toBe(400);
        const body = await json<{ error: { details: { path: string; reason: string }[] } }>(
            response,
        );
        expect(body.error.details).toMatchObject([{ path: 'folder', reason: 'INVALID_FOLDER' }]);
    });
});
