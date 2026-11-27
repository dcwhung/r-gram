# QA — 歌曲文字：歌名之後隔空行嘅曲詞編監照認做標籤＋ migration 0002（fix/song-text-credit-gap）— 2026-11-27 — S1（+ S2 本機）

- Tier: T2 | Commit: `c5a1c78`（branch 未 merge；`4bde20b..c5a1c78`：`acd625a`、`9188cd5`、`2c94714`、`745d854`、`48fe6d8`、`77935ac`、`3c13623`、`c5a1c78`）| Verdict: **✅ pass**
- 基準：擁有人決定 2026-11-27「曲詞編監應該要認 prefix」（擁有人格式：歌名／空行／曲詞編監／空行／歌詞；接受副作用：歌詞第一行以曲／詞／編／監 + 冒號開頭 = credit；同一標籤隔空行兩次 = `DUPLICATE_LABEL`）；FS D31、D72；TS API-004、API-034、API-041；review `reviews/2026-11-27_12-35_review_song-text-credit-gap.md`（連覆核，W-076 方案 B ① 已修）
- Ledger（`impact --since 4bde20b`）: SKIP 20 / REVERIFY 7（`catalog-song-text`、`catalog-core`、`api-tracks`、`api-auth`、`api-sync`、`api-writeback`、`repo-scaffold`（淨係 `package-lock.json` version 一行））/ UNCOVERED 2（`0002_reread_song_texts.sql` → `api-auth`；`rereadSongTexts.test.ts` → `api-sync`，S-288）
- SKIP（frozen，冇驗）：`admin-sync`、`api-albums`、`api-assets`、`api-catalog`、`seed-tools`、`player-*`（15 條）
- Plans：`catalog-song-text` 加 AC-9（標籤段規則、S-285、S-287、`labelHints` 拎走），AC-2／AC-6 註明；`api-tracks` AC-4（hints 只剩 `SUBTITLE_IGNORED`）；`api-sync` 加 AC-12（0002 重新讀取）同 scope `rereadSongTexts`；`api-auth` AC-7（`0.1.1`）、加 AC-12（migration）。Freeze 後 `impact` = 全部 SKIP，淨係兩個已刪檔（`labelHints*.ts`）以 UNCOVERED 列出（刪咗嘅檔，ledger 冇佢哋 = 啱）

## Runs（branch worktree；S2 喺 `git archive` 副本；證據 `/tmp/claude-0/-home-user-r-gram/acff8cc1-40eb-514e-8a3f-b8e552922449/scratchpad/qa-songtext/`）
| Command | Result | Time |
| --- | --- | --- |
| `npm run lint` / `npm run typecheck` | exit 0 / exit 0 | 18 s / 12 s |
| `npm run coverage` | exit 0；247 檔 3235 / 3235；98.41 / 93.36 / 98.31 / 99.30；`parseSongText.ts` 100 / 97.77、`lines.ts` 100 / 92、`tracks/songText.ts` 96 / 83.33 | 109 s |
| `npm run build -w apps/player` / `-w apps/admin` | exit 0 / exit 0 | 10 s / 3 s |
| `npm run check:deploy -w apps/api` | exit 0（「deploy settings OK」） | < 1 s |
| `npx vitest run --project @r-gram/repo-scripts`（`repo-scaffold` plan） | exit 0；64 / 64 | 3 s |
| `probe.mjs`（esbuild bundle 新 `@r-gram/catalog`；預期由擁有人決定同 AC 寫） | 17 / 17 | < 1 s |
| `diff.mjs`（新舊 parser；seed 291 首 × 5 種歌詞，`formatSongText` 砌） | 1455 個入面 1164 一樣；291 個唔同全部係「歌詞第一行 `曲：…`」嗰種（接受咗嘅副作用），其他 4 種 0 差異 | < 1 s |
| S2：舊 code `4bde20b` 同新 code `c5a1c78` 用同一個 `--persist-to` state；`wrangler d1 migrations apply --local`、`wrangler r2 object put --local`、`wrangler dev --local-protocol https --port 8791` | 見下面 | 5 分鐘 |

