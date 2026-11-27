# Review — 歌曲文字：歌名之後隔空行嘅曲詞編監照認做標籤（fix/song-text-credit-gap）＋ migration 0002

- **日期**：2026-11-27 12:35（UTC）　**審閱者**：Code Reviewer（獨立）　**Tier**：T2（parser 規則改動 + production D1 data migration）
- **目標**：branch `fix/song-text-credit-gap`（未 merge）。`git diff 4bde20b fix/song-text-credit-gap`：13 檔 +314／−84；`acd625a` test → `9188cd5` fix（parser、拎走 `labelHints`）→ `2c94714` fix(api)（migration `0002_reread_song_texts.sql` + 測試）
- **總評**：**✅ pass（95 / 100）**。parser 改動細、正確，行號、CRLF／BOM、全形空格、副題、冇歌詞、時間標記歌詞全部有測試；API 儲存同同步用同一個 `parseSongText()`；migration 只清 `tracks.text_source_etag`，冪等，唔郁 `updated_at`，同步照舊唔寫唔刪媒體 bucket。冇 Critical。一個 🟡 **W-076** 係**部署次序風險**：Workers Build 先 migrate 後 deploy，中間（或者 deploy 失敗時）舊 Worker 做嘅同步會用舊規則重新記低 ETag，令重新讀取失效（已重現）。code 可以 merge，但 push 之前要照下面「擁有人安全步驟」做
- **範圍**：冇改 source、冇 commit、冇 push。mutant、probe、本機 migration 喺 scratch（`git archive` 嘅副本，`node_modules` 逐項 symlink，`@r-gram/*` 指返 scratch 自己嘅 workspace）：`/tmp/claude-0/-home-user-r-gram/acff8cc1-40eb-514e-8a3f-b8e552922449/scratchpad/review-songtext/`；冇連外部 host，冇 `--remote`

## Hard Gates

| Gate | 結果 | 證據 |
| --- | --- | --- |
| Lint | pass | scratch：`eslint <diff 入面 .ts>` exit 0；`prettier --check <diff 檔，.sql 除外>` exit 0（`.sql` 冇 parser，`prettier --check .` 會略過，同 `0001_init.sql` 一樣） |
| Type check | pass | scratch：`tsc -b` exit 0（`labelLinesAfterGap` 拎走之後冇殘留 import；`apps/admin` 冇用到） |
| Tests | pass | `@r-gram/catalog`：`parseSongText`、`formatSongText`、`songText.node`、`limits` 4 檔 77 / 77；`@r-gram/api`：`rereadSongTexts`、`syncFolder`、`tracksText`、`songTextFile`、`syncLimits`、`lyricsAfterCatalog` 6 檔 115 / 115（冇跑 full suite） |
| Coverage | pass | `parseSongText.ts` stmt 100 %、branch 97.67 %（未覆蓋只係 `lines[index] ?? ''` 嘅 fallback）、line 100 % |
| No Critical／Security | pass／n/a | 冇新依賴 |

本機 migration：`wrangler d1 migrations apply r-gram --local --persist-to <scratch>` → `0001`、`0002` ✅；再行一次 → 「No migrations to apply」；`d1_migrations` 次序 0001、0002。`check:deploy` exit 0（只查 `wrangler.toml`，唔查 migration）。TDD：`acd625a` 只有測試（M1 = 舊規則殺 9 個測試，證明先紅）→ `9188cd5`；`2c94714` 測試同 migration 同一個 commit（S-286）。

## 評分結果

| 維度 | 得分 | 滿分 | 備注 |
| --- | --- | --- | --- |
| 正確性 | 20 | 25 | W-076（部署窗口） |
| 安全性 | 20 | 20 | 同步冇 `MEDIA.put`／`MEDIA.delete`；SQL 冇參數 |
| 可維護性 | 20 | 20 | 淨咗 29 行 helper，`hintsOf` 簡化 |
| 測試覆蓋 | 15 | 15 | 14 個 mutant 殺 12，存活兩個見 Mutants |
| 性能 | 10 | 10 | 重新讀取 = 每張碟一次「第一次同步」嘅量，喺上限內 |
| 代碼風格 | 10 | 10 | |
| **總分** | **95** | **100** | **結果：✅ pass** |

