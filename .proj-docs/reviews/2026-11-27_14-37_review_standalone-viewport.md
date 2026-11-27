# Review — 主畫面 app 舞台高度穩定（iOS viewport 跳動）

- **日期**：2026-11-27 14:37（UTC）　**審閱者**：Code Reviewer（獨立）　**Tier**：T1（單一模組，`apps/player/src/stage`）
- **目標**：branch `fix/standalone-viewport`（worktree `.claude/worktrees/agent-a83e33f1699543c9b`），由 `33a4108` 開：`d23a7ed` test → `f35de08` fix；12 檔 +363／−14
- **總評**：**pass（100 / 100）**。standalone 先用 `max(innerHeight, 100lvh probe)`，分頁路徑一字不改；`viewportKey` 喺 793↔852 跳動時不變，所以 `useStageFit` 唔再 re-render。冇 🔴／🟡；兩個 🟢
- **範圍**：冇改 source、冇 commit、冇 push、冇對外 host。mutant 喺 scratch clone `/tmp/claude-0/-home-user-r-gram/acff8cc1-40eb-514e-8a3f-b8e552922449/scratchpad/review-t117/repo`（checkout `f35de08`）；只跑 `@r-gram/player`

## Hard Gates

| Gate | 結果 | 證據（真 exit code） |
| --- | --- | --- |
| Lint | pass | `npm run lint` → 0（eslint 0、prettier 過） |
| Type check | pass | `npm run typecheck`（worktree）→ 0。scratch clone 嘅 2 個 `apps/api` error 係我 symlink 去主 tree 嘅 `@r-gram/catalog` 造成，同呢個 diff 無關 |
| Tests | pass | `npx vitest related --run --project @r-gram/player <diff 入面嘅 .ts>` → 0，15 檔 110 / 110 |
| Coverage | pass | 冇跑 full suite（Hard Rule #7）；引用 developer `npm run coverage` exit 0（3294 tests）；新檔每個分支都有測試（分頁、standalone、lvh／vh、冇 `matchMedia`、`navigator.standalone`） |
| Build | pass | `npm run build -w apps/player` → 0 |
| No Critical／Security | pass／n/a | 冇新依賴 |

TDD：`d23a7ed` 4 個 test fail（5 檔），`f35de08` 冇改測試檔。

## 評分結果

| 維度 | 得分 | 滿分 | 備注 |
| --- | --- | --- | --- |
| 正確性 | 25 | 25 | 分頁路徑不變；standalone 嘅 key 穩定 |
| 安全性 | 20 | 20 | |
| 可維護性 | 20 | 20 | `viewportKey` 搬去一處，diag 同 `useStageFit` 共用同一個函數 |
| 測試覆蓋 | 15 | 15 | S-291 係細缺口 |
| 性能 | 10 | 10 | 跳動時 key 唔變 → 冇 re-render；每次 `resize` 多一次 `getBoundingClientRect`（只限 standalone） |
| 代碼風格 | 10 | 10 | |
| **總分** | **100** | **100** | |

**結果：✅ pass**

## 🔴 Critical／🟡 Warnings

冇。

## 🟢 Suggestions（唔阻，入 backlog）