## 驗收
| AC | 結果 | 證據 |
| --- | --- | --- |
| `catalog-song-text` AC-9 | ✅ | probe P1–P17：擁有人格式 4 項 credit、歌詞由「第一句」起；多個空行；歌詞入面「詞：」照當歌詞；`曲目：`／`作曲：` 唔係標籤；ZWSP／ZWJ + 空格／WJ 行當空行；行頭零寬字元嘅標籤照認、重覆報第 4 行；半形、全形、tab 縮排；CRLF + BOM 嘅 `CREDIT_TOO_LONG` 第 4 行；`[offset:]` 同步歌詞；`MIXED_TIMESTAMPS` 第 6 行；擁有人格式 round trip |
| `catalog-song-text` AC-6 例外（S-284） | ✅ | `diff.mjs`：只有第一行似標籤嘅歌詞會變（冇 credit = 變 credit；有 credit = `DUPLICATE_LABEL`） |
| `api-auth` AC-12 | ✅ | 舊 code 只有 0001；新 code `migrations apply --local` 只套 `0002_reread_song_texts.sql` ✅，再行「No migrations to apply」；`d1_migrations` = 0001、0002；6 首 `text_source_etag` 全部 NULL，credit、`text_key`、`updated_at` 同套之前一樣 |
| `api-auth` AC-7 | ✅ | 舊 Worker `/api/health` `0.1.0`；新 Worker `0.1.1` |
| `api-sync` AC-12（S2） | ✅ | 舊 code 同步擁有人格式：第 1、4、6 首冇 credit、標籤行入咗歌詞；第 2 首（同步歌詞）`TEXT_INVALID` `MIXED_TIMESTAMPS`（同一個問題，冇匯入）。套 0002 → 新 code 同步：`updated` 1、2、3、4、6，第 1 首 4 項 credit、歌詞「第一句⏎第二句⏎⏎第三句」；第 2 首同步歌詞 `t` 1000／5000；第 4 首（ZWSP 行、全形縮排、行頭 ZWSP）2 項 credit；第 6 首歌詞入面「詞：這是歌詞」照留；第 5 首（`曲：` 隔空行兩次）`TEXT_INVALID` `DUPLICATE_LABEL` 第 4 行，D1 保留上次內容。`catalog.json` 同 D1 一致；舊歌詞 JSON 三個 404，仲有歌用嘅（第 3、4 首共用、第 5 首）留住；再同步：`added`／`updated` 空、`unchanged` 6、冇生成 catalog、ETag 不變 |
| `api-tracks` AC-4／`api-writeback`（S2） | ✅ | API-041 儲存擁有人格式（第 5 首）：200、`hints: []`、4 項 credit、`checks: []`；bucket 檔 LF、冇 BOM；有 `副題：` 嘅（第 6 首）= 只有 `SUBTITLE_IGNORED`（第 2 行）；之後冇人用嘅舊 JSON 刪咗 |

## Hard Gates
all pass（Tests、Coverage（改過嘅檔 ≥ 80 %）、冇 blocking finding；Security / Data：S2 證實同步唔寫 bucket（只 `.txt` 經 API-041 寫）、舊內容唔失；PWA：n/a；Performance：同 review 操作數估算，冇改）

## Findings
- 冇 🔴 / 🟡。冇 CUI ticket
### 🟢 / Observation
- Observation：`wrangler dev` 起動時試過攞 `Request.cf`（wrangler 內建，連 Cloudflare 公開嘅 `cf.json`），兩次都「Request was cancelled」，用預設值；冇帳戶、冇資料、冇 `--remote`。以後本機跑要先 set `CLOUDFLARE_CF_FETCH_ENABLED=false`（今次 `wrangler dev` 嗰兩個 shell 漏咗）
- Observation：重新讀取之後，新規則出錯嘅檔（例如同一標籤隔空行兩次）ETag 唔記低，每次同步都會再讀同再出 `TEXT_INVALID`，直到擁有人改檔（原有行為，review 已記）
- Observation：主 checkout 喺 merge 之前，`qa-ledger.sh status` 會將呢 7 條鏈報 STALE（ledger 記嘅係 branch `c5a1c78` 嘅 hash）；merge 之後就 FROZEN。`git merge-tree` 對而家 `claude/charming-cannon-8yulp0` HEAD 冇衝突（main 嗰邊 `4bde20b` 之後只改 `apps/player` 同文件）
- 部署：W-076 ② 照 review「擁有人安全步驟」：push 之前關同步頁，`/api/health` 見到 `0.1.1` 先同步

## 建議補測
- S-289（review 已列，backlog）：S-285 三個邊界各加一個斷言；QA probe P6、P7 已經行過，行為正確

```handoff-receipt
from: quality-assurance
stage: S1 (+ S2 local)
task: fix/song-text-credit-gap @c5a1c78 (labels after blank lines below the title, migration 0002, version 0.1.1, S-284/S-285/S-287)
status: pass
hard_gates: { lint: pass, typecheck: pass, tests: pass (3235/3235), coverage: pass (98.41 stmts; parseSongText 100, tracks/songText 96), builds: pass (player, admin), check_deploy: pass, no_blocking_finding: pass, pwa_update: n/a, security_data: pass }
findings: { critical: [], warning: [], suggestion: [], observation: 3 }
frozen: [catalog-song-text, catalog-core, api-tracks, api-auth, api-sync, api-writeback, repo-scaffold] S1 @c5a1c78
next_action: main agent commits .proj-docs/qa/** (report, 4 plans, ledger), merges fix/song-text-credit-gap; push only with the owner safe-step list (no sync until /api/health shows 0.1.1)
report: .proj-docs/qa/2026-11-27_12-55_qa_song-text-credit-gap.md
context: "S2 local: old code synced owner-format placeholders (credits lost) -> 0002 via migrations apply --local -> new code sync fixed credits/lyrics/catalog, dropped 3 old lyric JSONs, second sync read nothing; API-041 save has no hint. Placeholders only, no --remote; wrangler dev tried the Request.cf fetch (cancelled)."
```
