import { env } from 'cloudflare:test';
import { afterEach, vi } from 'vitest';
import type { Env } from '../src/env';
import { invalidEnvNames } from '../src/lib/validateEnv';
import { call } from './helpers';

afterEach(() => vi.restoreAllMocks());

const withEnv = (change: Partial<Record<keyof Env, unknown>>) =>
    invalidEnvNames({ ...env, ...change } as Partial<Env>);

describe('invalidEnvNames', () => {
    it('should accept the complete test environment', () => {
        expect(invalidEnvNames(env)).toEqual([]);
    });

    it('should name every binding, var and secret that is missing', () => {
        expect(invalidEnvNames({})).toEqual([
            'DB',
            'CATALOG',
            'MEDIA',
            'GOOGLE_CLIENT_ID',
            'GOOGLE_CLIENT_SECRET',
            'SESSION_SECRET',
            'ADMIN_EMAILS',
            'PLAYER_ORIGINS',
            'WORKER_ORIGIN',
            'MEDIA_BASE',
        ]);
    });

    it.each(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] as const)(
        'should reject a blank %s',
        (name) => {
            expect(withEnv({ [name]: '  ' })).toEqual([name]);
        },
    );

    // W-008：白名單只收 ASCII 地址（比較時唔會有 Unicode 大細楷摺疊嘅問題）
    it('should reject a non-ASCII address in ADMIN_EMAILS', () => {
        const KELVIN_SIGN = String.fromCharCode(0x212a);
        expect(withEnv({ ADMIN_EMAILS: `${KELVIN_SIGN}ate@example.com` })).toEqual([
            'ADMIN_EMAILS',
        ]);
        expect(withEnv({ ADMIN_EMAILS: 'admin@example.com,ａdmin@example.com' })).toEqual([
            'ADMIN_EMAILS',
        ]);
    });

    it('should require a SESSION_SECRET of at least 32 characters', () => {
        expect(withEnv({ SESSION_SECRET: 'x'.repeat(31) })).toEqual(['SESSION_SECRET']);
        expect(withEnv({ SESSION_SECRET: 'x'.repeat(32) })).toEqual([]);
    });

    it('should require at least one well-formed address in ADMIN_EMAILS', () => {
        for (const value of [
            '',
            ' , ',
            'not-an-email',
            'a@example.com, broken@',
            'a b@example.com',
        ]) {
            expect(withEnv({ ADMIN_EMAILS: value }), value).toEqual(['ADMIN_EMAILS']);
        }
        expect(withEnv({ ADMIN_EMAILS: ' A@Example.com ,b@example.com' })).toEqual([]);
    });

    it('should require WORKER_ORIGIN to be a bare https origin', () => {
        const bad = [
            'https://api.example.com/',
            'https://api.example.com/x',
            'http://api.example.com',
            'http://localhost:8787',
            'api.example.com',
        ];
        for (const value of bad)
            expect(withEnv({ WORKER_ORIGIN: value }), value).toEqual(['WORKER_ORIGIN']);
        expect(withEnv({ WORKER_ORIGIN: 'https://localhost:8787' })).toEqual([]);
    });

    it('should require PLAYER_ORIGINS entries to be origins (http only for localhost)', () => {
        for (const value of ['https://player.example.com/', 'http://player.example.com', '*']) {
            expect(withEnv({ PLAYER_ORIGINS: value }), value).toEqual(['PLAYER_ORIGINS']);
        }
        const fine = [
            '',
            'http://localhost:5173,https://player.example.com',
            'http://127.0.0.1:5173',
        ];
        for (const value of fine) expect(withEnv({ PLAYER_ORIGINS: value }), value).toEqual([]);
    });

    it('should require MEDIA_BASE to be an https URL ending with a slash', () => {
        const bad = [
            'https://media.example.com',
            'http://media.example.com/',
            'https://media.example.com/?x=1',
            'https://media.example.com/#x',
            'media/',
        ];
        for (const value of bad)
            expect(withEnv({ MEDIA_BASE: value }), value).toEqual(['MEDIA_BASE']);
        expect(withEnv({ MEDIA_BASE: 'https://pub-123.r2.dev/media/' })).toEqual([]);
    });
});

describe('misconfigured Worker', () => {
    it('should answer 500 INTERNAL and log only the names of the broken settings', async () => {
        const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
        const broken = { ...env, SESSION_SECRET: 'too-short-secret', WORKER_ORIGIN: 'nope' };
        for (const path of ['/api/health', '/auth/google/start']) {
            const response = await call(path, {}, broken);
            expect(response.status, path).toBe(500);
            expect(await response.json(), path).toEqual({
                error: { code: 'INTERNAL', message: 'server misconfigured' },
            });
        }
        const logged = JSON.stringify(errorLog.mock.calls);
        expect(logged).toContain('SESSION_SECRET');
        expect(logged).toContain('WORKER_ORIGIN');
        expect(logged).not.toContain('too-short-secret');
    });
});
