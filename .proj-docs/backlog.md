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
