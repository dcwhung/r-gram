# Backlog

Review 同 QA 留低、未有對應任務嘅項目。做完就刪走嗰行。

| # | 來源 | 項目 | 幾時做 |
| --- | --- | --- | --- |
| B-001 | Re-review T-001 / T-002（Observation） | Catalog validator 嘅 base URL 一定要 `https://`。播放端 E2E 嘅「假 catalog + 本機模擬媒體 server」唔可以用 `http://localhost`：用 Playwright 攔截 `https://` 請求，或者本機起 https | T-031、T-040 |
| B-002 | Review T-001 / T-002（Observation） | `_design_/HANDOFF.md` 同 Functional Spec（US-109 等）仲寫 `data/…` 舊路徑；實際已搬去 `apps/api/seed/`（Technical Spec 有寫） | 下次 Change Request |
| B-003 | Review T-001 / T-002（Observation） | 加 `vercel.json` 時一齊加 `.vercelignore`（`_mockups_/`、`_design_/`、`.proj-docs/`） | T-041 |
| B-004 | Re-review（Observation） | `generatedAt` 仍然收 `2026-02-30T…`（V8 `Date.parse` 寬鬆）。只係資訊欄，播放端唔靠佢做判斷 | 有需要先做 |
| B-005 | Review T-001 / T-002（Observation） | 發佈 builder 要將草稿入面嘅空字串轉做 `null`（validator 唔收空字串） | T-026 |
| B-006 | QA S1 catalog-core（Observation） | 字串長度上限未做（Technical Spec「安全設計」：`CREDIT_MAX_CHARS`、`LRC_MAX_BYTES` 等）。常數放 `packages/catalog`（管理端同 API 共用），API 入口驗 | T-023、T-080 |
| B-007 | QA S1 catalog-core（Observation） | 根設定檔（`package.json`、`tsconfig.json`、`vitest.config.ts`、`ci.yml`）而家喺 `catalog-core` 鏈，每加一個 app 都會令佢 REVERIFY。下次 QA 將佢哋分去新鏈 `repo-scaffold` | T-020 嘅 QA |
| B-008 | T-030（`npm audit`） | `vite-plugin-pwa ^2.0.0` → `workbox-build` → `glob` / `minimatch` 有 4 個 moderate 警告（GHSA-3g3m-2fjr-6pw4、GHSA-g3hv-75wg-m249）。只喺 build 時用，glob pattern 係自己寫死嘅設定，唔食外來輸入；`npm audit fix` 會降去 `vite-plugin-pwa@1.1.0`（breaking）。同 903-player 用緊嘅版本一樣。等上游出修正版再升 | 上游有修正時 |
| B-009 | T-030（設計問題，要用戶決定） | 設計稿係 9:16（1080 × 1920），但 iPhone 係約 9:19.5。舞台只用安全區入面嘅位（扣走狀態列 / 動態島同底部指示條）：iPhone 15 闊度填滿之後，可用高度比設計稿多約 166 單位（約 9%）；舞台已經計出 `--stage-extra`。預設做法：左上資訊同頂部螺絲貼頂，唱片機（碟、轉盤、唱臂、控件）成組貼底，多出嚟嘅空位喺中間。要喺真機 / 預覽睇過先定 | T-033、T-035 |