## 🔴 Critical

冇。

## 🟡 Warnings

### W-076 Workers Build「先 migrate、後 deploy」：中間或者 deploy 失敗時舊 Worker 做嘅同步會令重新讀取失效

- **位置**：`apps/api/migrations/0002_reread_song_texts.sql`；`packages/catalog/src/sync/planTrack.ts:65`（`needsRead`：ETag 同 `text_source_etag` 一樣就唔讀）；`apps/api/src/sync/trackWrite.ts:46`（讀到有效檔就記低 ETag）
- **L1**：`.claude/CLAUDE.md`「正式部署」：push = `npm run migrate:remote -w apps/api && npm run deploy -w apps/api`；migration 自己嘅註解寫明目的係「下一次同步逐首重新讀、重新解析」
- **L2**：scratch probe（parser 換返舊規則 = 窗口入面嘅舊 Worker）：套用 0002 → 同步一次 → 第 5 首 `text_source_etag` 已經等於 R2 ETag，credit 仍然係空；之後再同步 `MEDIA.get` 0 次（`rereadSongTexts.test` 嘅「should read only changed files again」都證明咗：任何一次同步之後就唔會再讀）
- **L3**：窗口 = migration 完成到新版本生效（`deploy` 要先 build `apps/admin` 再上載，大約幾十秒）；`deploy` 失敗就一直係舊 Worker + 已套用嘅 0002，重試 push 唔會再行 0002。呢段時間擁有人㩒同步，嗰啲碟嘅 credit 會繼續當歌詞，而且冇提示。媒體 bucket 冇損失，可以補救，所以係 Warning 唔係 Critical
- **方案 A**：唔靠 migration：`text_source_etag` 記 `<ETag>#<規則版本>`（例如常數 `SONG_TEXT_RULES = 2`），`needsRead` 同 `trackWrite.prepare` 比較加咗後綴嘅值。舊 Worker 寫返嘅係冇後綴嘅 ETag，新 Worker 照樣會再讀；以後再改 parser 規則（例如 S-285）只係加版本，唔使再加 migration。代價：改 `api-sync` 鏈兩個檔同 Technical Spec 欄位定義，QA 範圍大啲
- **方案 B（推薦，今次）**：保留 0002，加兩樣嘢：① `apps/api/package.json` `version` 升到 `0.1.1`（`/api/health` 會回 `version`，擁有人可以確認新 Worker 生效先同步；而家一直係 `0.1.0`，分唔到新舊）；② 照下面「擁有人安全步驟」做，連核對 SQL 同出事時嘅補救（另一個同內容嘅 `0003`，要再 review）。方案 A 入 backlog
- **Blocking**：唔阻 merge；**阻 push**，直到 ① 做咗同擁有人知道步驟

## 🟢 Suggestions／Observation（唔阻，入 backlog）

