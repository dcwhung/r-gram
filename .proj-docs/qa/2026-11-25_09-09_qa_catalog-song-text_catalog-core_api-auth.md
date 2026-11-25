# QA — catalog-song-text（新）+ catalog-core + api-auth 重驗 — 2026-11-25 — S1

- Tier: T2（T-029 新模組；T-096 schema 跟 CR-003）| Commit: HEAD `5e54964`（code 最後改喺 `840612a`）| Verdict: ✅ pass | Hard Gates: all pass（PWA、Performance 唔適用；Security / Data 由 song-text AC-4、AC-5 同 schema CHECK 覆蓋）
- Ledger（`impact --since 4e348fd~1`）: SKIP 4（`player-catalog`、`player-core`、`player-foundation`、`repo-scaffold`）/ REVERIFY 2（`catalog-core`、`api-auth`）/ UNCOVERED 10（`packages/catalog/src/song-text/**`）→ 新鏈 `catalog-song-text`
- Plan: [`plans/catalog-song-text.md`](plans/catalog-song-text.md)（新；獨立功能 = 獨立鏈，一個檔一個 owner）。[`plans/catalog-core.md`](plans/catalog-core.md) 只改 Scope 一行（`src/**` 除 `src/song-text/**`）。`parseLrc.ts`、`index.ts`、`schema/types.ts` 留喺 `catalog-core`。[`plans/api-auth.md`](plans/api-auth.md) 冇改；HTTP smoke 唔使做（route、middleware、`wrangler.toml` 冇改）

## Runs
| Command | Result | Time |
| --- | --- | --- |
| `npm run lint`、`npm run typecheck` | exit 0、exit 0 | ~10 s |
| `npm run coverage`（全部 workspace 一次；SKIP 嘅鏈係順帶跑到，唔當重驗） | 54 / 54 檔、**648 / 648**；statements 99.63% / branches 96.65% / functions 99.46% / lines 99.91%；`src/song-text` 100 / 96.2 / 100 / 100；`src/lrc` 100 / 95.34 / 100 / 100 | 21 s |
| Song-text probe（scratchpad；esbuild bundle `packages/catalog/src/index.ts`，Node 22；預期由 D31 / D32 / D37 / TS 規則寫） | **58 / 58** + 6 個資料點 | < 1 s |
| Schema probe（scratchpad workerd test，repo 外；用 repo 嘅 `wrangler.toml`、`migrations/`、`test/applyMigrations.ts`；本機 miniflare D1） | **4 / 4**（≈ 30 個 insert / update） | 1.3 s |

**對外請求：0**（冇 wrangler deploy、冇 remote D1、冇瀏覽器；全部喺本機 Node / workerd）。凍結後 `status` 全部 FROZEN（7 條鏈）

## 驗收標準 — catalog-song-text（新鏈）
| AC | 結果 | 證據（probe） |
| --- | --- | --- |
| AC-1 歌名 | ✅ | 前面空行 + 前後空白 → trim 後第一行；空 / 全空白 → `1:TITLE_REQUIRED`；淨係貼 LRC → `1:TITLE_REQUIRED`；`[1999] 歌`、`[1] 第一段`、`[ti:歌名]` 收；`[1:2] 歌` 拒 |
| AC-2 標籤 | ✅ | 五個標籤亂序、`:` / `：`、標籤同冒號之間有空格；重覆（包括全半形混）→ 嗰行 `DUPLICATE_LABEL`、留第一個值；空值 → null、四項都冇 → `credits = null`；空行或者第一行非標籤行即完（之後嘅 `詞：B` 變歌詞）；`作曲：`、`曲目：` 唔算 |
| AC-3 歌詞 | ✅ | 同步：多時間戳拆開、排序、`[offset:500]` 套用、`[ti:]` 忽略、行頭空白 OK；純文字：trim、連續空行併一個；**W-012**：`[1]`／`[2]` 段落純文字冇錯、`[Chorus]`／`[ti:]`／`[offset:500]` 單獨 → 純文字；`[00:12.30]`、`[00:60.00]`、`[1:2]` 令成段變同步（後兩個再報 `BAD_TIMESTAMP`）；混合 → `5:MIXED…,7:MIXED…`；`[offset:abc]` → `BAD_OFFSET` |
| AC-4 行號 / 正規化 | ✅ | BOM + CRLF + 行尾 tab：行號照成段計（`5:MIXED_TIMESTAMPS`）；`source` 冇 `\r`、頭尾空行刪；錯誤按行排（`3:DUPLICATE_LABEL,6:MIXED_TIMESTAMPS`） |
| AC-5 上限 | ✅ | 歌名 200 收 / 201 拒（emoji 計 1 字）；副題 201 → `TITLE_TOO_LONG`；credit 200 / 201；歌詞行 500 / 501（同步行連時間標記計）；剛好 65 536 byte 收、+1 → 只有 `0:TOO_LARGE`；中文按 3 byte；1000 行收、1001 行 `0:TOO_MANY_LINES` |
| AC-6 回填 / round trip | ✅ | 262 首 seed（53 首有副題、209 首有 credit）× 4 種歌詞（冇、同步、純文字含 `[1]`、似標籤嘅純文字）= **1 048 / 1 048**：parse 冇錯、欄位同原本一樣、再 format → parse 第二轉不變；輸出次序、全形冒號、歌詞前一個空行、冇歌詞冇尾空行 |
| AC-7 歌詞 JSON | ✅ | `toLyricsJson` 同步 `{synced:true, lines:[{t,text}]}`、純文字 `{synced:false, lines:[{text}]}`，多餘欄位唔抄 |

