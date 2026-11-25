# QA — repo-scaffold + catalog-core（分鏈同重驗）— 2026-11-25 — S1

- Tier: T1（`catalog-core`：只加 2 個 test；`repo-scaffold`：設定檔加 workspace 同 CI build 一步）| Commit: `b9af7ff` | Verdict: ✅ pass
- Ledger（`impact --since bf22b27`，成個 run）: SKIP 0 / REVERIFY 1 (`catalog-core`) / UNCOVERED 84（全部屬 `apps/player`、`apps/api`，見另外兩份報告）
- Plans: [`plans/repo-scaffold.md`](plans/repo-scaffold.md)（新）、[`plans/catalog-core.md`](plans/catalog-core.md)（scope 縮細，AC-1 同 AC-9 搬走；所以要重新 freeze）
- Hard Gates: all pass

## 做咗乜（backlog B-007）

- 根設定檔同 CI 由 `catalog-core` 分去新鏈 `repo-scaffold`：`package.json`、`package-lock.json`、`tsconfig.json`、`vitest.config.ts`、`eslint.config.js`、`.prettierrc.json`、`.prettierignore`、`.gitignore`、`.github/workflows/ci.yml`、`scripts/ci/*`。之後加 app 只會令 `repo-scaffold` 重驗（三條指令，幾秒）。
- `catalog-core` 淨返 `packages/catalog/**` 同 `apps/api/seed/*.json`。

## Runs

| Command | Result | Time |
| --- | --- | --- |
| `npm run lint`、`npm run typecheck`（成個 repo，今次 run 只跑一次） | 冇錯 | 2 s + 1 s |
| `npx vitest run --project @r-gram/catalog --coverage --coverage.include='src/**/*.ts'` | 8 個檔、157 / 157（上次 155 + `2e04e3b` 加嘅 2 個）；statements 99.72% / branches 94.28% / functions 100% / lines 100% | 3 s |
| `npx vitest run --project @r-gram/repo-scripts` | 21 / 21 | 2 s |
| CI（引用）：run 45538369844 @ `b9af7ff` | success：改動偵測、lint、typecheck、coverage、`npm run build -w apps/player` 全部有跑 | — |

## 驗收標準

| 鏈 | AC | 結果 | 證據 |
| --- | --- | --- | --- |
| `catalog-core` | AC-2 – AC-8 | ✅ | 上次凍結之後 `packages/catalog` 只改咗兩個 test 檔（`git diff bf22b27..b9af7ff --stat`：`parseLrc.test.ts` +7、`seed.node.test.ts` +13，即係上次建議嘅 BOM 同 39 首配樂）；實作檔 hash 冇變，157 個 test 全綠。冇重做上次嘅 probe |
| `repo-scaffold` | AC-1 Scaffold | ✅ | workspaces `apps/*`、`packages/*`；根 `tsconfig.json` references 同根 `vitest.config.ts` projects 都有 `apps/player`、`apps/api`、`packages/catalog`；lint、typecheck 全綠；四個 project 加埋 409 個 test（91 + 140 + 157 + 21） |
| `repo-scaffold` | AC-2 CI | ✅ | `detect-code-changes.test.mjs` 21 / 21；HEAD 嘅 CI run 綠，新加嘅 build 一步有跑 |

## Findings

冇 🔴 / 🟡，冇 Observation。

## 建議補測

- none

## Ledger 備註

- 淨揀一個 project 跑 coverage 時，`--coverage.include` 係相對嗰個 project 嘅資料夾（`src/**`），唔係 repo 根；上次 `catalog-core` plan 嘅寫法（兩個 project 一齊跑）係相對 repo 根。四份 plan 已經統一用單一 project 嘅寫法。
- `.gitignore` 屬 ledger 預設 ignore 嘅類型，但已經列入 `repo-scaffold`，所以改咗會令呢條鏈重驗。

```handoff-receipt
protocol: 2
status: pass
score: n/a
stage: S1
ledger: "SKIP 0 / REVERIFY 1 / UNCOVERED 84"
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "99.72%"
next_action: end
next_agent: null
branch: "claude/charming-cannon-8yulp0"
context: "B-007 完成：根設定同 CI 分去新鏈 repo-scaffold（S1 freeze）；catalog-core 重驗（157/157，只加咗 2 個 test）並按縮細咗嘅 scope 重新 freeze。冇 finding"
```