- **S-284** `formatSongText.ts` 檔頭寫「`parseSongText(formatSongText(x))` 等於 `x`」，而家唔再全啱：歌詞第一行以「曲：」等開頭（例如舊規則匯入咗嘅歌詞）回填之後會讀成 credit（probe：`{ lyrics: '曲：A\n\n第一句' }` → composer A、歌詞「第一句」）。production 只用 `formatSongText({ title })`，冇資料影響；改註解，並加一個測試寫明呢個接受咗嘅副作用（「歌名\n\n曲：這是歌詞」→ credit）
- **S-285** 淨係得睇唔到字元嘅行（ZWSP、ZWJ 等；S-158 嘅 `withoutHiddenCharacters` 範圍）唔當空行：probe「歌名\n​\n曲：A\n\n第一句」→ credit 冇、歌詞由 ZWSP 行開始，同今次要修嘅情況一樣冇提示；「​曲：A」都唔認做標籤。全形空格同 NBSP 冇問題（`trimEnd`／`trim` 已處理）。由網頁複製嘅文字較常見。建議喺 `readLabels` 判斷空行同標籤之前先 `withoutHiddenCharacters()`；如果想一次過重新讀啱晒，最好喺 push 之前一齊做（否則之後要再加 migration，或者用 W-076 方案 A）
- **S-286** TDD：`2c94714` 測試同 migration 同一個 commit。`rereadSongTexts.test` 先 commit 會因為「0002 is missing」紅，可以分開；同之前 S-060、S-068 一樣，可以接受
- **S-287** M4 存活：`readLabels` 唔 `trim()` 都冇測試失敗，即係「行頭有空格嘅標籤行」（例如「　曲：A」）冇測試（舊規則都係咁，屬原有缺口）。擁有人嘅檔可能有縮排，加一個測試
- **S-288** `rereadSongTexts.test.ts` 唔屬任何 QA 鏈（`api-auth` 嘅預設範圍會包到）；建議歸入 `api-sync`，同 `0002` 一齊寫入 frozen plan
- Observation：重新讀取之後，同步總結會將**每首有文字檔嘅歌**列做「已更新」（ETag 係 NULL，一律重寫；內容冇變嘅歌詞 JSON 同名，唔會刪）。屬預期，擁有人唔使驚
- Observation：歌詞 JSON 改名嘅歌，舊 JSON 喺 catalog 生成成功之後刪（`dropLyricsLater` → `dropUnusedLyrics` 先查 D1 仲有冇其他歌用同一個 hash，有就留；admin 逐個資料夾順序同步，冇同時寫入）。仲開住、拎住舊 catalog 嘅播放端，未 cache 嘅舊歌詞會載入失敗，重新開 app 就得（W-021 原有取捨，今次一次過多首）
- Observation：而家會失敗嘅寫法（之前會成功當歌詞）：同一個標籤隔空行出現兩次 → `DUPLICATE_LABEL`。照 D72 保留上次成功匯入嘅內容、出 `TEXT_INVALID`，冇內容損失，擁有人改檔再同步就得；ETag 唔記低，每次同步都會再讀（原有行為）。「曲：A 詞：B」一行、「主唱：」排喺標籤前面都同以前一樣（前者 composer =「A 詞：B」，後者成段當歌詞），唔係今次範圍

## ✅ 做得好嘅地方

- 一行改動解決問題，歌詞開始位置直接用 `readLabels` 回傳值，行號唔使另外計；`labelHints` 同提示一齊拎走，冇留死碼
- migration 測試好紮實：「冇 migration 唔會再讀」、「只改呢一欄（逐欄比較成張表）」、「同步只讀 bucket（`puts` 空、冇 `delete`）」、「舊 JSON 等 catalog 生成成功先刪」、「之後只讀改過嘅檔」
- 測試全部用佔位文字（作曲者甲、填詞者乙、第一句），冇真歌詞、冇真 credit 名；歌名「太平門」等係現有 fixture 嘅公開資料

## Migration 安全

