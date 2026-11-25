# R Gram 項目文件索引

**最後更新**：2026-11-25 08:06

## Specs

| 日期 | 文件 | 狀態 | 摘要 |
| --- | --- | --- | --- |
| 2026-11-24 | [specs/2026-11-24_16-13_functional-spec_r-gram.md](specs/2026-11-24_16-13_functional-spec_r-gram.md) | **v1.4**（CR-003；D30–D39 待用戶確認） | Functional Spec：播放端 PWA + 管理端。v1.2 加歌曲 credit（CR-001）。v1.3 = CR-002 播放端介面定稿：新版面（大碟出界 + 轉盤）、左下角控件（三粒細掣 + 轉碟旋鈕 + ♥）、唱片夾固定 + 空心碟、歌書（合併歌詞同 Info）、播放模式一粒掣、Favourites 碟面、Preload 文字、介面語言（書面語 + i18n，預設繁中，FR-037）、過場動畫（字母盤、歌書、MV 電視，FR-038）；D22–D29 已確認。v1.4 = CR-003（用戶 2026-11-25 嘅 14 項決定）：高身手機貼頂／貼底、刻度弧固定、細屏按比例、暫停時唱針升起同歌書留住；管理端冇草稿／發佈／上下架（儲存即生效）、每首歌一個文字框、R Gram 視覺語言（只做淺色）；FR-039、FR-040、FR-120–FR-122；刪 US-108、FR-107、FR-113、FR-116。**D30–D39 待用戶確認（D32 會推翻 C4）** |
| 2026-11-24 | [specs/2026-11-24_16-50_technical-spec_r-gram.md](specs/2026-11-24_16-50_technical-spec_r-gram.md) | **v1.2**（CR-003） | Technical Spec：npm workspaces monorepo；Cloudflare Worker + Hono + D1 + R2；27 個 API（v1.1 係 31 個）；6 張表。v1.1 只改 `apps/player`（場景狀態機、幾何資料表、元件、淨空規則測試、i18n、過場動畫）；管理端語言檔改名 `zh-Hant.ts`。v1.2 = CR-003：每次寫入之後生成 catalog（冇草稿、發佈）、刪 `enabled` 兩欄、`publishes` → `catalog_state`、歌曲文字 API 同 `packages/catalog/song-text`、播放端單一 SVG 畫布、唱臂三個姿勢、刻度弧固定；列出已完成 code 受影響嘅檔（T-029、T-042、T-096） |

## Plans

| 日期 | 文件 | 狀態 | 摘要 |
| --- | --- | --- | --- |
| 2026-11-25 | [plans/2026-11-25_00-07_implementation-plan_r-gram.md](plans/2026-11-25_00-07_implementation-plan_r-gram.md) | v1.1（CR-003；v1.0 用戶 2026-11-25 批准） | Implementation Plan：可行性（有條件可行）、Phase A–L、任務 T-001–T-096（取消 T-054、T-080、T-081；新增 T-029、T-042、T-043、T-096）、要用戶做嘅事 U-1–U-12、風險 R-001–R-014、工作量約 80.5 人日、進度表、開始順序。待用戶確認：A-7、A-8 |

## Reviews

| 日期 | 文件 | 結果 | 範圍 |
| --- | --- | --- | --- |
| 2026-11-25 | [reviews/2026-11-25_00-23_review_T-001_T-002.md](reviews/2026-11-25_00-23_review_T-001_T-002.md) | warn 85 / 100（W-001–W-003） | T-001 scaffold、T-002 `packages/catalog` |
| 2026-11-25 | [reviews/2026-11-25_00-33_review_T-001_T-002_re-review.md](reviews/2026-11-25_00-33_review_T-001_T-002_re-review.md) | pass 100 / 100 | 同上（修正後） |
| 2026-11-25 | [reviews/2026-11-25_02-43_review_T-030.md](reviews/2026-11-25_02-43_review_T-030.md) | warn 80 / 100（W-004–W-007） | T-030 播放端基礎 |
| 2026-11-25 | [reviews/2026-11-25_02-58_review_T-030_re-review.md](reviews/2026-11-25_02-58_review_T-030_re-review.md) | pass 100 / 100 | 同上（修正後） |
| 2026-11-25 | [reviews/2026-11-25_03-08_review_T-020_T-021.md](reviews/2026-11-25_03-08_review_T-020_T-021.md) | pass 95 / 100（W-008，已修） | T-020 Worker scaffold、T-021 登入 |
| 2026-11-25 | [reviews/2026-11-25_06-19_review_T-032_T-033.md](reviews/2026-11-25_06-19_review_T-032_T-033.md) | warn 85 / 100（W-009–W-011） | T-032 場景狀態機、T-033 唱片機基本元件（SVG） |
| 2026-11-25 | [reviews/2026-11-25_07-53_review_T-032_T-033_re-review.md](reviews/2026-11-25_07-53_review_T-032_T-033_re-review.md) | pass 100 / 100 | 同上（修正後）。S-035、S-039–S-042 同 Observation 入咗 backlog B-024–B-033 |

## QA

