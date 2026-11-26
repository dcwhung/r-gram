/*
 * T-116：部署設定。管理端 SPA 由 Worker 嘅 static assets 出（Technical Spec「部署架構 → Worker」）；
 * ADMIN_EMAILS 係 secret（repo 係公開嘅）：唔可以喺 wrangler.toml，冇設或者係空就一律唔畀登入（fail closed）
 */
import { env } from 'cloudflare:test';
import { afterEach, vi } from 'vitest';
import devVarsExample from '../.dev.vars.example?raw';
import wranglerToml from '../wrangler.toml?raw';
import { invalidEnvNames } from '../src/lib/validateEnv';
import { call, loginCookie } from './helpers';

afterEach(() => vi.restoreAllMocks());

/** `[section]` 到下一個 section 之間嘅行（`[[x]]` 都算 section） */
const sectionOf = (name: string): string => {
    const start = wranglerToml.indexOf(`\n${name}\n`);
    if (start < 0) return '';
    const rest = wranglerToml.slice(start + name.length + 2);
    const next = rest.search(/^\[/m);
    return next < 0 ? rest : rest.slice(0, next);
};

describe('wrangler.toml', () => {
    it('should serve the admin build as static assets, the Worker first for its own routes', () => {
        const assets = sectionOf('[assets]');
        expect(assets).toMatch(/^directory = "\.\.\/admin\/dist"$/m);
        expect(assets).toMatch(/^not_found_handling = "single-page-application"$/m);
        expect(assets).toMatch(
            /^run_worker_first = \["\/api\/\*", "\/auth\/\*", "\/catalog\/\*"\]$/m,
        );
    });

    it('should not carry ADMIN_EMAILS (it is a secret)', () => {
        expect(sectionOf('[vars]')).not.toBe('');
        expect(wranglerToml).not.toMatch(/^\s*ADMIN_EMAILS\s*=/m);
    });
});

describe('.dev.vars.example', () => {
    it('should give a working, obviously fake ADMIN_EMAILS for local development', () => {
        const value = /^ADMIN_EMAILS=(.*)$/m.exec(devVarsExample)?.[1] ?? '';
        expect(value).toBe('admin@example.com');
        expect(invalidEnvNames({ ...env, ADMIN_EMAILS: value })).toEqual([]);
    });
});

describe('missing ADMIN_EMAILS secret', () => {
    it.each([undefined, '', '  '])('should let nobody in when it is %j', async (value) => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const bindings = { ...env, ADMIN_EMAILS: value as string };
        const cookie = await loginCookie();
        const me = await call('/api/me', { headers: { cookie } }, bindings);
        expect(me.status).toBe(500);
        expect(await me.json()).toMatchObject({ error: { code: 'INTERNAL' } });
        expect((await call('/auth/google/start', {}, bindings)).status).toBe(500);
    });
});
