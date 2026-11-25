/* session store（D1 sessions）同 crypto 小工具 */
import { env } from 'cloudflare:test';
import { createSession, deleteSession, findSession } from '../src/auth/session';
import { SESSION_TTL_MS } from '../src/config';
import {
    constantTimeEqual,
    hmacSign,
    hmacVerify,
    randomBase64Url,
    sha256Hex,
} from '../src/lib/crypto';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 25);
const ADMIN = 'admin@example.com';

const rows = async () =>
    (
        await env.DB.prepare('SELECT token_hash, email, expires_at FROM sessions').all<{
            token_hash: string;
            email: string;
            expires_at: number;
        }>()
    ).results;

describe('crypto helpers', () => {
    it('should make unpredictable base64url tokens of the requested size', () => {
        const tokens = new Set(Array.from({ length: 50 }, () => randomBase64Url(32)));
        expect(tokens.size).toBe(50);
        for (const token of tokens) expect(token).toMatch(/^[\w-]{43}$/);
    });

    it('should verify only the signature made with the same secret and payload', async () => {
        const signature = await hmacSign('secret-a', 'payload');
        expect(await hmacVerify('secret-a', 'payload', signature)).toBe(true);
        expect(await hmacVerify('secret-b', 'payload', signature)).toBe(false);
        expect(await hmacVerify('secret-a', 'payload2', signature)).toBe(false);
        expect(await hmacVerify('secret-a', 'payload', `${signature}x`)).toBe(false);
        expect(await hmacVerify('secret-a', 'payload', '***not base64***')).toBe(false);
    });

    it('should compare strings of any length without throwing', async () => {
        expect(await constantTimeEqual('same-state', 'same-state')).toBe(true);
        expect(await constantTimeEqual('same-state', 'same-statf')).toBe(false);
        expect(await constantTimeEqual('short', 'a-much-longer-value')).toBe(false);
        expect(await constantTimeEqual('', '')).toBe(true);
    });
});

describe('createSession', () => {
    it('should issue a 32-byte random token and store only its SHA-256', async () => {
        const first = await createSession(env.DB, ADMIN, NOW);
        const second = await createSession(env.DB, ADMIN, NOW);
        expect(first).toMatch(/^[\w-]{43}$/);
        expect(second).not.toBe(first);
        const stored = (await rows()).map((row) => row.token_hash).sort();
        expect(stored).toEqual([await sha256Hex(first), await sha256Hex(second)].sort());
        expect(JSON.stringify(await rows())).not.toContain(first);
    });

    it('should last 30 days and keep the email in normalised form', async () => {
        await createSession(env.DB, '  Admin@Example.com ', NOW);
        expect(SESSION_TTL_MS).toBe(30 * DAY_MS);
        expect(await rows()).toMatchObject([{ email: ADMIN, expires_at: NOW + 30 * DAY_MS }]);
    });

    it('should clean up expired sessions and keep the live ones', async () => {
        const expired = await createSession(env.DB, ADMIN, NOW - SESSION_TTL_MS);
        const live = await createSession(env.DB, ADMIN, NOW - DAY_MS);
        const fresh = await createSession(env.DB, ADMIN, NOW);
        const stored = (await rows()).map((row) => row.token_hash).sort();
        expect(stored).toEqual([await sha256Hex(live), await sha256Hex(fresh)].sort());
        expect(stored).not.toContain(await sha256Hex(expired));
    });
});

describe('findSession', () => {
    it('should return the email until the session expires, and nothing from then on', async () => {
        const token = await createSession(env.DB, ADMIN, NOW);
        expect(await findSession(env.DB, token, NOW)).toBe(ADMIN);
        expect(await findSession(env.DB, token, NOW + SESSION_TTL_MS - 1)).toBe(ADMIN);
        expect(await findSession(env.DB, token, NOW + SESSION_TTL_MS)).toBeUndefined();
        expect(await findSession(env.DB, token, NOW + SESSION_TTL_MS + DAY_MS)).toBeUndefined();
    });

    it('should not accept an unknown token, nor the stored hash itself', async () => {
        const token = await createSession(env.DB, ADMIN, NOW);
        expect(await findSession(env.DB, 'never-issued', NOW)).toBeUndefined();
        expect(await findSession(env.DB, await sha256Hex(token), NOW)).toBeUndefined();
    });
});

describe('deleteSession', () => {
    it('should end that session only', async () => {
        const first = await createSession(env.DB, ADMIN, NOW);
        const second = await createSession(env.DB, ADMIN, NOW);
        await deleteSession(env.DB, first);
        expect(await findSession(env.DB, first, NOW)).toBeUndefined();
        expect(await findSession(env.DB, second, NOW)).toBe(ADMIN);
    });
});
