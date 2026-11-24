# R Gram 項目文件索引

**最後更新**：2026-11-24 17:05

## Specs

| 日期 | 文件 | 狀態 | 摘要 |
| --- | --- | --- | --- |
| 2026-11-24 | [specs/2026-11-24_16-13_functional-spec_r-gram.md](specs/2026-11-24_16-13_functional-spec_r-gram.md) | Approved（v1.2，2026-11-24） | Functional Spec：播放端 PWA（唱片機介面、R2 音檔 / MV、LRC 同步歌詞、收藏歌曲 + Favourites 碟、Shuffle / Repeat、手機 → iPhone Duo → HomeView → 電腦）+ 管理端（Google login、專輯 / 封面 / 歌單 / credit / 歌詞、R2 掃描、發佈）。v1.2 加歌曲 credit |
| 2026-11-24 | [specs/2026-11-24_16-50_technical-spec_r-gram.md](specs/2026-11-24_16-50_technical-spec_r-gram.md) | Approved（2026-11-24；T1–T6 照建議） | Technical Spec v1.0：npm workspaces monorepo（`apps/player`、`apps/admin`、`apps/api`、`packages/catalog`）；Cloudflare Worker + Hono + D1 + R2；31 個 API；6 張表；待確認技術決定 T1–T6 |

## 待辦（阻住開發嘅 mockup）

| 次序 | Mockup | 阻住 |
| --- | --- | --- |
| 1 | P-4 主頁改版 → [`_mockups_/home-turntable/index.html`](../_mockups_/home-turntable/index.html)（source：`src/template.html`，`python3 src/build.py`）。用戶揀咗 B（大碟出界）；第 3 版（2026-11-24）：冇機邊線只留螺絲、圓形掣三粒（歌書／MV／播放模式）、Favourites 改做另一款掣（F1 備用碟／F2 Wheel 心形鍵）、加 Wheel 開咗同 Favourites 碟畫面。**等用戶揀 F1 / F2**；確認後要出 CR-002（歌詞 + Info 合併做歌書、播放模式一粒四個狀態、Favourite 掣改款） | 播放端核心（M2） |
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