| 項目 | 結果 |
| --- | --- |
| 冪等 | SQL 本身冪等（再行只係將 NULL 設 NULL）；wrangler 用 `d1_migrations` 記住，只行一次（本機證實） |
| 只改一欄 | 測試逐欄比較；mutant M10（改 `updated_at`）、M12（清 `text_key`）被殺 |
| 同步進行中 | 單一句 UPDATE，原子；唔改 `updated_at`，同步嘅 `WHERE updated_at = ?` 唔受影響。風險只係 W-076（舊規則寫返 ETag） |
| 編號 | `0002_` 接 `0001_init.sql`；`migrations_dir = "migrations"`；測試用 `readD1Migrations()` 讀同一個資料夾 |
| 媒體 bucket | 同步只 `MEDIA.get`／`list`；`MEDIA.put` 只喺 `media/writeText.ts`（API-019、API-041），全 repo 冇 `MEDIA.delete` |
| 免費額度 | 一張碟（≤ 41 首）每首 get 1 + 歌詞 put 1 + D1 batch 1 ≈ 125，加 list、狀態、catalog、清 JSON ≈ 135 次操作／請求（`config.ts` 估 100 首 ≈ 320，QA 實測最多 318，假設上限 1000）。按 spec 最多 21 張碟、291 首，即 21 個 API-034 請求，同第一次同步一樣嘅量 |
| 同步頁 | `folderPass` 每個資料夾自己 retry、出錯記做 `folderProblem` 再做下一個；ETag 逐首成功先記，冇做完嘅下次同步自動繼續；`PagesExhaustedError` 要一個資料夾超過 20 批（2000 首）先會出，唔會遇到 |

## 擁有人安全步驟（push 之前要知）

1. 開發者做 W-076 方案 B ①（`apps/api` version → 0.1.1），過 QA
2. **push 之前關晒同步頁**；push 之後喺 Cloudflare dashboard 睇 Workers Build：log 有 `0002_reread_song_texts.sql ✅`，而且 deploy 成功
3. 開 `/api/health`，確認 `version` 係 `0.1.1`。**未見到之前唔好同步**。deploy 失敗就唔好同步，修好再 push
4. 喺同步頁同步全部資料夾一次。預期每首有文字檔嘅歌都係「已更新」；如果有新嘅 `TEXT_INVALID`（例如同一個標籤隔空行寫咗兩次），改檔再同步
5. 核對（擁有人自己行，只讀）：`npx wrangler d1 execute r-gram --remote --command "SELECT t.id FROM tracks t JOIN lyrics l ON l.track_id = t.id WHERE substr(l.source, 1, 2) IN ('曲：','詞：','編：','監：','曲:','詞:','編:','監:')"`：應該冇結果（真係以「曲：」開頭嘅歌詞除外）
6. 播放端重新開 app，載入新 catalog
7. 如果第 3 步之前有人同步過，或者第 5 步有結果：通知 main agent，加一個同內容嘅 `0003`（要 review），或者喺管理端重新儲存嗰啲歌嘅文字（新 ETag）

## 下一個 CR 要改嘅文件（今次冇改）

- **Functional Spec D31**（:572–:600）：「呢一段幾時完」改做「歌名之後、標籤之間嘅空行跳過；第一個非空白又唔係標籤嘅行」；寫明副作用（歌詞第一行以「曲：」等開頭會當 credit）；「回填」一行嘅「讀入 → 儲存 → 再讀入唔會變」加例外；範例可以加「歌名、空行、標籤、空行、歌詞」；記一條新決定（擁有人 2026-11-27）
- **Technical Spec「`parseSongText()` 嘅規則」**（:925–:934）：「標籤段完結」一行；`formatSongText()` 一行「`parseSongText(formatSongText(x))` 要等於 `x`」加例外（輸出欄 `subtitle` 亦已過時，CR-007）
- **Technical Spec :1132**（API-041 `hints`「似標籤但前面有空行嘅行」）同 **:1594**（「同 `LABEL_AFTER_BLANK_LINE` 一樣唔擋」）：只剩 `SUBTITLE_IGNORED`
- **Technical Spec 資料模型 `text_source_etag`**（:598）、同步流程（:260）、目錄（:93）、:1091「唔加 `0002`」：加 migration `0002`（D1 已部署，第一個資料 migration，清 ETag 令下次同步重新讀）
- **backlog B-038**：關閉（擁有人 2026-11-27 決定取代「提示」方案）
- **QA frozen plan**：`catalog-song-text` AC（標籤段規則、`labelHints` 拎走）、`api-tracks`（hints）、`api-sync`／`api-auth`（`0002`、`rereadSongTexts.test`，S-288）；ledger 刪 `labelHints.ts`／`labelHints.test.ts` 兩行

