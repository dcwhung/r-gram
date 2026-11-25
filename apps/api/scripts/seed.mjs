/*
 * 初始資料（T-027）：喺本機將 seed/discography.json 嘅 21 張專輯入 D1，再生成一次 catalog.json。
 * 用法（apps/api）：先 `npm run migrate:local`，再 `npm run seed`。重跑冇害：已有嘅專輯唔郁。
 * 做法：wrangler 喺本機開 src/seed/worker.ts（唔係 production 嘅 main，唔會部署），叫一次，印出報告；
 * D1 / R2 係 `wrangler dev` 用緊嗰份本機資料（.wrangler/state），唔會連 Cloudflare
 */
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
