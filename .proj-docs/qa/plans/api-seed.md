# Test Plan — api-seed

> ⛔ **已作廢（2026-11-26，CR-007 D79）**：初始資料 seed 取消（T-104 刪走 `src/seed/*`、`scripts/seed*.mjs`、`seed/albums.sql`），ledger 行已刪。下面係歷史記錄。

- Chain: 初始資料只入專輯（`apps/api/src/seed`、`apps/api/scripts/{seed,seed-sql}.mjs`、`apps/api/seed/albums.sql`）：本機 seed CLI + production 用嘅 SQL 檔。任務 T-027（review 修正 W-034）
- AC（L1 來源：FS = Functional Spec v1.8 US-109「CR-006 驗收標準」、D59、D63、D64；TS = Technical Spec v1.6「初始資料只入專輯（T-027）」；review W-034 定案）:
    - AC-1 本機匯入（FS US-109；TS 「寫入」）：21 張專輯（id、碟名、字母、類別、序號、年份、唱片公司、次序）、專輯色中性灰、`folder` 同封面欄 NULL；0 首歌、0 行歌詞
    - AC-2 重跑（FS US-109「重複執行」）：第二次新增 0 張、資料不變；人手改過嘅專輯唔會被蓋走
    - AC-3 序號撞咗（TS「寫入」）：同類別序號有其他專輯用 → 跳過嗰張並報告
    - AC-4 Catalog（FS US-109「匯入完生成一次內容檔」）：生成一次，`updated_by = 'seed'`，21 張、0 首歌
    - AC-5 只做本機（review W-034）：`npm run seed` 收到任何參數（`--remote`、`--local`）就停（exit 1），唔寫嘢；`src/seed/worker.ts` 唔入 production bundle
    - AC-6 Production SQL（review W-034；TS「寫法」）：`seed/albums.sql` = 重新 `npm run seed:sql -w apps/api` 嘅結果（逐字）；喺空嘅本機 D1 行（只限 `--local --persist-to`）得出同本機匯入一樣嘅 21 行；行兩次冇害
    - AC-7 唔連外（TS「部署架構」；CLAUDE.md 規則）：兩個 script 喺冇網絡嘅 namespace（`unshare -rn`，淨 loopback）跑得到
- Scope files:
    - `apps/api/src/seed/**`、`apps/api/scripts/seed.mjs`、`apps/api/scripts/seed-sql.mjs`、`apps/api/seed/albums.sql`
    - `apps/api/test/seedAlbums.test.ts`、`apps/api/test/albumsSql.test.ts`
    - 1-hop（唔喺呢條鏈 freeze）：`packages/catalog/src/seed/planAlbumSeed.ts`、`apps/api/seed/discography.json`（`catalog-core`）；`src/catalog/rebuild.ts`（`api-catalog`）；`apps/api/package.json`、`wrangler.toml`、`migrations/0001_init.sql`（`api-auth`）
- Commands:
    - `npm run lint`、`npm run typecheck`
    - `npm run coverage`（全部 workspace 一次；門檻 80%）
- Probe（repo 外 clone；冇網絡 namespace，淨 loopback）：`npm run seed -- --remote`、`-- --local`；`npm run migrate:local`；`npm run seed` × 2；改碟名、刪一張再撞序號，再 seed；`wrangler d1 execute r-gram --local …` 讀行；`npm run seed:sql` + `git diff --exit-code seed/albums.sql`；另一個 `--persist-to` 空 D1：`d1 migrations apply --local` + `d1 execute --local --file seed/albums.sql` × 2，比行
- 永遠唔做：`--remote`、`wrangler deploy`、連真 D1
- PWA gate: no。Performance gate: no。Security / Data gate: yes（AC-2、AC-5、AC-6、AC-7）
- Out of scope: production 行 `albums.sql`（T-028 runbook，由人做）；Technical Spec 第 735 行 `--remote` 字眼（spec 回寫）；`discography.json` 生成（`seed-tools`）
