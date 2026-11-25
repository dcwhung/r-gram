// 每個 test 檔開始前將 migrations/ 套落 miniflare D1（同 production `wrangler d1 migrations apply` 一樣嘅 SQL）；
// storage 只係逐個檔隔離，所以每個 test 前再清晒 D1 table 同兩個 R2 bucket
import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeEach } from 'vitest';

/** 刪除次序跟 foreign key：先子後父 */
const TABLES = ['lyrics', 'tracks', 'albums', 'assets', 'publishes', 'sessions'];

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

const clearBucket = async (bucket: R2Bucket) => {
    const listed = await bucket.list();
    if (listed.objects.length > 0) await bucket.delete(listed.objects.map((o) => o.key));
};

beforeEach(async () => {
    // sqlite_sequence：publishes 嘅 AUTOINCREMENT 由 1 重新數
    const statements = [
        ...TABLES.map((table) => `DELETE FROM ${table}`),
        'DELETE FROM sqlite_sequence',
    ];
    await env.DB.batch(statements.map((sql) => env.DB.prepare(sql)));
    await clearBucket(env.CATALOG);
    await clearBucket(env.MEDIA);
});
