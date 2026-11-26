/*
 * 部署前檢查（T-116）：`npm run deploy`、`npm run migrate:remote`（apps/api）之前自動行（npm 嘅 pre 腳本）。
 * wrangler.toml 仲係 placeholder（全 0 嘅 database_id、REPLACE 嘅 client id、example 網域、localhost）
 * 或者有 ADMIN_EMAILS（secret，repo 係公開嘅）就停，唔會部署。只讀本機檔案，唔上網、唔叫 Cloudflare
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tomlKeyNames } from './toml-keys.mjs';

/** secret：唔可以喺 wrangler.toml 出現做 key */
const SECRET_KEY = 'ADMIN_EMAILS';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALL_ZERO_UUID = /^[0-]+$/;
const CLIENT_ID = /^[0-9]+-[0-9a-z]+\.apps\.googleusercontent\.com$/;
/** 保留 / 示範網域同本機：部署出去一定唔啱 */
const PLACEHOLDER_HOST = /(^|\.)(example(\.[a-z]+)?|localhost|127\.0\.0\.1)$|(^|\.)example\./i;

/** `NAME = "value"` 嘅值（只睇字串值；冇 = undefined） */
const valueOf = (toml, name) =>
    new RegExp(`^\\s*${name}\\s*=\\s*"([^"]*)"\\s*$`, 'm').exec(toml)?.[1];

const parseUrl = (value) => {
    try {
        return new URL(value);
    } catch {
        return undefined;
    }
};

/** https、唔係 placeholder 網域、同瀏覽器 Origin header 一樣嘅寫法（冇 path、冇 / 結尾） */
const isRealOrigin = (value) => {
    const url = parseUrl(value);
    if (!url || url.protocol !== 'https:' || url.origin !== value) return false;
    return !PLACEHOLDER_HOST.test(url.hostname);
};

const isRealBase = (value) => {
    const url = parseUrl(value);
    if (!url || url.protocol !== 'https:' || url.href !== value || !value.endsWith('/'))
        return false;
    return !PLACEHOLDER_HOST.test(url.hostname);
};

const isOriginList = (value) => {
    const origins = (value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    return origins.length > 0 && origins.every(isRealOrigin);
};

const RULES = [
    [
        'database_id',
        (id) => UUID.test(id ?? '') && !ALL_ZERO_UUID.test(id),
        '`wrangler d1 create r-gram` 印出嚟嘅 id',
    ],
    ['GOOGLE_CLIENT_ID', (id) => CLIENT_ID.test(id ?? ''), 'Google Cloud OAuth client id'],
    ['WORKER_ORIGIN', isRealOrigin, 'Worker 嘅 https origin（冇 / 結尾）'],
    ['PLAYER_ORIGINS', isOriginList, '播放端 https origin，逗號分隔'],
    ['MEDIA_BASE', isRealBase, '媒體 bucket 公開網址（/ 結尾）'],
];

/** 有問題嘅設定（全部啱 = 空 array）；每項一句，講明係邊個設定 */
export const deployConfigProblems = (toml) => {
    const problems = RULES.filter(([name, isValid]) => !isValid(valueOf(toml, name))).map(
        ([name, , expected]) => `${name}: 仲係 placeholder 或者格式唔啱（要：${expected}）`,
    );
    // 任何寫法嘅 key（quoted、dotted、表頭、inline table）都算（S-234）
    if (tomlKeyNames(toml).has(SECRET_KEY))
        problems.push(
            'ADMIN_EMAILS: 係 secret，唔可以寫喺 wrangler.toml；用 wrangler secret put ADMIN_EMAILS',
        );
    return problems;
};

const main = () => {
    const toml = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
    const problems = deployConfigProblems(toml);
    if (problems.length === 0) {
        console.log('apps/api/wrangler.toml: deploy settings OK');
        return;
    }
    console.error('apps/api/wrangler.toml 未可以部署：');
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exitCode = 1;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
