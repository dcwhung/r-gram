/* 專輯欄位規則（fieldRules.ts、validate.ts）：資料夾名做 R2 key prefix 嘅安全限制（W-013）、未知欄位名長度（S-053） */
import { FIELD_RULES } from '../src/albums/fieldRules';
import { parseFields } from '../src/albums/validate';
import { UNKNOWN_FIELDS_MAX, UNKNOWN_KEY_MAX_CHARS } from '../src/lib/fields';
import { zhHant } from '../src/i18n/zh-Hant';
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

    // backlog B-046 ①：5,000 個未知欄位唔可以變成 5,000 條 details
    it('should list at most UNKNOWN_FIELDS_MAX unknown fields, then one summary detail', async () => {
        const body: Record<string, unknown> = { title: 'X' };
        for (let index = 0; index < 5_000; index += 1) body[`k${index}`] = index;
        const response = await api('PATCH', '/api/albums/x', body, { 'if-match': '"t"' });
        expect(response.status).toBe(400);
        const { error } = await json<{
            error: { details: { path: string; reason: string; message: string }[] };
        }>(response);
        expect(error.details).toHaveLength(UNKNOWN_FIELDS_MAX + 1);
        expect(error.details[0]).toMatchObject({ path: 'k0', reason: 'NOT_EDITABLE' });
        expect(error.details.at(-1)).toEqual({
            path: '$',
            reason: 'TOO_MANY_UNKNOWN_FIELDS',
            message: zhHant.albums.reasons.TOO_MANY_UNKNOWN_FIELDS.replace(
                '{max}',
                String(UNKNOWN_FIELDS_MAX),
            ),
        });
    });

    it('should not add the summary at exactly UNKNOWN_FIELDS_MAX unknown fields', () => {
        const body = Object.fromEntries(
            Array.from({ length: UNKNOWN_FIELDS_MAX }, (_, index) => [`k${index}`, index]),
        );
        const { issues } = parseFields(body);
        expect(issues).toHaveLength(UNKNOWN_FIELDS_MAX);
        expect(issues.every((issue) => issue.reason === 'NOT_EDITABLE')).toBe(true);
    });

    it('should echo a short unknown key unchanged', () => {
        expect(parseFields({ enabled: true }).issues).toEqual([
            { path: 'enabled', reason: 'NOT_EDITABLE' },
        ]);
    });
});

describe('shared character rule for text fields and wheelKey (S-054)', () => {
    /** 控制（Cc：U+0001、U+007F）、格式（Cf：零寬空格、RTL override、BOM）、行分隔（Zl）、段分隔（Zp） */
    const HIDDEN_CODE_POINTS = [0x01, 0x7f, 0x200b, 0x202e, 0xfeff, 0x2028, 0x2029];
    const HIDDEN = HIDDEN_CODE_POINTS.map((point) => String.fromCodePoint(point));
    const IDEOGRAPHIC_SPACE = String.fromCodePoint(0x3000);
    const TEXT_FIELDS = {
        title: 'INVALID_TEXT',
        type: 'INVALID_TEXT',
        label: 'INVALID_TEXT',
        folder: 'INVALID_FOLDER',
    } as const;

    it('should refuse control, format, line and paragraph separator characters in text fields', () => {
        for (const [field, expected] of Object.entries(TEXT_FIELDS)) {
            for (const char of HIDDEN) {
                const label = `${field} U+${char.codePointAt(0)?.toString(16)}`;
                expect(reasonOf(field as keyof typeof TEXT_FIELDS, `a${char}b`), label).toBe(
                    expected,
                );
            }
        }
    });

    it('should refuse the same characters in the wheel key', () => {
        for (const char of HIDDEN) {
            const label = `U+${char.codePointAt(0)?.toString(16)}`;
            expect(reasonOf('wheelKey', char), label).toBe('INVALID_WHEEL_KEY');
            expect(reasonOf('wheelKey', `A${char}`), label).toBe('INVALID_WHEEL_KEY');
        }
    });

    it('should keep ordinary and ideographic spaces legal inside text', () => {
        expect(reasonOf('title', 'Apollo 18')).toBe('OK');
        expect(reasonOf('label', `新藝寶${IDEOGRAPHIC_SPACE}唱片`)).toBe('OK');
        expect(reasonOf('folder', 'Beaming 2005')).toBe('OK');
        expect(reasonOf('wheelKey', '中')).toBe('OK');
    });
});

describe('control characters other than a line feed (S-055)', () => {
    const TAB = String.fromCodePoint(0x09);
    const BELL = String.fromCodePoint(0x07);
    const CARRIAGE_RETURN = String.fromCodePoint(0x0d);

    it('should refuse tab, bell and carriage return through the API', async () => {
        for (const char of [TAB, BELL, CARRIAGE_RETURN]) {
            const response = await api('POST', '/api/albums', {
                id: 'x',
                title: `A${char}B`,
                wheelKey: `A${char}`,
            });
            const body = await json<{ error: { details: { path: string; reason: string }[] } }>(
                response,
            );
            const label = `U+${char.codePointAt(0)?.toString(16)}`;
            expect(response.status, label).toBe(400);
            expect(body.error.details.map((d) => `${d.path}:${d.reason}`).sort(), label).toEqual([
                'title:INVALID_TEXT',
                'wheelKey:INVALID_WHEEL_KEY',
            ]);
        }
    });
});
