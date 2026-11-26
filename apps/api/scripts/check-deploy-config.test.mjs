/*
 * 部署前檢查（T-116）：`npm run deploy` / `npm run migrate:remote`（apps/api）之前，wrangler.toml 唔可以仲係 placeholder，
 * 亦唔可以有 ADMIN_EMAILS（secret）。只讀本機檔案，唔上網
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { deployConfigProblems } from './check-deploy-config.mjs';

const SCRIPT = fileURLToPath(new URL('./check-deploy-config.mjs', import.meta.url));
const WRANGLER = new URL('../wrangler.toml', import.meta.url);
const committed = readFileSync(WRANGLER, 'utf8');

const GOOD = `
name = "r-gram-api"

[[d1_databases]]
binding = "DB"
database_id = "ddbda0d8-d643-4e9a-bb59-ce712dceea8b"

[vars]
GOOGLE_CLIENT_ID = "123-abc.apps.googleusercontent.com"
PLAYER_ORIGINS = "https://rgram.vercel.app"
WORKER_ORIGIN = "https://r-gram-api.someone.workers.dev"
MEDIA_BASE = "https://pub-123.r2.dev/"
`;

const swap = (from, to) => GOOD.replace(from, to);

describe('deployConfigProblems', () => {
    it('should accept a filled-in configuration', () => {
        expect(deployConfigProblems(GOOD)).toEqual([]);
    });

    it('should accept the committed wrangler.toml', () => {
        expect(deployConfigProblems(committed)).toEqual([]);
    });

    it.each([
        [
            'the all-zero database id',
            'ddbda0d8-d643-4e9a-bb59-ce712dceea8b',
            '00000000-0000-0000-0000-000000000000',
            'database_id',
        ],
        [
            'a missing database id',
            'database_id = "ddbda0d8-d643-4e9a-bb59-ce712dceea8b"',
            '',
            'database_id',
        ],
        [
            'a placeholder client id',
            '123-abc.apps',
            'REPLACE-WITH-GOOGLE-CLIENT-ID.apps',
            'GOOGLE_CLIENT_ID',
        ],
        ['an example worker origin', 'someone.workers.dev', 'example.workers.dev', 'WORKER_ORIGIN'],
        ['a worker origin with a path', 'workers.dev"', 'workers.dev/"', 'WORKER_ORIGIN'],
        ['an http worker origin', 'https://r-gram-api', 'http://r-gram-api', 'WORKER_ORIGIN'],
        [
            'an example player origin',
            'rgram.vercel.app',
            'r-gram-player.example.com',
            'PLAYER_ORIGINS',
        ],
        [
            'a localhost player origin',
            'https://rgram.vercel.app',
            'http://localhost:5173',
            'PLAYER_ORIGINS',
        ],
        ['an empty player list', '"https://rgram.vercel.app"', '""', 'PLAYER_ORIGINS'],
        ['a media base without a slash', 'r2.dev/"', 'r2.dev"', 'MEDIA_BASE'],
    ])('should refuse %s', (_name, from, to, setting) => {
        const problems = deployConfigProblems(swap(from, to));
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain(setting);
    });

    it('should refuse ADMIN_EMAILS in the committed vars (it is a secret)', () => {
        const problems = deployConfigProblems(`${GOOD}ADMIN_EMAILS = "a@example.com"\n`);
        expect(problems).toEqual([expect.stringContaining('wrangler secret put ADMIN_EMAILS')]);
    });

    // S-234：TOML 嘅其他寫法一樣係 ADMIN_EMAILS 呢個 key
    it.each([
        ['a double-quoted key', `${GOOD}"ADMIN_EMAILS" = "a@example.com"\n`],
        ['a single-quoted key', `${GOOD}'ADMIN_EMAILS' = "a@example.com"\n`],
        ['an escaped quoted key', `${GOOD}"ADMIN\\u005FEMAILS" = "a@example.com"\n`],
        ['a dotted key', `vars.ADMIN_EMAILS = "a@example.com"\n${GOOD}`],
        ['a quoted dotted key', `"vars"."ADMIN_EMAILS" = "a@example.com"\n${GOOD}`],
        [
            'an environment vars table',
            `${GOOD}\n[env.production.vars]\nADMIN_EMAILS = "a@example.com"\n`,
        ],
        ['a vars sub-table', `${GOOD}\n[vars."ADMIN_EMAILS"]\nlist = "a@example.com"\n`],
        [
            'an inline table',
            `${GOOD}\n[env.production]\nvars = { X = "1", "ADMIN_EMAILS" = "a@example.com" }\n`,
        ],
    ])('should refuse ADMIN_EMAILS written as %s', (_name, toml) => {
        expect(deployConfigProblems(toml)).toEqual([
            expect.stringContaining('wrangler secret put ADMIN_EMAILS'),
        ]);
    });

    it('should not mistake a comment or a string value for the ADMIN_EMAILS key', () => {
        const toml = `${GOOD}# ADMIN_EMAILS = "set it with wrangler secret put"\nNOTE = "ADMIN_EMAILS = x"\n`;
        expect(deployConfigProblems(toml)).toEqual([]);
    });
});

describe('check-deploy-config.mjs', () => {
    it('should pass on the committed wrangler.toml', () => {
        expect(execFileSync('node', [SCRIPT], { encoding: 'utf8' })).toContain('OK');
    });
});
