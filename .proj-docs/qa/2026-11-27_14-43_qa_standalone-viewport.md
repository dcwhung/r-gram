# QA — 主畫面 app 舞台高度穩定（iOS standalone viewport 跳動）— 2026-11-27 — S1

- Tier: T1 | Commit: `f35de08`（branch `fix/standalone-viewport`，未合併；`d23a7ed` test → `f35de08` fix）| Verdict: **✅ pass**
- 基準：review `reviews/2026-11-27_14-37_review_standalone-viewport.md`（100；真機 diag：standalone `innerHeight` 793 ↔ 852、`100lvh` = 852）；TS 實現注意事項 13（舞台跟 viewport 同安全區）；FS D111（舞台畫滿螢幕）；`plans/player-foundation.md` AC-3、AC-17、新 AC-18
- Ledger（`impact --since 33a4108`，worktree）: SKIP 25 / REVERIFY 1（`player-foundation`）/ UNCOVERED 10 → `player-foundation` 5（`stage/viewportHeight.{ts,css,test.ts}`、`stage/useStageFit.test.ts`、`stage/standaloneHeight.node.test.ts`）；`src/diag/**` 5 = 臨時診斷面板，唔開鏈（拆走時一齊刪）
- SKIP（frozen，冇驗）：其餘 25 條鏈 @ 上次 ledger
- Plan：`plans/player-foundation.md` 加 AC-18（standalone 高度規則 + 分頁不變）同 5 個 scope 檔
- Ledger 註：`apps/player` 喺 `10cff5a`（主 checkout）同 `f35de08` 之間只差呢 12 個檔，所以 `player-foundation` 嘅 hash 係用 worktree 計（= 合併後嘅內容）；未合併之前主 checkout 嘅 `status` 會顯示呢條鏈 MISSING／STALE

## Runs（證據：`/tmp/claude-0/-home-user-r-gram/acff8cc1-40eb-514e-8a3f-b8e552922449/scratchpad/qa-sv/`；只連 `127.0.0.1`，被擋 0）
| Command | Result | Time |
| --- | --- | --- |
| `npm run lint` / `npm run typecheck`（worktree `f35de08`） | exit 0 / exit 0 | 35 秒 |
| `npm run coverage` | exit 0；258 檔 3294 / 3294；98.46 / 93.44 / 98.39 / 99.33；`viewportHeight.ts`、`useStageFit.ts` 100 / 100 / 100 | 122 秒 |
| `npm run build -w apps/player` | exit 0；precache 16 項 | 10 秒 |
| QA build × 3（`git archive`：`f35de08` 0.1.0、`f35de08` 改 0.1.1、`33a4108`；`VITE_CATALOG_URL=https://127.0.0.1:8797/…`） | exit 0 × 3 | 1 分鐘 |
| `tools/sv.cjs`（分頁 × 3 尺寸 fix 對 base；standalone 模擬 fix／base；真 viewport 變；S-292 情況） | 12 / 12 | 2 分鐘 |
| `tools/pwa.cjs`（A 0.1.0／B 0.1.1） | 12 / 12 | 1 分鐘 |

## 驗收
| 規則 | 結果 | 證據 |
| --- | --- | --- |
| 分頁不變（393 × 852 59／34、0／0；393 × 735 0／0） | ✅ | fix = `33a4108`：`html`／`#root`／外框／舞台／SVG 盒、六個 `--stage-*` 變數完全一樣；`.full-height-probe` 唔存在；`matchMedia` standalone false；截圖逐像素一樣（`shots/tab-{fix,base}-*.png`，diff bbox = 無）；`innerHeight` 減 59 之後兩邊一樣跟住變（例 2085.80 → 1923.66 單位） |
| standalone：高度 = max(`innerHeight`, `100lvh`) | ✅ | 模擬（`matchMedia` 答 standalone、`@media (display-mode: standalone)` 改寫成 `all`、`navigator.standalone` true）：probe 852、舞台 59 → 818.02 = `fitStage(393, 852, 59／34)`；`html, body` 規則 = `100lvh` |
| standalone：793 ↔ 852 跳動 | ✅ | `innerHeight` 793／852 交替 7 次（每次 `resize`）：變數只有一組、外框 0 → 852、外框 `style` 0 次改動（冇 re-render）；`33a4108` 同一個測試：兩組變數、12 次改動（即係原本嘅閃） |
| standalone：真 viewport 變（似轉向） | ✅ | 393 × 760：probe 760、外框 0 → 760、舞台跟住重計 |
| PWA（global.css 改 → CSS hash、precache 改） | ✅ | precache 16 項；SW 下導航 fallback、`robots.txt` 真檔、離線重開；0.1.0 用緊出版本掣、唔自己 reload，㩒 → 0.1.1 |
| 減少動態效果 | n/a | 冇動畫改動 |

## Findings
- 冇 🔴 / 🟡。冇 CUI ticket
### 🟢 / Observation
- S-291、S-292（review）：backlog（唔重複分析）。S-292 情況實測：淨係 `navigator.standalone`（media query 唔 match）、`innerHeight` 793 → 舞台用 852；Chromium 冇動態工具列，`html` 本身都係 852，所以見唔到外框被剪，要真機先知
- Observation：Chromium 冇會郁嘅工具列，`100dvh` = `100lvh` = `innerHeight`；`global.css` standalone 規則嘅實際效果、第一次開 app 係咪全螢幕、底部冇閃，只可以喺 iPhone 主畫面 app（diag 面板）核對；Android standalone 留畀 U-24 ⑦

## 建議補測
- none（S-291 已經喺 backlog）

```handoff-receipt
from: quality-assurance
stage: S1
tasks: [fix/standalone-viewport]
status: pass
hard_gates: { tests: pass (3294/3294), coverage: pass (98.46 stmts; new files 100), no_blocking_finding: pass, pwa_update: pass (precache 16, A->B update), security_data: n/a }
findings: { critical: [], warning: [], suggestion: [S-291 backlog, S-292 backlog], observation: 1 }
frozen: [player-foundation] @f35de08
next_action: main agent merges fix/standalone-viewport, then commits .proj-docs/qa/** (ledger rows already match the merged apps/player); owner checks the iPhone home-screen app with the diag panel. No push before the owner wants a deploy
report: .proj-docs/qa/2026-11-27_14-43_qa_standalone-viewport.md
context: "Tab path identical to 33a4108 (boxes, vars, pixels) at 393x852 and 393x735. Emulated standalone: innerHeight 793<->852 x7 → one key, frame 0..852, 0 re-renders (base: 12). PWA update A->B pass. Local only."
```
