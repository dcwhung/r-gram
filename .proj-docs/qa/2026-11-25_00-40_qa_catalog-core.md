# QA — catalog-core — 2026-11-25 — S1

- Tier: T2（新 package + scaffold；任務 T-001、T-002）| Commit: `c0fd66c` | Verdict: ✅ pass
- Ledger: SKIP 0 / REVERIFY 0 / UNCOVERED 42（第一次 QA；`impact --since fa4924a`）→ 39 個現存檔案全部入 `catalog-core`；另外 3 個係已刪走嘅 `data/*`（已搬位，冇嘢可以 freeze）
- Plan: [`plans/catalog-core.md`](plans/catalog-core.md)（AC-1 – AC-9 嘅來源同 scope 喺入面，呢度唔重複）
- Hard Gates: all pass（Tests、Coverage、No blocking finding、Security / Data；PWA 同 Performance 唔適用：冇 app、冇 Backend API）

## Runs

| Command | Result | Time |
| --- | --- | --- |
| `npm run lint` | ESLint + Prettier 冇錯 | 2 s |
| `npm run typecheck` | 冇錯 | 1 s |
| `npm run coverage`（= `npm test` 嘅全部 test + 80% 門檻，所以冇另外跑 `npm test`）；plan 嘅 scoped 寫法（`npx vitest run --project … --coverage`）都跑過一次確認用得，結果一樣 | 9 個檔、176 / 176；statements 99.72% / branches 94.28% / functions 100% / lines 100%；每個檔 branches ≥ 84% | 3 s |
| 驗收 probe（scratchpad，只用 public API `packages/catalog/src/index.ts`，冇入 repo） | 23 / 23 | 0.5 s |
| CI（引用，冇重跑）：`CI` run 45519160653 @ `c0fd66c` | success：`Detect code changes` + `Lint, type check & unit`（lint、typecheck、coverage 三步都有跑） | 46 s |

## 驗收標準

| AC | 結果 | 證據（probe 實際跑出嚟嘅結果） |
| --- | --- | --- |
| AC-1 Scaffold | ✅ | 三條指令全綠；`data/` 已經冇咗，`apps/api/seed/{discography,credits}.json` 同 `_design_/rubberband-discography.html` 喺度 |
| AC-2 Catalog 文件 | ✅ | API-070 例子原樣通過；`null` 嘅 `audio` / `mv` / `lyrics` / `cover` / `thumb` / `credits`（成個同逐欄）通過；`favourites`、`Apollo-18`、`a--b`、3 個字嘅 `wheelKey`、`#abc`、`2008-9-26`、重覆歌號 / 專輯 id / 歌 id 各自報返啱嘅 path + code；9 款惡意輸入（`null`、array、`__proto__` key…）全部回 `ok: false`，冇 throw、冇污染 prototype |
| AC-3 `mediaUrl` | ✅ | `apollo-18/01 一早地下鐵.m4a` 每段各自 encode；有 `#`、`?`、`%`、空格嘅 key 經 `new URL()` 解返出嚟同原 key 一樣，冇變成 query / fragment |
| AC-4 LRC | ✅ | 四種時間戳格式 → 12000 / 13300 / 14300 / 62305 ms；一行兩個時間戳拆成兩行並按 `t` 排序；`[offset:500]` 同 `[offset:-500]` 有套用；`[ti:]` `[ar:]` `[al:]` `[by:]` `[length:]` 忽略、冇錯誤；純文字 → 0 行 + 每行 `NO_TIMESTAMP`；混合輸入報第 3、4、5 行（`INVALID_TIMESTAMP` ×2、`NO_TIMESTAMP`）；淨係 metadata → `EMPTY`；空白歌詞行保留做間奏；CRLF 同 UTF-8 BOM 冇問題；2 萬個時間戳 + 20 萬個 `[` 嘅行 21 ms |
| AC-5 掃描配對 | ✅ | 13 個檔嘅資料夾：5 個配對（`2 二.Mp3`、`002 … .M4V`、`012 … .mp3` 都啱歌號同類別）、1 個衝突（同一首歌 `m4a` + `mp3`，冇自動揀，嗰首歌列入 `tracksWithoutAudio`）、6 個配對唔到（`NO_SUCH_TRACK` / `UNKNOWN_EXTENSION` / `NO_TRACK_NUMBER`）；資料夾名嘅數字唔當歌號；每個檔只落一類；重複掃描結果一樣 |
| AC-6 `wheelKeyFor` | ✅ | `Apollo 18` → `A`、`¿Frank?` → `F`、`i` → `I`、`電影《逆流大叔》原聲大碟` → `電`；17 張 seed 專輯嘅 `wheelKey` 全部同函數輸出一致 |
| AC-7 顏色 | ✅ | 同設計稿原函數（照抄入 probe）逐個比：`glowColor` 5000 隻隨機色 + 黑 / 白 / 灰 / 大楷 hex 全部一致；`dominantColor` 300 張 24 × 24 不透明色板全部一致（當中 57 張行中性灰分支） |
| AC-8 Seed | ✅ | `matchCredits` = 187 / 22 / 53，同 probe 入面獨立重寫嘅三條規則計出嚟一樣；53 首冇資料嘅有 39 首喺 `men-on-the-dragon-ost`（US-109 寫 39）；有 credit 嘅 209 首冇「—」或者空字串；fixture catalog 17 張專輯 262 首歌通過 `parseCatalogDocument()`，歌 id 全部係 `<albumId>-<NN>` 而且唔重覆，專輯次序跟 `order` |
| AC-9 CI | ✅ | `detect-code-changes.test.mjs`（喺臨時 git repo 真係跑 script）包喺 176 個 test 入面全綠；HEAD 嘅 CI run 綠（見 Runs） |