## Mutants（scratch；每個只跑相關測試檔）

| ID | 變異 | 結果 |
| --- | --- | --- |
| M1 | 唔跳空行（舊規則） | 死（9 個測試） |
| M2 | 只跳第一個空行 | 死 |
| M3 | 讀到標籤之後遇空行就完 | 死 |
| M4 | `readLabels` 唔 `trim()` | **存活**（S-287） |
| M5 | 標籤行號差一 | 死 |
| M6 | 歌詞由歌名下一行開始（唔用 `readLabels` 回傳） | 死 |
| M7 | 歌詞開始 +1 | 死 |
| M8 | 空行判斷只認 ASCII 空白 | 存活：**等價 mutant**（`songLines` 已經 `trimEnd`，全形空格行入到嚟已經係 `''`） |
| M9 | migration 變 no-op | 死 |
| M10 | migration 順手改 `updated_at` | 死 |
| M11 | migration 只清一行 | 死 |
| M12 | migration 連 `text_key` 都清 | 死 |
| M13 | migration 清 credit 唔清 ETag | 死 |
| M14 | API 漏咗 parser hints | 死 |

14 個殺 12，M8 係等價。腳本：`/tmp/claude-0/-home-user-r-gram/acff8cc1-40eb-514e-8a3f-b8e552922449/scratchpad/review-songtext-tools/mutants.py`。

## QA 範圍建議

- **S1**：`catalog-song-text`（`parseSongText.ts`、`lines.ts`、測試；`labelHints*` 刪除）、`catalog-core`（`index.ts` 少一個 export）、`api-tracks`（`tracks/songText.ts`）、`api-auth`（`migrations/0002`、`i18n/zh-Hant.ts`）、`api-sync`（`syncFolder.test`、`rereadSongTexts.test`；1-hop：同步經 `songTextFile` 用 parser）、`api-writeback`（`tracksText.test`）
- **S2**（本機，唔好 `--remote`）：用舊規則嘅資料起 D1（或者先用 `0001` + 舊 code 同步）→ `migrate:local` → `wrangler dev` → 同步頁同步擁有人格式嘅佔位檔 → 驗 credit、歌詞、catalog、舊 JSON 刪走、再同步唔讀；管理端 API-041 儲存擁有人格式冇 hint。PWA gate：唔使

```
HANDOFF_RECEIPT
from: code-reviewer
task: fix/song-text-credit-gap (acd625a test, 9188cd5 fix, 2c94714 migration 0002) — labels after blank lines below the title
status: pass
score: 95
hard_gates: { lint: pass, typecheck: pass, tests: pass, coverage: pass, no_critical: pass, security_scan: n/a }
findings: { critical: [], warning: [W-076], suggestion: [S-284, S-285, S-286, S-287, S-288] }
next_action: invoke developer subagent for W-076 option B ① (bump apps/api version to 0.1.1 so /api/health proves the new Worker; one chore commit); optionally S-285 (hidden-character lines) before the one-shot re-read; then QA S1 (chains above) + S2 local; merge; push only after the owner has the safe-step list (no sync until /api/health shows 0.1.1)
owner_decisions: [accept side effect: a lyric whose first line starts with 曲／詞／編／監 + colon becomes a credit; files with the same label twice across a gap now fail (TEXT_INVALID, last good content kept); fold S-285 in now or later (later needs another migration or W-076 option A)]
backlog: [W-076 option A (rules version in text_source_etag), S-284, S-286, S-287, S-288]
report: .proj-docs/reviews/2026-11-27_12-35_review_song-text-credit-gap.md
context: 12/14 mutants killed (M4 pre-existing gap, M8 equivalent). Old-Worker window reproduced in scratch: a sync between migrate and deploy restores ETags with the old parse and later syncs never re-read. No push, no --remote.
```