## 重驗 — catalog-core（只驗改咗嘅：`parseLrc.ts` + test、`index.ts`、`schema/types.ts` 註解）
- AC-4 LRC 規則不變：四種時間格式、一行多個、排序、`[offset:+1000]`、metadata 忽略、純文字逐行 `NO_TIMESTAMP`、空 → `EMPTY`、`[00:60.00]`／`[1:2]`／`[Chorus]` 逐行 `INVALID_TIMESTAMP`（probe）；developer 原有 `parseLrc.test.ts` 喺 coverage run 全綠。`index.ts` 新 export 經 bundle 用到；`types.ts` 只改註解。AC-2、3、5–8 冇改，引用 ledger

## 重驗 — api-auth（只驗 `0001_init.sql` 同三個 test 檔）
- AC-8 資料庫（按 TS v1.2「數據庫設計」CR-003）：表 = `albums, assets, catalog_state, lyrics, sessions, tracks`，`publishes` 冇咗；`albums` / `tracks` 冇 `enabled`（帶 `enabled` 嘅 insert 失敗）；`lyrics` 欄 `track_id, source, synced, json_name, line_count, updated_at`，`source`、`synced` NOT NULL，`synced` = 2 / −1 / null / `'true'` / 0.5 拒（`'1'` 經 INTEGER affinity 存做 1）；`catalog_state`：`id` 2 / 0 拒、第二行拒、`'pending'` / `'OK'` / `''` / null 拒、`ok` 缺 hash / generated_at / album_count / track_count 任何一個拒、`failed` 四欄 null 收、upsert 做 `ok` 之後 `SET hash = NULL` 拒；cascade 刪除照舊；`sessions` 欄不變
- 登入流程（AC-1 – AC-7）：11 個 api test 檔（allowlist、oauthStart、oauthCallback、session、sessionGuard、logout、next 等）喺 coverage run 全綠；code 冇改

## Findings（冇 🔴 / 🟡；以下唔 block）
- 🟢 Minor：淨係 `\r`（舊 Mac）換行唔當分行：`歌\r曲：A\r\r第一句` → 成段做歌名、冇錯誤（probe）。Spec 冇講 CR；瀏覽器 textarea 會轉 LF，只有直接打 API 先會遇到。建議 `LINE_BREAK` 用 `/\r\n?|\n/`，或者 API-041 先正規化
- Observation：同步歌詞入面嘅 `[1] 二` 報 `BAD_TIMESTAMP`，唔係 `MIXED_TIMESTAMPS`（probe）。都擋儲存、行號啱；T-023 揀錯誤文字時要留意
- Observation：`plans/api-auth.md` AC-8 嘅表名仲寫 `publishes`；今次按 TS v1.2 驗。下次改呢份 plan 時更新（改咗要重新 freeze）
- 已喺 review 報告：S-051（尾換行令 1000 行變 1001）、決定 1（標籤行做第一行 → `TITLE_REQUIRED`）：probe 重現到，唔重複

## 建議補測
- none（S-050 嘅測試缺口已喺 backlog；probe 冇搵到新嘅漏）

```handoff-receipt
protocol: 2
status: pass
score: n/a
stage: S1
ledger: "SKIP 4 / REVERIFY 2 (catalog-core, api-auth) / UNCOVERED 10 (new chain catalog-song-text)"
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "99.63%"
next_action: end
next_agent: null
branch: "claude/charming-cannon-8yulp0"
context: "T-029 + T-096 S1 pass at 5e54964 (code 840612a). New chain catalog-song-text (src/song-text/**) AC-1..7: probe 58/58, seed round trip 1048/1048, W-012 fix confirmed. catalog-core re-verified for parseLrc/index/types (plan Scope line excludes song-text). api-auth re-verified for schema via scratch workerd probe 4/4; login tests green. 648/648, coverage 99.63%. 0 outside requests. 1 Minor (lone CR line breaks), 2 Observations. QA files uncommitted: main agent commits and adds catalog-song-text to CLAUDE.md chains and the index."
```