| 日期 | 文件 | 結果 | 範圍 |
| --- | --- | --- | --- |
| 2026-11-25 | [qa/2026-11-25_00-40_qa_catalog-core.md](qa/2026-11-25_00-40_qa_catalog-core.md) | S1 pass（AC-1–AC-9） | 鏈 `catalog-core`：T-001、T-002。Frozen plan：[qa/plans/catalog-core.md](qa/plans/catalog-core.md)；ledger：`qa/verification-ledger.tsv` |
| 2026-11-25 | [qa/2026-11-25_03-25_qa_player-foundation.md](qa/2026-11-25_03-25_qa_player-foundation.md) | S1 pass（AC-1–AC-6） | 鏈 `player-foundation`：T-030。Frozen plan：[qa/plans/player-foundation.md](qa/plans/player-foundation.md) |
| 2026-11-25 | [qa/2026-11-25_03-25_qa_api-auth.md](qa/2026-11-25_03-25_qa_api-auth.md) | S1 pass（AC-1–AC-9；一條 Minor 入 backlog B-020） | 鏈 `api-auth`：T-020、T-021。Frozen plan：[qa/plans/api-auth.md](qa/plans/api-auth.md) |
| 2026-11-25 | [qa/2026-11-25_03-25_qa_repo-scaffold_catalog-core.md](qa/2026-11-25_03-25_qa_repo-scaffold_catalog-core.md) | S1 pass | 新鏈 `repo-scaffold`（根設定檔、CI）；`catalog-core` 重驗。Frozen plans：[qa/plans/repo-scaffold.md](qa/plans/repo-scaffold.md) |
| 2026-11-25 | [qa/2026-11-25_08-16_qa_player-core.md](qa/2026-11-25_08-16_qa_player-core.md) | S1 pass（AC-1–AC-6；冇阻擋性問題，一條 Observation 入 backlog B-034） | 新鏈 `player-core`：T-032、T-033；`player-foundation` 受影響嘅 AC-1／3／5／6 重驗。Frozen plan：[qa/plans/player-core.md](qa/plans/player-core.md) |

Backlog：[backlog.md](backlog.md)

## 待辦（阻住開發嘅 mockup）

| 次序 | Mockup | 阻住 |
| --- | --- | --- |
| 1 | 播放端場景 → [`_mockups_/home-turntable/index.html`](../_mockups_/home-turntable/index.html)（source：`src/template.html`，`python3 src/build.py`）。**主頁、轉碟、歌書、播放模式、Favourites 碟：用戶 2026-11-24 已確認（第 12 版）**，已寫入 Functional Spec CR-002。第 13 版加咗歌單、Favourites 歌單、MV 電視；第 14 版：電視照 v16 重畫層次同光暗 + 新電視腳、電視升起／開熄機過場、字母盤過場、介面文字全部改書面語；第 15 版：歌書開關過場、屏幕開熄機加快、電視第二粒旋鈕 icon 改 ◀◀ ▶▶、「尚未收藏歌曲」唔要提示。**第 15 版全部場景用戶 2026-11-25 已確認**。**第 16 版（CR-003，commit `e6f367c`）等用戶確認**：刻度弧固定（4、9、17、24、30 張示範）、暫停時唱針升起而唱臂留喺碟上面、歌書開住時暫停 | 第 16 版阻 T-036、T-038、T-042、T-072；其餘播放端任務唔受阻 |
| 2 | P-3 管理端 → [`_mockups_/admin/index.html`](../_mockups_/admin/index.html)（source：`src/template.html`，`python3 src/build.py`）。第 1 版：用戶 2026-11-25 **因為風格否決**（太似 903-player；A1–A5 已由 CR-003 決定 6、7、9、10 回答）。**第 2 版（T-050 重開，commit `d60b02b`）等用戶確認**：R Gram 風格（鋁面板、螺絲、專輯以碟呈現、儀錶統計）、儲存即生效、每首歌一個文字框；冇發佈、發佈記錄、歌詞編輯畫面。D37 確認後要跟住改（`副題：` 行、文字框下面嘅細控件） | 管理端 UI（Phase E：T-051 起） |
| 3 | ~~P-5 收藏 + Favourites 碟、P-6 Shuffle / Repeat~~：已併入播放端場景稿（CR-002，已確認） | — |
| 4 | ~~P-1 歌詞、P-2 Info~~：已併入歌書（CR-002，已確認）。純文字歌詞嘅畫面（Functional Spec D32、D38）要 D32 確認之後先加 | T-082 嘅純文字部分 |
| 5 | P-7 iPhone Duo → HomeView → 電腦 | M6–M8 |

## 設計來源同資料

| 文件 | 內容 |
| --- | --- |
| [../\_design\_/HANDOFF.md](../_design_/HANDOFF.md) | 設計交接文件（motion preview v16）：設計規則、畫面規格、假設、未解決問題 |
| [../\_mockups\_/r-gram/index.html](../_mockups_/r-gram/index.html) | 播放端動態設計稿（Design Origin） |
| [../apps/api/seed/discography.json](../apps/api/seed/discography.json) | 初始歌單資料：17 張專輯、262 首歌 |
| [../apps/api/seed/credits.json](../apps/api/seed/credits.json) | 歌曲 credit（曲 / 詞 / 編 / 監）：16 張專輯、193 行；由 `_design_/rubberband-credits.html` 用 `_design_/tools/parse_credits.py` 轉出 |
