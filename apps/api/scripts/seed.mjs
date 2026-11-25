/*
 * 初始資料（T-027）：喺本機將 seed/discography.json 嘅 21 張專輯入 D1，再生成一次 catalog.json。
 * 用法（apps/api）：先 `npm run migrate:local`，再 `npm run seed`。重跑冇害：已有嘅專輯唔郁。
 * 做法：wrangler 喺本機開 src/seed/worker.ts（唔係 production 嘅 main，唔會部署），叫一次，印出報告；
 * D1 / R2 係 `wrangler dev` 用緊嗰份本機資料（.wrangler/state），唔會連 Cloudflare。
 * 只做本機（review W-034）：冇 --remote，亦唔收任何參數（收到就停，唔會靜靜雞照入本機）。
 * Production 用 `npm run seed:sql` 生成嘅 seed/albums.sql，由人用 `wrangler d1 execute … --remote --file` 行
 */
const USAGE = [
    '用法：npm run seed -w apps/api（先執行 npm run migrate:local -w apps/api）',
    '只會寫入本機資料庫（.wrangler/state），不接受任何參數，亦不會連接 Cloudflare。',
    'Production 資料庫請使用 seed/albums.sql（npm run seed:sql -w apps/api 生成），做法見該檔開頭的說明。',
].join('\n');
const HELP_FLAGS = ['--help', '-h'];

const args = process.argv.slice(2);
if (args.length > 0) {
    const asksHelp = args.every((arg) => HELP_FLAGS.includes(arg));
    (asksHelp ? console.log : console.error)(USAGE);
    process.exit(asksHelp ? 0 : 1);
}

// 唔向 Cloudflare 攞 Request.cf、唔送用量統計：成個過程只用本機資料（要喺載入 wrangler 之前設）
process.env.CLOUDFLARE_CF_FETCH_ENABLED = 'false';
process.env.WRANGLER_SEND_METRICS = 'false';
const { unstable_dev } = await import('wrangler');

const here = (path) => new URL(path, import.meta.url).pathname;

const printReport = (report) => {
    console.log(
        `新增 ${report.inserted.length} 張專輯；已有 ${report.existing.length} 張（不變）。`,
    );
    for (const { id, category, categoryNo, takenBy } of report.ordinalTaken)
        console.log(`已略過 ${id}：${category} 序號 ${categoryNo} 已由 ${takenBy} 使用。`);
    const { catalog } = report;
    if (catalog.ok)
        console.log(
            `catalog.json 已生成：${catalog.albumCount} 張專輯、${catalog.trackCount} 首歌。`,
        );
    else console.error(`catalog.json 未能生成：${catalog.error}`);
    return catalog.ok;
};

const worker = await unstable_dev(here('../src/seed/worker.ts'), {
    config: here('../wrangler.toml'),
    local: true,
    logLevel: 'warn',
    experimental: { disableExperimentalWarning: true },
});
try {
    const response = await worker.fetch('/', { method: 'POST' });
    if (!response.ok) throw new Error(`seed worker answered ${response.status}`);
    process.exitCode = printReport(await response.json()) ? 0 : 1;
} finally {
    await worker.stop();
}
