# R Gram 項目文件索引

**最後更新**：2026-11-25 00:07

## Specs

| 日期 | 文件 | 狀態 | 摘要 |
| --- | --- | --- | --- |
| 2026-11-24 | [specs/2026-11-24_16-13_functional-spec_r-gram.md](specs/2026-11-24_16-13_functional-spec_r-gram.md) | **v1.3 Approved** | Functional Spec：播放端 PWA + 管理端。v1.2 加歌曲 credit（CR-001）。v1.3 = CR-002 播放端介面定稿：新版面（大碟出界 + 轉盤）、左下角控件（三粒細掣 + 轉碟旋鈕 + ♥）、唱片夾固定 + 空心碟、歌書（合併歌詞同 Info）、播放模式一粒掣、Favourites 碟面、Preload 文字、介面語言（書面語 + i18n，預設繁中，FR-037）、過場動畫（字母盤、歌書、MV 電視，FR-038）；D22–D29 已確認 |
| 2026-11-24 | [specs/2026-11-24_16-50_technical-spec_r-gram.md](specs/2026-11-24_16-50_technical-spec_r-gram.md) | **v1.1 Approved** | Technical Spec：npm workspaces monorepo；Cloudflare Worker + Hono + D1 + R2；31 個 API；6 張表。v1.1 只改 `apps/player`（場景狀態機、幾何資料表、元件、淨空規則測試、i18n、過場動畫）；管理端語言檔改名 `zh-Hant.ts` |

## Plans

| 日期 | 文件 | 狀態 | 摘要 |
| --- | --- | --- | --- |
| 2026-11-25 | [plans/2026-11-25_00-07_implementation-plan_r-gram.md](plans/2026-11-25_00-07_implementation-plan_r-gram.md) | v1.0 Approved | Implementation Plan：可行性（有條件可行）、Phase A–L、任務 T-001–T-095、要用戶做嘅事 U-1–U-10、風險 R-001–R-010、工作量約 77 人日、開始順序 |

## 待辦（阻住開發嘅 mockup）

| 次序 | Mockup | 阻住 |
| --- | --- | --- |
| 1 | 播放端場景 → [`_mockups_/home-turntable/index.html`](../_mockups_/home-turntable/index.html)（source：`src/template.html`，`python3 src/build.py`）。**主頁、轉碟、歌書、播放模式、Favourites 碟：用戶 2026-11-24 已確認（第 12 版）**，已寫入 Functional Spec CR-002。第 13 版加咗歌單、Favourites 歌單、MV 電視；第 14 版：電視照 v16 重畫層次同光暗 + 新電視腳、電視升起／開熄機過場、字母盤過場、介面文字全部改書面語；第 15 版：歌書開關過場、屏幕開熄機加快、電視第二粒旋鈕 icon 改 ◀◀ ▶▶、「尚未收藏歌曲」唔要提示。**第 15 版全部場景用戶 2026-11-25 已確認** | 播放端核心（M2） |
| 2 | P-3 管理端 → [`_mockups_/admin/index.html`](../_mockups_/admin/index.html)（source：`src/template.html`，`python3 src/build.py`）。第 1 版（T-050）：登入、專輯列表、專輯資料、歌曲、掃描結果、歌詞編輯、發佈確認、發佈記錄，**等用戶確認**（A1–A5） | 管理端 UI（Phase E：T-051 起；歌詞編輯器 T-081） |
| 3 | P-5 收藏 + Favourites 碟、P-6 Shuffle / Repeat | M4 |
| 4 | P-1 歌詞、P-2 Info（連歌曲 credit） | M5 |
| 5 | P-7 iPhone Duo → HomeView → 電腦 | M6–M8 |

## 設計來源同資料

| 文件 | 內容 |
| --- | --- |
| [../\_design\_/HANDOFF.md](../_design_/HANDOFF.md) | 設計交接文件（motion preview v16）：設計規則、畫面規格、假設、未解決問題 |
| [../\_mockups\_/r-gram/index.html](../_mockups_/r-gram/index.html) | 播放端動態設計稿（Design Origin） |
| [../apps/api/seed/discography.json](../apps/api/seed/discography.json) | 初始歌單資料：17 張專輯、262 首歌 |
| [../apps/api/seed/credits.json](../apps/api/seed/credits.json) | 歌曲 credit（曲 / 詞 / 編 / 監）：16 張專輯、193 行；由 `_design_/rubberband-credits.html` 用 `_design_/tools/parse_credits.py` 轉出 |
