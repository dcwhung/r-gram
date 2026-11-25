/* 專輯欄位規則（fieldRules.ts、validate.ts）：資料夾名做 R2 key prefix 嘅安全限制（W-013）、未知欄位名長度（S-053） */
import { FIELD_RULES } from '../src/albums/fieldRules';
import { UNKNOWN_KEY_MAX_CHARS, parseFields } from '../src/albums/validate';
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

describe('unknown field names in validation details (S-053)', () => {
    it('should cut a huge unknown key down before echoing it as the path', () => {
        const key = '鍵'.repeat(100_000);
        const { issues } = parseFields({ [key]: 1 });
        expect(issues).toHaveLength(1);
        expect(issues[0]?.reason).toBe('NOT_EDITABLE');
        expect(issues[0]?.path).toBe('鍵'.repeat(UNKNOWN_KEY_MAX_CHARS));
    });

    it('should echo a short unknown key unchanged', () => {
        expect(parseFields({ enabled: true }).issues).toEqual([
            { path: 'enabled', reason: 'NOT_EDITABLE' },
        ]);
    });
});
