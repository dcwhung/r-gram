import { t } from './t';

describe('t', () => {
    it('should return the message for a key', () => {
        expect(t('session.signOut')).toBe('登出');
    });

    it('should fill in parameters', () => {
        expect(t('session.signedInAs', { email: 'admin@example.com' })).toBe(
            '已登入：admin@example.com',
        );
    });

    it('should leave the placeholder when a parameter is missing at run time', () => {
        const untyped = t as (key: string, params?: Record<string, unknown>) => string;
        expect(untyped('session.signedInAs')).toBe('已登入：{email}');
    });

    it('should reject wrong keys and parameters at compile time', () => {
        // @ts-expect-error 冇呢個 key
        expect(() => t('session.signOot')).toThrow(TypeError);
        // @ts-expect-error 呢句要 email
        t('session.signedInAs');
    });
});
