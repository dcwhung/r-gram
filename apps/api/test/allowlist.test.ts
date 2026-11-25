import { isAdminEmail, normaliseEmail } from '../src/lib/env';

describe('normaliseEmail', () => {
    it('should trim and lowercase', () => {
        expect(normaliseEmail('  Admin@Example.COM \n')).toBe('admin@example.com');
    });
});

describe('isAdminEmail', () => {
    const LIST = ' Admin@Example.com ,second@example.com,, ';

    it('should match regardless of case and surrounding whitespace on either side', () => {
        for (const email of ['admin@example.com', 'ADMIN@EXAMPLE.COM', '  admin@example.com\t']) {
            expect(isAdminEmail(LIST, email), email).toBe(true);
        }
        expect(isAdminEmail(LIST, 'Second@example.com')).toBe(true);
    });

    it('should only match whole addresses', () => {
        const outsiders = [
            'admin@example.co',
            'admin@example.com.evil.test',
            'xadmin@example.com',
            'admin@example.com,second@example.com',
            'admin',
            '@example.com',
        ];
        for (const email of outsiders) expect(isAdminEmail(LIST, email), email).toBe(false);
    });

    it('should never match an empty address or an empty list', () => {
        expect(isAdminEmail(LIST, '')).toBe(false);
        expect(isAdminEmail(LIST, '   ')).toBe(false);
        expect(isAdminEmail('', 'admin@example.com')).toBe(false);
        expect(isAdminEmail(' , ', '')).toBe(false);
    });
});