## Findings

冇 🔴 / 🟡（冇任何一項同時有 L1 + L2）。以下係 Observation：唔 block，入 backlog。

- Observation：`packages/catalog` 未有字串長度上限（TS「安全設計」寫 body 驗證要有；`CREDIT_MAX_CHARS`、`LRC_MAX_BYTES` 喺 code 入面搵唔到）。T-002 嘅範圍冇列呢項，屬歌曲 / 歌詞 API 任務（T-023 起）；做嗰啲任務時要加，並決定放喺 `packages/catalog` 定 `apps/api`。
- Observation（ledger）：root 設定檔（`package.json`、`package-lock.json`、`tsconfig.json`、`vitest.config.ts`、`ci.yml`…）按今次指定嘅範圍入咗 `catalog-core`。之後每加一個 app 都會改呢幾個檔，令 `catalog-core` 變 REVERIFY（重跑 plan 三條指令，約 7 秒）。想 `packages/catalog` 保持凍結，可以喺第一個 app 任務（T-020 / T-030）將佢哋分去新鏈 `repo-scaffold`。另外，以 `fa4924a` 做 base 時，3 個已刪走嘅 `data/*` 路徑會一直顯示 UNCOVERED（工具 freeze 唔到已刪嘅檔）；下個任務 base 改用 T-002 最後一個 commit 就唔會再出現。

## 建議補測（高風險邏輯，≤ 3；由 developer 寫）

- `seed/seed.node.test.ts`：53 首冇 credit 嘅歌有 39 首屬 `men-on-the-dragon-ost` — US-109 寫明嘅數字，而家冇 test 鎖住（probe 驗過係 39）。
- `lrc/parseLrc.test.ts`：檔頭有 UTF-8 BOM（`\uFEFF[00:01.00]…`，Windows 匯出嘅 `.lrc` 常見）— 而家靠 `trim()` 啱啱好處理到，冇 test 鎖住；第一行歌詞一旦被當錯誤，管理員好難睇得出原因。

```handoff-receipt
protocol: 2
status: pass
score: n/a
stage: S1
ledger: "SKIP 0 / REVERIFY 0 / UNCOVERED 42"
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "99.72%"
next_action: end
next_agent: null
branch: "claude/charming-cannon-8yulp0"
context: "T-001 + T-002 S1 pass：AC-1–AC-9 全部通過（176/176、覆蓋率 99.72%、probe 23/23、CI run 45519160653 @ c0fd66c 綠）；catalog-core S1 已 freeze（40 個檔連 plan）。冇 blocking finding、冇 ticket。未有 main，唔使 merge，留喺 session branch 做下一個任務。2 條 Observation 同 2 條建議補測入 backlog"
```