- **S-291** probe 嘅 CSS 冇測試：`viewportHeight.css` 拎走 `height: 100lvh`（mutant V7）或者 `position: fixed` 改 `absolute`（V8）都走甩。加一個 node 測試（同 `standaloneHeight.node.test.ts` 一樣讀 CSS）鎖住 `position: fixed; height: 100vh; height: 100lvh`
- **S-292** JS 同 CSS 判斷 standalone 嘅條件唔一樣：`isStandalone()` 用 `display-mode: standalone` **或** `navigator.standalone`，但 `global.css` 只用 `@media (display-mode: standalone)`。如果有部機 `navigator.standalone` 係 true 但 media query 唔 match，舞台會用 852，但頁面仍然係 `100dvh`（可能 793），外框底會被剪走。真機 diag 兩樣都係 standalone，所以而家冇事。建議統一條件：JS 喺 `<html>` 設 `data-standalone`，CSS 跟呢個 attribute；或者 JS 唔再睇 `navigator.standalone`
- Observation（Android standalone／桌面安裝 PWA）：冇會變動嘅工具列，`100lvh` 應該等於 `innerHeight`，`max()` 唔會改到結果。縮放時 `getBoundingClientRect` 會有小數（例如 799.5 vs 800），會揀較高嗰個，最多差 1 px；Android 留畀 U-24 ⑦ 真機睇
- Observation（iPhone 真機）：而家假設 852 先係真正睇得到嘅高度（vh／lvh = screen）。如果第一次開 app 時 iOS 真係只顯示 793，舞台底 59 px 會喺畫面外面。要用 diag 面板確認：第一次開就係全螢幕、底部冇閃

## ✅ 做得好嘅地方

- 分頁路徑完全保留：唔整 probe、key 格式一樣（`闊 高 頂 底`）；有測試鎖住分頁唔用 `100lvh`、唔加 probe
- `useStageFit.test.ts` 直接證明 iOS 跳動嘅時候 render 次數唔變，`fit` 等於 `fitStage(393, 852, 59／34)`
- diag 量度用返同一個 `viewportKey`，冇複製邏輯

## Mutants

| ID | 變異 | 結果 |
| --- | --- | --- |
| V1 | `>=` 改 `>`（一樣高時改用 innerHeight） | 死 |
| V2 | 分頁都用 lvh | 死 |
| V3 | 唔認 `navigator.standalone` | 死 |
| V4 | 分頁都整 probe | 死 |
| V5 | `global.css` standalone 改 `100dvh` | 死 |
| V6 | `viewportKey` 用返 `innerHeight` | 死 |
| V7 | probe CSS 拎走 `100lvh` | **走甩**（S-291） |
| V8 | probe `position: absolute` | **走甩**（S-291） |

## 其他核對

- **Design Source**：冇改任何版面表、幾何、`fitStage`；只改輸入嘅高度，`layouts/phone.ts` 唔受影響
- **分頁 regression**：`readStageHeight()` 喺非 standalone 直接回 `innerHeight`；`global.css` 只加 standalone 嘅 `@media`；Safari 分頁 393 × 735 嘅 fit 同之前一樣（`useStageFit.test.ts` 分頁 case）
- **轉向**：`resize`／`orientationchange` 照舊觸發；probe 每次重新量，所以轉向之後跟住變
- **QA 鏈**：`qa-ledger.sh impact --since 33a4108` → REVERIFY `player-foundation`；UNCOVERED `stage/viewportHeight.{ts,css,test.ts}`、`stage/useStageFit.test.ts`、`stage/standaloneHeight.node.test.ts`（建議歸 `player-foundation`）；`src/diag/**` 係臨時工具，冇入任何鏈（建議唔開鏈，拆走時一齊刪）

```
HANDOFF_RECEIPT
from: code-reviewer
task: fix/standalone-viewport (d23a7ed test, f35de08 fix)
status: pass
score: 100
hard_gates: { lint: pass, typecheck: pass, tests: pass, coverage: pass, no_critical: pass, security_scan: n/a }
findings: { critical: [], warning: [], suggestion: [S-291, S-292] }
next_action: merge; QA S1 REVERIFY player-foundation (add viewportHeight files to its plan); owner checks on iPhone home-screen app with the diag panel (full screen on first launch, no bottom flicker); Android standalone at U-24 ⑦. No push before QA
backlog: [S-291, S-292]
report: .proj-docs/reviews/2026-11-27_14-37_review_standalone-viewport.md
context: tab path unchanged (tests + mutants V2/V4); 6/8 mutants killed (probe CSS V7/V8 survive). Typecheck 0 in the worktree.
```
