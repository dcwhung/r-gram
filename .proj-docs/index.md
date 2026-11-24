# R Gram 項目文件索引

**最後更新**：2026-11-24 23:18

## Specs

| 日期 | 文件 | 狀態 | 摘要 |
| --- | --- | --- | --- |
| 2026-11-24 | [specs/2026-11-24_16-13_functional-spec_r-gram.md](specs/2026-11-24_16-13_functional-spec_r-gram.md) | v1.2 Approved；**v1.3（CR-002）等確認** | Functional Spec：播放端 PWA + 管理端。v1.2 加歌曲 credit（CR-001）。v1.3 = CR-002 播放端介面定稿：新版面（大碟出界 + 轉盤）、左下角控件（三粒細掣 + 轉碟旋鈕 + ♥）、唱片夾固定 + 空心碟、歌書（合併歌詞同 Info）、播放模式一粒掣、Favourites 碟面、Preload 文字；D22–D28 待確認 |
| 2026-11-24 | [specs/2026-11-24_16-50_technical-spec_r-gram.md](specs/2026-11-24_16-50_technical-spec_r-gram.md) | v1.0 Approved；**v1.1（跟 CR-002）等確認** | Technical Spec：npm workspaces monorepo；Cloudflare Worker + Hono + D1 + R2；31 個 API；6 張表。v1.1 只改 `apps/player`（場景狀態機、幾何資料表、元件、淨空規則測試） |

## 待辦（阻住開發嘅 mockup）

| 次序 | Mockup | 阻住 |
| --- | --- | --- |
| 1 | 播放端場景 → [`_mockups_/home-turntable/index.html`](../_mockups_/home-turntable/index.html)（source：`src/template.html`，`python3 src/build.py`）。**主頁、轉碟、歌書、播放模式、Favourites 碟：用戶 2026-11-24 已確認（第 12 版）**，已寫入 Functional Spec CR-002。第 13 版加咗歌單、Favourites 歌單、MV 電視，**等用戶確認** | 播放端核心（M2） |
| 2 | P-3 管理端 → `_mockups_/admin/` | 管理端 UI（M1 嘅 UI 部分） |
| 3 | P-5 收藏 + Favourites 碟、P-6 Shuffle / Repeat | M4 |
| 4 | P-1 歌詞、P-2 Info（連歌曲 credit） | M5 |
| 5 | P-7 iPhone Duo → HomeView → 電腦 | M6–M8 |

## 設計來源同資料

| 文件 | 內容 |
| --- | --- |
| [../\_design\_/HANDOFF.md](../_design_/HANDOFF.md) | 設計交接文件（motion preview v16）：設計規則、畫面規格、假設、未解決問題 |
| [../\_mockups\_/r-gram/index.html](../_mockups_/r-gram/index.html) | 播放端動態設計稿（Design Origin） |
| [../data/discography.json](../data/discography.json) | 初始歌單資料：17 張專輯、262 首歌 |
| [../data/credits.json](../data/credits.json) | 歌曲 credit（曲 / 詞 / 編 / 監）：16 張專輯、193 行；由 `_design_/rubberband-credits.html` 用 `_design_/tools/parse_credits.py` 轉出 |
