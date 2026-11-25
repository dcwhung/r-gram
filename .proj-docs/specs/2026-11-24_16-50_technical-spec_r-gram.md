# Technical Spec：R Gram（播放端 PWA + 內容管理 Backend）

**版本**：v1.3
**日期**：2026-11-25 12:40（v1.2：2026-11-25 08:06；v1.1 Approved：2026-11-25 00:07；v1.1 補二：00:01；v1.1 補一：2026-11-24 23:52；v1.0：2026-11-24 16:50；v1.1 初稿：23:18）
**作者**：Architect Agent（v1.2、v1.3：Project Manager Agent 跟 CR-003、CR-004 同步；標明「由 T-xxx 定案」嘅技術細節留畀嗰個任務）
**關聯 Functional Spec**：v1.5（包括 CR-001 歌曲 credit、CR-002 播放端介面定稿、CR-003 管理端儲存即生效同歌曲文字框、CR-004 掃描範圍、媒體 bucket、資料夾命名、字體、內容資料）`2026-11-24_16-13_functional-spec_r-gram.md`
**狀態**：**v1.3**（CR-004）。跟用戶 2026-11-25 嘅 5 項決定（已確認）更新：掃描連封面來源同歌曲文字檔、媒體 bucket `rb-discography`、資料夾名 `<類別>-<NN>-<id>`、字體來源、內容資料 21 個發行／291 首歌；並回寫專輯、歌曲、封面 API 開發時定落嚟嘅細節（見「CR-004 對技術設計嘅影響」）。對應 Functional Spec D43（短名串法）、D44（`type` 欄）、D47、D48、D49 嘅部分**待用戶確認**；標「T-xxx 定案」嘅係技術做法。**以下係 v1.2（CR-003）嘅狀態，仍然有效**：跟用戶 2026-11-25 嘅 14 項決定（已確認）更新。對應 Functional Spec D30–D39 嘅設計：**用戶 2026-11-25 已確認 D30、D31、D32、D34、D36–D39**（「嗰 8 條跟建議」；D31 由已確認嘅決定 8 加 D32、D37 完全決定）；D33（儲存欄位）係技術決定，唔使用戶確認；D35（統計項目）等管理端設計稿第 2 版確認。**播放端設計稿第 17 版用戶 2026-11-25 已確認**（包埋第 16 版嘅內容；對應嘅技術設計見「播放端設計稿第 17 版嘅技術設計」）。管理端設計稿第 2 版同 Implementation Plan A-7、A-8 仍然等用戶確認，靠佢哋嘅任務唔開工。v1.1 用戶 2026-11-25 已確認。之後改動要行 Change Request

**參考實作**：`dcwhung/903-player`（commit `38a6176`）。下面寫「同 903-player」嘅地方，即係做法已經喺嗰個 repo 行緊，可以直接參考對應檔案。

---

## 架構概覽

```
┌─────────────────────────┐        ┌──────────────────────────────────────────┐
│ 播放端 PWA（apps/player）│        │ Cloudflare Worker「r-gram-api」（apps/api）│
│ React + Vite，靜態寄存   │        │ Hono                                      │
│                         │ GET    │  /catalog/v1/*   公開，CORS 限播放端網域   │
│  catalog loader ────────┼───────►│  /auth/*         Google login             │
│  <audio> / <video> ─┐   │        │  /api/*          管理 API（要 session）    │
└─────────────────────┼───┘        │  其餘路徑        Admin SPA 靜態檔          │
                      │            └───────┬──────────────┬───────────────┬────┘
                      │ Range GET          │              │               │
                      ▼                    ▼              ▼               ▼
            ┌──────────────────┐   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
            │ R2 rb-discography│◄──┤ list / get  │ │ D1「r-gram」 │ │ R2「r-gram- │
            │ 公開網址          │   │（掃描）     │ │ 內容 SSoT    │ │ catalog」   │
            │ <類別-NN-id>/檔案 │   └─────────────┘ └─────────────┘ │ private     │
            └──────────────────┘                                   │ catalog.json│
                      ▲                                            │ img/ lyrics/│
                      │ 用戶用 Cloudflare 介面 / 工具直接上載       └─────────────┘
```

| 層 | 職責 |
| --- | --- |
| `apps/player` | 唱片機介面、播放、歌詞、MV、收藏、播放模式；只讀 catalog；所有個人狀態存本機 |
| `apps/admin` | 管理介面 SPA；由同一個 Worker 以靜態檔形式出，同管理 API 同源 |
| `apps/api` | 認證、管理 API、R2 掃描、圖片上載、每次儲存之後生成 catalog（CR-003）、對外出 catalog / 圖 / 歌詞 |
| `packages/catalog` | 純邏輯、冇 build step：catalog 型別同 validator、LRC parser、歌曲文字 parser 同回填（CR-003）、掃描配對規則、Wheel 字母規則、顏色計算。三個 app 共用，保證「管理端驗得過 = 播放端讀得到」 |
| D1 | 內容嘅唯一來源（SSoT）；session；catalog 生成狀態（CR-003：冇草稿、冇發佈記錄） |
| R2 `r-gram-catalog` | 而家生效嘅 `catalog.json`、封面圖、歌詞 JSON；private，只經 Worker 出 |
| R2 `rb-discography`（⚠️ CR-004；之前叫 `r-gram-media`） | 媒體 bucket：每張專輯一個資料夾（`<類別>-<NN>-<id>`），放音檔、MV 檔、封面來源（`cover.jpg｜png`）同歌曲文字檔（`NN 名.txt`）；可選 `_fonts/`。公開網址直接串流；Worker 只 list / head / get（掃描時讀文字檔），**唔寫** |

**核心原則**

1. **儲存即生效**（⚠️ CR-003 取代「草稿同已發佈分開」）：管理端每個成功嘅寫入請求之後，Worker 即刻由 D1 重新生成 `catalog.json`。播放端永遠只讀 `catalog.json`：佢一定係通過 validator 嘅完整檔，生成失敗就保留上一份。
2. **內容檔案以內容 hash 命名**（封面、歌詞）：永久 cache，換內容 = 換檔名，冇 cache 失效問題。
3. **版面數字係資料唔係 code**：每種裝置一份幾何資料表，元件只讀表。主頁改版（Functional Spec P-4）同加裝置都唔使改元件邏輯。
4. **大檔唔經 Worker**：音檔 / MV 由 R2 公開網址直出（支援 Range），避開 Worker 請求大細同 CPU 限制。

---

## Tech Stack

版本跟 903-player 現用版本，減少兩個 project 之間嘅差異。

| 層級 | 技術 | 版本 | 選擇原因 |
| --- | --- | --- | --- |
| Monorepo | npm workspaces | npm 10+ / Node 22 | 同 903-player；`apps/*` + `packages/*` |
| 語言 | TypeScript | ^6.0 | 同 903-player；strict |
| 播放端 UI | React + Vite | ^19.3 / ^8.3 | 同 903-player |
| 播放端 PWA | vite-plugin-pwa（Workbox） | ^2.0 | 同 903-player；`registerType: 'prompt'` 自己控制更新時機 |
| 播放端繪圖 | DOM + inline SVG + CSS transform；旗幟用 `<canvas>` 2D | — | HANDOFF 建議；有 accessibility；GPU 合成層做轉動 |
| 播放端狀態 | React `useReducer` + context（唔加狀態庫） | — | 場景係一個細狀態機；少一個依賴 |
| 管理端 UI | React + Vite + react-router-dom | ^19.3 / ^8.3 / ^7.18 | 同 903-player `apps/admin` |
| 管理端元件 | lucide-react、@dnd-kit、@jsquash/webp | ^1.71 / ^6.3 / ~1.5 | 同 903-player：icon、拖動排序、瀏覽器入面轉 WebP（Safari canvas 唔識輸出 WebP） |
| Backend | Cloudflare Workers + Hono | wrangler ^4 / hono ^4.13 | 同 903-player |
| 資料庫 | Cloudflare D1（SQLite） | — | 同 903-player；資料量細（幾百行） |
| 檔案儲存 | Cloudflare R2 | — | 用戶指定 |
| 認證 | Google OAuth 2.0（Authorization Code + PKCE）+ 自家 session | — | 用戶指定（Functional Spec C3）；同 903-player |
| Unit test | Vitest（Worker 用 `@cloudflare/vitest-plugin` 喺 workerd 跑） | ^5.0 / ^1.6 | 同 903-player |
| E2E | Playwright | ~1.63 | 同 903-player；雲端 sandbox 用 `executablePath`（SK-023） |
| Lint / format | ESLint + Prettier（`tabWidth=4`、`singleQuote`、`trailingComma`、`printWidth=100`） | ^10 / ^3.9 | 團隊規則 |
| 字體 | Rokkitt（`@fontsource/rokkitt`）、Noto Sans HK（`@fontsource/noto-sans-hk`，按 unicode-range 分片） | ^5.3 | 開源、隨 app 提供。⚠️ CR-004（Functional Spec D45 取代 D18）：slab 字體次序 = `local()` Lubalin Graph → 媒體 bucket 字體 URL（build 時可選設定）→ 內建 Rokkitt；商業字體檔唔入 repo。而家 `apps/player` 未有任何字體依賴（backlog B-054），由 T-044 加 |
| 播放端寄存 | Vercel | — | 🅣 T1：同 903-player；private repo 都用到 |
| CI/CD | GitHub Actions | — | 同 903-player：`ci.yml`、`deploy-api.yml` |

**新依賴守則**：引入前跑 `npm audit`；唔用 GPL。上表全部已喺 903-player 用緊。

---

## 系統架構

### Repo 結構

```
r-gram/
├── apps/
│   ├── player/                 播放端 PWA（version SSoT：apps/player/package.json）
│   ├── admin/                  管理端 SPA
│   └── api/                    Worker（version：apps/api/package.json；admin 顯示呢個版本）
│       ├── migrations/         D1 migration（0001_init.sql…）
│       ├── seed/               discography.json、credits.json（由 data/ 搬入嚟）+ 預設專輯色
│       └── scripts/            seed.mjs
├── packages/
│   └── catalog/                共用純邏輯
├── _mockups_/                  畫面 preview（deploy / prettier ignore）
├── _design_/                   設計原圖、HANDOFF.md、原始歌單頁
├── .proj-docs/                 spec / plan / review / QA
├── .github/workflows/          ci.yml、deploy-api.yml
├── package.json                workspaces + root scripts（dev / build / test / lint / e2e）
├── vitest.config.ts            projects：player、admin、catalog、api
└── vercel.json                 build apps/player；feature branch 唔部署；cache header
```

`data/discography.json`、`data/credits.json` 喺 scaffold 時搬去 `apps/api/seed/`（「app / script 會讀嘅檔放 app 自己 folder」）；`data/rubberband-discography.html` 搬去 `_design_/`（`_design_/rubberband-credits.html` 同轉檔 script `_design_/tools/parse_credits.py` 已經喺度）。⚠️ CR-004：兩個來源檔有新版（2026-11-25）；`discography.json` 而家冇生成佢嘅 script，T-097 要補，之後兩個 seed 檔都由 `_design_/tools/` 生成，唔人手改。

### 組件圖：`packages/catalog`

| 模組 | 內容 | 邊個用 |
| --- | --- | --- |
| `schema/` | `CatalogDocument`、`Album`、`Track` 型別；`parseCatalogDocument()` validator；id 格式規則。⚠️ CR-004：專輯加 `category`、`categoryNo`；`RELEASE_CATEGORIES`（六個短名）同 `expectedFolder(category, categoryNo, id)`（放呢度定係獨立模組由 T-098 定） | api（生成 catalog 時驗、計資料夾名）、player（載入時驗）、admin（顯示預期資料夾名）、seed |
| `lrc/` | `parseLrc(text) → { lines, errors }`；`toLyricsJson()`（⚠️ CR-003：歌詞 JSON 加 `synced`；純文字歌詞見 Functional Spec D32，已確認） | `song-text/`（歌詞部分交畀佢）、api、admin |
| `song-text/`（⚠️ CR-003 新增） | `parseSongText(text) → { title, subtitle, credits, lyrics, errors }`；`formatSongText(song) → text`（回填用；兩者要 round-trip）。格式：Functional Spec D31、D37（已確認） | api（儲存時驗 + 拆欄）、admin（即時逐行驗證、回填） |
| `scan/` | `matchMediaFiles(keys, tracks) → { matched, unmatchedFiles, tracksWithoutAudio, conflicts }`。⚠️ CR-004：分類加封面來源（`cover.jpg｜png`）同歌曲文字檔（`NN 名.txt`），輸出加 `cover`、`songTexts`（函數名同輸出形狀由 T-025 定案） | api（掃描）、test |
| `wheel/` | `wheelKeyFor(title)`：英文名第一個字母（忽略 `¿` 等符號）、中文名第一個字 | api（預設值）、admin |
| `color/` | `dominantColor(pixels)`、`glowColor(hex)`（由 mockup `template.html` / `anim.js` 移植） | admin（上載封面時抽色）、player（著燈色） |

### 組件圖：`apps/player`

```
src/
├── app/            App.tsx、stageReducer.ts（場景狀態機）、TurntableShell.tsx（暫時外殼，T-035 取代）、providers
├── config/         layout.ts（裝置 media query 常數）、motion.ts（時長 token）、storageKeys.ts、limits.ts
├── catalog/        loader.ts（fetch + 驗證 + 本機 cache）、selectors.ts
├── stage/          Stage.tsx（按比例縮放舞台）、StageSvg.tsx（單一 SVG 畫布，貼頂 / 貼底兩組；CR-003）、geometry.ts（幾何純函數）、fitStage.ts、safeArea.ts、layouts/<mode>.ts（幾何資料表）、useLayoutMode.ts
├── components/     flag/ metal/（SvgDefs、Screws、車床紋）platter/ disc/ spindle/ tonearm/ metal-button/ icons/ knob/ dial-ring/ tracklist/ info-block/ booklet/ tv/ rotate-notice/
│                   （CR-002 + CR-003：場景零件全部係 React SVG 元件；wheel/、lyrics/、info-panel/ 已刪）
├── playback/       audioEngine.ts、queue.ts（純函數）、playModes.ts、mediaSession.ts、resume.ts
├── mv/             videoEngine.ts、volumeGain.ts（Web Audio）
├── favourites/     store.ts、favouritesAlbum.ts（由收藏砌出虛擬專輯）
├── lyrics/         loader.ts、activeLine.ts；第 17 版：歌詞斷行同長行策略嘅純函數（`wrapLine`、`fitLyricLine`；檔名由 T-082 定案）
├── pwa/            updateManager.ts
├── styles/         tokens.css、global.css；CR-004：fonts.css（`@font-face`：local Lubalin Graph → bucket 字體 URL → 內建 Rokkitt；T-044）
├── i18n/           zh-Hant.ts（語言檔）、t.ts、locale.ts、writtenChinese.test.ts（CR-002：FR-037）
└── utils/          motion.ts（prefersReducedMotion）、format.ts
```

**場景狀態機**（`stageReducer.ts`）

| 狀態 | 值 |
| --- | --- |
| `scene` | `preload` → `home` ⇄ `discChange`；`home` ⇄ `list`；`discChange` → `list`（Functional Spec D27：轉碟中㩒碟面直接入歌單）。⚠️ CR-002 / CR-003 同步 T-032 嘅實作；之前寫 `home ⇄ wheel → list → home` |
| `overlay` | `null`｜`mv`｜`booklet`（只喺 `scene = home` 有；兩個互斥）。暫停 / 繼續係播放 store 嘅事，唔改 `overlay`：歌書開住時暫停，歌書留住（⚠️ CR-003 決定 5） |
| `viewAlbumId` | 畫面顯示緊嘅碟（可以同播緊嘅碟唔同，Functional Spec D13） |
| `previousAlbumId` | 去 Favourites 碟之前嗰隻真專輯：再㩒 ♥ 返去（⚠️ CR-003 同步：T-032 已做） |
| `selectedTrackId` | 歌單揀中 / 左上顯示嘅歌 |
| 播放狀態（獨立 store） | `idle`｜`loading`｜`playing`｜`paused`｜`error` + `queue`、`currentTrackId`、`positionSec`、`durationSec` |

衍生狀態唔另外存：唱臂姿勢、碟轉唔轉、掣停唔停用都由上面計出嚟。

**唱臂姿勢**（⚠️ CR-003 決定 11 取代「播放針位置 = `playing` 而且 `overlay ≠ mv` 而且 `viewAlbumId` = 播緊嘅碟」）：

| 姿勢 | 條件 |
| --- | --- |
| `playing`（落針 99°，小燈著） | 播放狀態 `playing`，`overlay ≠ mv`，`viewAlbumId` = 播緊嘅碟 |
| `lifted`（升針：角度唔變，成支臂放大少少、落影移遠；設計稿第 17 版 `ARM_LIFT`，由第 16 版起） | 播放狀態 `paused` 而且係用戶㩒唱片夾暫停，`overlay ≠ mv`，`viewAlbumId` = 停低嗰隻碟 |
| `parked`（泊位 176°） | 其餘：未揀歌、`overlay = mv`、MV 熄咗之後未再播。Functional Spec D36（已確認）：重開 app 回復上次嘅歌、播完最後一首、載入失敗、睇緊另一隻碟 |

要分得出「用戶暫停」同「因為 MV／重開 app 而停」：播放 store 記低暫停原因（例如 `pauseReason: 'user'｜'mv'｜'restore'`），做法由 T-038 定案。`lifted → playing` 冇轉動（即刻續播）；`parked → playing` 行完整落針動作。

**唱針開場同姿勢之間嘅動作**（⚠️ 設計稿第 17 版，用戶 2026-11-25 確認；Functional Spec FR-040「唱針開場」）：

| 轉換 | 動作 | 時長（`config/motion.ts`） |
| --- | --- | --- |
| `parked → playing`（由泊位開始播：揀歌之後第一次播、MV 熄咗之後再播、重開 app 之後第一次播；D36 其餘泊位情況一樣） | 兩段：① 升高住（`ARM_LIFT` 嘅放大同落影）由 176° 轉去 99°；② 放低唱針（放大同落影返原位）。針頭小燈同碟嘅轉動延遲到 ② 完咗先開始 | ① `tonearmMs` 650（現有）；② `tonearmDropMs` 160（新）；延遲 = 兩個相加（810），唔另外寫死 |
| `lifted → playing`（暫停之後再播） | 只做 ②，冇轉動 | `tonearmDropMs` 160 |
| `playing → lifted`（用戶暫停） | ② 倒轉：升起唱針 | `tonearmDropMs` 160 |
| 去 `parked`（開 MV、播完最後一首、載入失敗） | 轉返泊位（照舊） | `tonearmMs` 650 |
| 減少動態效果 | 全部冇動畫，直接到位；小燈同碟唔延遲 | 0 |

- 新 token 名（`tonearmDropMs`、CSS `--motion-scene-tonearm-drop`）係建議，由 T-042 定案；`motion.test.ts` 同 `tokens.node.test.ts` 要鎖住數值。小燈淡入用現有回饋類 token（設計稿 0.12s）。
- 設計稿嘅做法可以照用：`parked → playing` 嗰刻畀唱臂一個開場 class，行 `armSwing`（650ms）再行 `armDrop`（160ms，延遲 650ms）兩個 CSS keyframes；播完要除走個 class，否則佢最後一格會蓋住之後嘅 `lifted`。狀態機唔等 `animationend`（實現注意事項 11）：class 嘅加同除只係顯示層嘅事。
- 開場跟「開始播」走，唔係跟畫面切換走：轉碟期間唱臂本身淡出；睇完另一隻碟返去播緊嗰隻碟，`pose` 會由 `parked` 變 `playing`，但唔應該再行一次開場（建議做法，由 T-038 定案）。
- 出聲時間照實現注意事項 1：② 完嗰刻出聲；`audioEngine` 介面由 T-011 定案。

**版面系統**（`stage/`）

| 項目 | 做法 |
| --- | --- |
| 單位 | 設計基準 1080 × 1920。舞台設 CSS 變數 `--u`（= 舞台闊 ÷ 1080），所有尺寸寫 `calc(var(--u) * N)`，N 嚟自幾何表 |
| 幾何表 | `layouts/phone.ts` 輸出一個有型別嘅常數物件：各場景嘅碟位（圓心、半徑）、唱臂軸心同角度、掣位、Wheel、歌單弧線、電視框。初版數值由 `_mockups_/r-gram/src/anim.js` 檔頭常數抄入；主頁改版 mockup 確認後換數值 |
| 裝置模式 | `LayoutMode = 'phone' ｜ 'duoCover' ｜ 'duoOpenPortrait' ｜ 'duoOpenLandscape' ｜ 'square' ｜ 'desktop'`；`config/layout.ts` 用 media query 範圍判斷（Duo / HomeView 範圍沿用 903-player `apps/player/src/config/layout.ts`） |
| 未匹配裝置 | 退去 `phone`：舞台保持 9:16、按高度縮放、置中 |
| 手機橫版 | 橫向而且高度 ≤ 手機短邊上限 → 顯示 `RotateNotice`，舞台唔 render |
| 加裝置 | 加一份 `layouts/<mode>.ts` +（需要時）一個排版元件；現有模式嘅表同 CSS 唔改；用截圖比對工具證明現有裝置零改變（同 903-player `e2e:visual`） |
| 高身畫面（⚠️ CR-003 決定 1） | 舞台闊度填滿之後可用高度多過 1920：`StageSvg` 嘅 viewBox 高度跟舞台；「貼頂」組（左上資訊、頂部螺絲、版本號）唔郁，「貼底」組（轉盤、碟、唱片夾、唱臂、控件、左下螺絲）`translate(0, extraUnits)`；多出嚟嘅高度留喺中間。幾何表嘅數值唔變（T-033 已做） |
| 細屏（⚠️ CR-003 決定 3） | 全部按 `--u` 比例縮放，唔加細屏分支。感應範圍以 `clearance.viewportPt = 390` 做基準計（44pt）；375pt 闊 = 42.3pt、360pt 闊 = 40.6pt，用戶已接受 |

**繪圖方式**

> ⚠️ **CR-003 決定 4**：場景零件全部係同一個 `<svg>` 畫布（`stage/StageSvg.tsx`，1 個 SVG 單位 = 1 個設計單位）入面嘅 React SVG 元件，唔用呢個表原本「逐個元件 `<div>` / `<img>`」嘅做法（T-033 已經咁做）。例外：旗幟（`<canvas>`）同 MV 嘅 `<video>`。下表已改；未做嘅元件（歌單、歌書、電視）跟設計稿嘅 SVG 畫法，細節由各自嘅任務定案。

| 元件 | 技術 | 備注 |
| --- | --- | --- |
| 旗幟 | `<canvas>` 2D，移植 mockup 嘅布料網格 | DPR 上限 2；網格密度係常數，真機唔夠 30fps 就降；reduced-motion 畫一格靜止 |
| CD | SVG `<g>`：封面用 evenodd `clipPath` 挖走碟孔，銀邊同膠圈係 SVG 圖形；以設計稿嘅畫圖半徑 500 畫，再由外層 `scale(r / 500)` 放大 | 轉動用 CSS animation，長駐喺封面，暫停只切換 `animation-play-state`（停喺原位）。同一個 SVG 入面保證唔到獨立合成層：真機預覽（Implementation Plan R-005）要量轉碟時嘅 fps。換碟時以專輯 id 做 `key`，新封面先會由 0° 開始 |
| 唱臂 | SVG `<g>`，CSS `rotate` | 時長用 scene token；三個姿勢（泊位 / 落針 / 升針，CR-003 決定 11）；由泊位開始播有兩段開場（轉入 650ms → 放低 160ms，第 17 版；見上面「唱針開場」） |
| 金屬面 / 掣 / 旋鈕 / 螺絲 / 轉盤 / 唱片夾 | SVG gradient 同 filter，集中喺一個共用 `<defs>`（`components/metal/SvgDefs.tsx`；id 同引用共用 `defIds.ts` 嘅常數） | 光圈用 CSS；感應範圍係零件上面一個透明圖形（圓形，半徑按 44pt 換算） |
| 轉碟旋鈕 + 字母盤（CR-002 取代 Wheel） | SVG；pointer 拖動旋鈕（吸附去最近一格） | `role="listbox"`；方向鍵可操作；角度由 `scaleAngle()` 計（CR-003：弧固定、專輯平均分佈）。第 17 版：邊格出字母、邊格出細點由純函數 `dialShowsLetter()` 決定（Functional Spec D28）；出細點嘅格照舊係 listbox 嘅 option，無障礙名稱唔變 |
| 歌單 | SVG `<text>` 行，用 `arcRows()` 沿弧線排（以碟心做原點；T-037 定案） | 拖動 / 滾輪捲動 + 吸附；`role="listbox"` |
| 電視 | SVG 機身（同一個畫布）；`<video>` 係疊喺畫布上面嘅 HTML element，用 `clip-path: path()` 裁成弧面螢幕，位置由幾何表換算；掃描線用 CSS 疊層 | 獨立 chunk，㩒 MV 掣先載入；T-060 定案 |
| 模糊層 | 唱片機層 `filter: blur()` | 唔用 mockup 嘅 `blurBackdrop()` |
| 歌書（曲詞編監 + 歌詞） | SVG `<text>`。有時間標記嘅歌詞用 `arcRows()`，而家嗰行太長就喺框入面斷行；冇時間標記嘅歌詞係直身一欄，可以上下捲（第 17 版；見「播放端設計稿第 17 版嘅技術設計」。T-072、T-082 定案） | 獨立 chunk |

### 組件圖：`apps/api`

```
src/
├── index.ts / app.ts     Hono app、route 掛載、錯誤格式
├── config.ts             named constants（cookie 名、TTL、cache 秒數、R2 key layout、大細上限）
├── env.ts                bindings 型別（DB、CATALOG、MEDIA、vars）
├── auth/                 google.ts、oauthState.ts、session.ts、middleware.ts、routes.ts、pages.ts（沒有權限 / 登入逾時 / 登入失敗頁）、next.ts（`safeNext`）
├── api/                  routes.ts（`/api` 掛載：health 公開 → session → same-origin）
├── i18n/                 zh-Hant.ts（Worker 自己出嘅頁面文字）
├── albums/               routes.ts、store.ts、validate.ts
├── tracks/               routes.ts、store.ts、validate.ts、songText.ts（CR-003：歌曲文字讀寫，連歌詞 JSON 寫入 R2）
├── media/                scan.ts（R2 list → matchMediaFiles；CR-004：讀歌曲文字檔 → parseSongText、比 ETag）、routes.ts（T-025，未做）
├── lyrics/               routes.ts（CR-003：只留批量匯入，P1；歌詞儲存併入 tracks/songText.ts）
├── assets/               routes.ts、imageHeader.ts（magic bytes）、imageName.ts（hash 檔名）
├── catalog/              buildDocument.ts、rebuild.ts（寫入之後生成 + 狀態）、routes.ts、serve.ts（catalog.json / img / lyrics，ETag、CORS）
│                         （CR-003：取代 publish/；冇 diff.ts、warnings.ts）
└── lib/                  crypto.ts、http.ts（If-Match、錯誤回應）、env.ts、validateEnv.ts（啟動時驗 env）、securityHeaders.ts
```

### 數據流

**A. 管理端儲存 → 播放端**（⚠️ CR-003：冇草稿、冇發佈）

```
管理員改專輯欄位 / 排序 / 套用掃描 ─► PATCH / PUT / POST /api/... ─► 驗證 ─► D1
管理員上載封面 ─► 瀏覽器裁切 + 轉 WebP + 抽主色 ─► PUT /api/assets ─► R2 img/<hash>.webp ─► PATCH 專輯
（CR-004）由掃描套用封面 ─► 瀏覽器 fetch(MEDIA_BASE + <folder>/cover.jpg) ─► 同上（裁切 + 兩個尺寸 + 轉 WebP + 抽主色）─► PUT /api/assets × 2 ─► PATCH 專輯（連 coverSourceEtag）
管理員儲存一首歌嘅文字 ─► PUT /api/tracks/:id/text ─► parseSongText()（有錯回 400，逐行）
        └─► R2 lyrics/<hash>.json（有歌詞先寫）─► D1：tracks（歌名、副題、credit）+ lyrics（原文）
每個成功嘅寫入請求之後 ─► rebuildCatalog()
        └─► D1 讀全部專輯 / 歌 ─► 砌 document ─► validator ─► R2 catalog.json（hash 冇變就唔寫）─► D1 catalog_state
播放端啟動 / 返回前景 ─► GET /catalog/v1/catalog.json（帶 ETag）─► 驗證 ─► 存本機 ─► render
```

**B. 播歌**

```
㩒碟芯 play（用戶手勢）
 ├─► audioEngine：設 src = mediaBase + audio key，喺手勢入面解鎖播放（見「實現注意事項 1」）
 ├─► 場景：歌單淡走 → 碟縮返主頁 → 唱臂落針
 └─► 落針嗰刻開始出聲 ─► timeupdate ─► 進度圈 / 時間 / 歌詞當前行
ended ─► queue.next()（按 Shuffle / Repeat）─► 同一個 <audio> 換 src 再 play ─► 更新 Media Session
```

**C. 掃描**

```
GET /api/albums/:id/scan ─► R2 MEDIA.list({ prefix: '<folder>/' }) ─► 分類（音檔 / MV / 封面來源 / 歌曲文字檔）
 ├─► 封面來源：同 albums.cover_source_etag 比 ETag（唔讀圖）
 ├─► 歌曲文字檔：ETag 同 tracks.text_source_etag 唔同先 MEDIA.get() ─► parseSongText() ─► 同已儲存內容比較
 └─► 回預覽（封面 / 歌曲文字 / 已配對 / 配對唔到 / 冇檔 / 衝突），唔寫 D1（⚠️ CR-004）
POST /api/albums/:id/scan/apply（body = 管理員確認咗嘅項目）
 ├─► 媒體：寫入非手動指定嘅配對（手動指定嘅唔郁）
 └─► 歌曲文字：逐個檔重讀 ─► ETag 冇變 + 冇錯 +（會清歌詞就要 force）─► 同 API-041 一樣嘅儲存 ─► 記低 text_source_etag
封面：唔經 apply；管理端頁面處理（數據流 A 最後一行）
```

---

## API 設計

**通則**

| 項目 | 規則 |
| --- | --- |
| 路徑 | 管理 API：`/api/*`（同 admin SPA 同一次部署，唔分版本，同 903-player）；公開內容：`/catalog/v1/*`（有版本，播放端舊版仍然讀到） |
| 認證 | `session` = 要有效 `__Host-session` cookie；改資料嘅 method（POST / PUT / PATCH / DELETE）另外要 `Origin` = Worker 自己嘅 origin |
| 格式 | JSON（`PUT /api/assets` 例外：binary body） |
| 並發 | 改單一資源要帶 `If-Match: "<updatedAt>"`；唔啱回 409 `STALE`；冇帶回 400 `VALIDATION_ERROR`（`path: "If-Match"`、`REQUIRED`；⚠️ CR-004 回寫） |
| 錯誤格式 | `{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [{ "path": "title", "reason": "REQUIRED", "message": "必須填寫。" }] } }`（⚠️ CR-004 回寫：`reason` 用大楷；每條 `details` 帶 `message`） |
| 錯誤訊息語言（⚠️ CR-004，backlog B-044） | `message` 一律中文書面語，全部嚟自 `apps/api/src/i18n/zh-Hant.ts`。管理端以 `code`／`reason` 喺自己嘅語言檔砌字，Backend 嘅 `message` 只做後備 |
| 通用錯誤 | 400 `VALIDATION_ERROR`｜401 `UNAUTHORIZED`｜403 `FORBIDDEN_ORIGIN`｜404 `NOT_FOUND` / `NOT_READY`｜409 `STALE` / `CONFLICT` / `ID_REMOVED` / `LYRICS_REMOVED`｜413 `TOO_LARGE`｜415 `UNSUPPORTED_TYPE`｜422 `INVALID_DOCUMENT`｜500 `INTERNAL`｜502 `CATALOG_WRITE_FAILED`（⚠️ CR-004 回寫：同 `apps/api/src/config.ts` 嘅 `ERROR_CODE` 一致） |

### Endpoint 一覽

| 編號 | Method + Path | 認證 | 用途 |
| --- | --- | --- | --- |
| API-001 | `GET /auth/google/start?next=<同站 path>` | None | 開始 Google login（PKCE、state cookie） |
| API-002 | `GET /auth/google/callback` | None | 換 token、驗 ID token、對白名單、開 session |
| API-003 | `POST /auth/logout` | None（要 same-origin） | 刪 session（⚠️ CR-003 同步 T-021 嘅實作；之前寫 session） |
| API-004 | `GET /api/me` | session | `{ email }` |
| API-005 | `GET /api/health` | None | `{ ok, version }` |
| API-010 | `GET /api/albums` | session | 專輯列表 + 每張專輯嘅完整度 + 全站統計（CR-003：FR-114；項目 D35，等管理端設計稿第 2 版確認）+ catalog 生成狀態 |
| API-011 | `POST /api/albums` | session | 新增專輯（⚠️ CR-004：要 `category`；`categoryNo` 冇畀 = 嗰個類別最大序號 + 1；`folder` 冇畀 = 用預期資料夾名） |
| API-012 | `GET /api/albums/:id` | session | 專輯 + 歌曲 |
| API-013 | `PATCH /api/albums/:id` | session | 改專輯欄位（⚠️ CR-004：加 `category`、`categoryNo`、`coverSourceEtag`） |
| API-014 | `DELETE /api/albums/:id` | session | 刪專輯（連歌、歌詞）；冇 `?force=1` 回 409 `ID_REMOVED`（⚠️ CR-003：ID 守衛搬嚟呢度） |
| API-015 | `PUT /api/albums/order` | session | 專輯排序 |
| API-020 | `POST /api/albums/:id/tracks` | session | 新增歌：body 係歌曲文字 `{ text }`（同 API-041）；加喺最尾，歌號 = 次序（⚠️ CR-003） |
| API-021 | `PATCH /api/tracks/:id` | session | 改歌嘅其他欄位：參考欄（歌詞參考連結、備註）、手動指定音檔 / MV key。⚠️ CR-003：冇上架；歌名、副題、credit 改經 API-041（D37 已確認）；歌號經 API-023 |
| API-024 | `GET /api/tracks/sources?title=` | session | 搵其他專輯同名歌（「由同名歌帶入」用；回每首嘅歌曲文字：credit + 歌詞）。⚠️ CR-003：API-044 併入呢個；P1，D34 已確認 |
| API-022 | `DELETE /api/tracks/:id` | session | 刪歌；冇 `?force=1` 回 409 `ID_REMOVED`（⚠️ CR-003） |
| API-023 | `PUT /api/albums/:id/tracks/order` | session | 歌曲排序（重編歌號） |
| API-030 | `GET /api/albums/:id/scan` | session | 掃描預覽（唔寫入）。⚠️ CR-004：連封面來源同歌曲文字檔 |
| API-031 | `POST /api/albums/:id/scan/apply` | session | 套用掃描結果。⚠️ CR-004：body 列出確認咗嘅項目（媒體配對、歌曲文字檔）；封面由管理端經 API-050 + API-013 套用 |
| API-032 | `GET /api/media?prefix=` | session | 列 R2 資料夾 / 檔案（手動指定用）；⚠️ CR-004：`_` 開頭嘅資料夾（例如 `_fonts/`）唔列 |
| API-040 | `GET /api/tracks/:id/text` | session | 攞成首歌嘅文字（`formatSongText()`：歌名 + 副題 + 曲詞編監 + 歌詞原文）；展開歌曲行時先叫（⚠️ CR-003；之前係 `/lyrics`） |
| API-041 | `PUT /api/tracks/:id/text` | session | 儲存成首歌嘅文字：歌名、副題、credit、歌詞一次過（⚠️ CR-003；之前係 `/lyrics`） |
| ~~API-042~~ | ~~`DELETE /api/tracks/:id/lyrics`~~ | — | ⚠️ CR-003 刪除：清除歌詞 = 用 API-041 儲存冇歌詞部分嘅文字 |
| API-043 | `POST /api/albums/:id/lyrics/import` | session | 批量匯入 `.lrc` / `.txt`：只取代歌詞部分（⚠️ CR-003；P1，D34 已確認） |
| ~~API-044~~ | ~~`GET /api/lyrics/sources?title=`~~ | — | ⚠️ CR-003 刪除：併入 API-024 |
| API-050 | `PUT /api/assets` | session | 上載封面圖 |
| ~~API-060~~ | ~~`GET /api/changes`~~ | — | ⚠️ CR-003 刪除：冇草稿 |
| API-061 | `POST /api/catalog/rebuild` | session | 重新生成 `catalog.json`（⚠️ CR-003；之前係 `POST /api/publish`）。平時唔使叫：每次寫入之後自動生成；只喺生成失敗之後重試用 |
| ~~API-062~~ | ~~`GET /api/publishes`~~ | — | ⚠️ CR-003 刪除：冇發佈記錄 |
| API-070 | `GET /catalog/v1/catalog.json` | None（CORS 限播放端） | 而家生效嘅內容（全部專輯同歌） |
| API-071 | `GET /catalog/v1/img/:name` | None（CORS 限播放端） | 封面圖 |
| API-072 | `GET /catalog/v1/lyrics/:name` | None（CORS 限播放端） | 歌詞 JSON |

### [API-013] 改專輯

- **Method**：PATCH
- **Path**：`/api/albums/:id`
- **認證**：Required（session + same-origin）；Header `If-Match: "<updatedAt>"`
- **Request Body**（全部選填，只改有畀嘅欄位；`id` 唔可以改）：
    ```json
    {
        "title": "Apollo 18",
        "wheelKey": "A",
        "releaseDate": "2008-09-26",
        "type": "錄音室專輯",
        "label": "金牌娛樂",
        "accent": "#c8442b",
        "cover": "9f2c1a7b3d4e5f60.webp",
        "thumb": "1a2b3c4d5e6f7081.webp",
        "category": "album",
        "categoryNo": 1,
        "coverSourceEtag": "\"9b2c…\"",
        "folder": null
    }
    ```
    - ⚠️ CR-004：`category`（`album`｜`ep`｜`best`｜`live`｜`ost`｜`single`）、`categoryNo`（整數 ≥ 1，同類別入面唔可以重覆）、`coverSourceEtag`（由掃描套用封面時先帶；`null` = 清走）。`folder`：`null` = 用預期資料夾名 `<category>-<NN>-<id>`（之前 `null` = 用專輯 id）；字串 = 手動改綁
    - `year` 唔可以直接改（跟 `releaseDate`）；改 `title` 唔會重計 `wheelKey`；`accent` 存細楷；`type` 見「資料夾名同發行類別」（Functional Spec D44 待確認）
- **Response（200）**：完整專輯物件 + 新 `updatedAt`（⚠️ CR-003：冇 `enabled` 欄；儲存成功之後自動生成 catalog，回應帶 `catalog.ok`）。⚠️ CR-004：專輯物件加 `category`、`categoryNo`、`coverSourceEtag`、`expectedFolder`（計出嚟，唔可以改）
- **Error Cases**：
    | Status | Code | 描述 |
    | --- | --- | --- |
    | 400 | VALIDATION_ERROR | 欄位格式錯（`accent` 唔係 `#rrggbb`、`releaseDate` 唔係 `YYYY-MM-DD`、`wheelKey` 多過 2 個字、`cover` 唔喺 `assets`）；冇帶 `If-Match`；未知或者唔可以改嘅欄位（`NOT_EDITABLE`）。⚠️ CR-004：`category` 唔係六個短名之一、`categoryNo` 唔係正整數或者同類別入面已有人用（建議 `ORDINAL_TAKEN`）、`folder` 有 `..` 或者 `_` 開頭（`INVALID_FOLDER`） |
    | 409 | STALE | `If-Match` 同現有 `updatedAt` 唔同 |

### [API-030] 掃描預覽（⚠️ CR-004：連封面來源同歌曲文字檔）

- **Method**：GET
- **Path**：`/api/albums/:id/scan`
- **認證**：Required
- **處理**：列出專輯資料夾（`albums.folder`，NULL 就用 `expectedFolder()`）入面全部檔 → 分類（「CR-004 對技術設計嘅影響 → 掃描嘅設計」）→ 封面來源只比 ETag；歌曲文字檔 ETag 變咗先讀檔同行 `parseSongText()` → 回預覽。**唔寫 D1、唔寫 R2**
- **Response（200）**（形狀係建議，由 T-025 定案）：
    ```json
    {
        "folder": "album-01-apollo-18",
        "expectedFolder": "album-01-apollo-18",
        "cover": { "key": "album-01-apollo-18/cover.jpg", "etag": "\"9b2c…\"", "bytes": 482113, "change": "new", "hasCover": true },
        "songTexts": [
            {
                "trackId": "apollo-18-01", "no": 1, "key": "album-01-apollo-18/01 一早地下鐵.txt", "etag": "\"41d8…\"", "bytes": 1820,
                "change": "replace", "title": "一早地下鐵", "titleChanged": false, "lineCount": 42, "synced": true, "removesLyrics": false, "errors": []
            },
            {
                "trackId": "apollo-18-04", "no": 4, "key": "album-01-apollo-18/04 小涓.txt", "etag": "\"77aa…\"", "bytes": 902,
                "change": "replace", "errors": [{ "line": 9, "reason": "MIXED_TIMESTAMPS", "message": "…" }]
            }
        ],
        "matched": [
            { "trackId": "apollo-18-01", "no": 1, "kind": "audio", "key": "album-01-apollo-18/01 一早地下鐵.m4a", "bytes": 8123456, "change": "new" }
        ],
        "unmatchedFiles": [{ "key": "album-01-apollo-18/booklet.pdf", "reason": "UNKNOWN_EXTENSION" }],
        "conflicts": [{ "no": 3, "kind": "audio", "keys": ["album-01-apollo-18/03 a.m4a", "album-01-apollo-18/03 b.mp3"] }],
        "tracksWithoutAudio": [{ "trackId": "apollo-18-15", "no": 15, "title": "認錯" }],
        "manualKept": [{ "trackId": "apollo-18-02", "kind": "audio", "key": "album-02-beaming/05 Hero.m4a" }]
    }
    ```
    - `change`：`new`｜`same`｜`replace`（封面同歌曲文字嘅定義見「掃描嘅設計」）
    - `cover`：冇封面來源係 `null`；`cover.jpg` 同 `cover.png` 都有就入 `conflicts`（`kind: "cover"`，冇 `no`），`cover` 係 `null`
    - `songTexts[].errors` 唔係空 = 呢個檔唔可以套用；`errors[]` 同 API-041 嘅 400 `details` 同一組 `reason`，另加檔案層面嘅 `TOO_LARGE`、`BAD_ENCODING`（`line: 0`）
    - `conflicts[].kind`：`audio`｜`mv`｜`text`｜`cover`
- **Error Cases**：
    | Status | Code | 描述 |
    | --- | --- | --- |
    | 404 | NOT_FOUND | 冇呢張專輯 |
    | 404 | FOLDER_EMPTY | R2 入面冇呢個資料夾（或者入面冇檔） |

    ⚠️ CR-004：`NO_FOLDER`（專輯未設 `folder`）刪走：`folder` 係 NULL 就用預期資料夾名，唔會冇資料夾名。

### [API-031] 套用掃描結果（⚠️ CR-004）

- **Method**：POST
- **Path**：`/api/albums/:id/scan/apply`
- **認證**：Required（session + same-origin）
- **Request Body**（形狀係建議，由 T-025 定案）：只列管理員確認咗嘅項目
    ```json
    {
        "media": [{ "trackId": "apollo-18-01", "kind": "audio", "key": "album-01-apollo-18/01 一早地下鐵.m4a" }],
        "songTexts": [{ "trackId": "apollo-18-01", "key": "album-01-apollo-18/01 一早地下鐵.txt", "etag": "\"41d8…\"", "force": false }]
    }
    ```
- **處理**：媒體配對：寫入非手動指定嘅配對（手動指定嘅唔郁；key 要喺呢張專輯嘅資料夾入面而且存在）。歌曲文字：逐個檔重新讀 → ETag 同 body 嘅唔同就唔套用（`STALE`）→ `parseSongText()` 有錯就唔套用 → 會清走現有歌詞而 `force` 唔係 `true` 就唔套用（`LYRICS_REMOVED`）→ 其餘用 API-041 同一個儲存函數寫入（歌名、副題、credit、歌詞、歌詞 JSON），並記低 `tracks.text_source_etag`。一個項目失敗唔影響其他項目。最後生成一次 catalog。**封面唔經呢個 endpoint**：由管理端頁面處理之後行 API-050 同 API-013
- **Response（200）**：`{ "media": { "applied": 26 }, "songTexts": [{ "trackId": "apollo-18-01", "ok": true }, { "trackId": "apollo-18-04", "ok": false, "code": "VALIDATION_ERROR", "details": [ … ] }], "catalog": { "ok": true } }`
- **Error Cases**：
    | Status | Code | 描述 |
    | --- | --- | --- |
    | 400 | VALIDATION_ERROR | body 形狀錯；key 唔喺呢張專輯嘅資料夾；`trackId` 唔屬於呢張專輯 |
    | 404 | NOT_FOUND | 冇呢張專輯 |

### [API-041] 儲存歌曲文字（⚠️ CR-003：取代「儲存歌詞」）

- **Method**：PUT
- **Path**：`/api/tracks/:id/text`
- **認證**：Required（session + same-origin）；Header `If-Match: "<updatedAt>"`
- **Request Body**（格式：Functional Spec D31、D37，已確認）：
    ```json
    { "text": "一早地下鐵\n曲：阿正\n詞：Tim Lui / 6號\n編：阿正\n監：RubberBand / 雷頌德\n\n[00:12.30]第一句歌詞\n[00:18.75]第二句歌詞" }
    ```
- **處理**：`parseSongText()` → 有錯回 400（乜都唔寫）→ 有歌詞就寫 R2 `lyrics/<hash>.json` → D1 一個 batch 寫 `tracks`（`title`、`subtitle`、四個 credit 欄）同 `lyrics`（文字冇歌詞部分就刪走嗰行）→ 生成 catalog
- **Response（200）**：
    ```json
    { "trackId": "apollo-18-01", "text": "（正規化之後嘅文字，回填文字框）", "lineCount": 42, "synced": true, "lyrics": "5d41402abc4b2a76.json", "updatedAt": "2026-11-25T08:06:00.000Z", "catalog": { "ok": true } }
    ```
- **Error Cases**：
    | Status | Code | 描述 |
    | --- | --- | --- |
    | 400 | VALIDATION_ERROR | `details` 逐行列出：`{ "line": 1, "reason": "TITLE_REQUIRED" }`、`DUPLICATE_LABEL`、`BAD_TIMESTAMP`、`MIXED_TIMESTAMPS`（有啲歌詞行有時間標記、有啲冇；D32）、`LINE_TOO_LONG`、`TOO_MANY_LINES`、`CREDIT_TOO_LONG`。全部歌詞行都冇時間標記唔係錯誤（純文字歌詞，D32 已確認），唔再回 `NO_TIMED_LINES` |
    | 409 | STALE | `If-Match` 同現有 `updatedAt` 唔同 |
    | 413 | TOO_LARGE | 超過 `SONG_TEXT_MAX_BYTES`（64 KB；取代 `LRC_MAX_BYTES`） |

錯誤 code 嘅確實名由 T-029 定案；上面係建議。

### [API-050] 上載封面

- **Method**：PUT
- **Path**：`/api/assets`
- **認證**：Required（session + same-origin）
- **Request**：binary body；`Content-Type: image/webp`（管理端已經喺瀏覽器裁成正方形並轉 WebP）。⚠️ CR-004 回寫（T-024）：`image/jpeg`、`image/png` 都收；宣稱嘅類型一定要同檔案內容（檔頭）一致；圖一定係正方形，邊長係 1200（大封面）或者 320（縮圖），每個尺寸各上載一次。大封面嘅尺寸規則 Functional Spec D48 建議放寬為 640 至 1200（**待用戶確認**，T-099）
- **Response（200）**：`{ "name": "9f2c1a7b3d4e5f60.webp", "bytes": 184320 }`（同內容重複上載回同一個檔名）。檔名 = 內容 sha256 頭 16 個 hex + 跟內容嘅副檔名（`.webp`／`.jpg`／`.png`）。上載本身唔生成 catalog（冇 `catalog` 欄）
- **檢查次序**：Content-Type（415）→ 大細（413；有 `Content-Length` 就唔讀 body）→ 檔頭格式同宣稱一致（415）→ 結構同尺寸（400）
- **Error Cases**：
    | Status | Code | 描述 |
    | --- | --- | --- |
    | 400 | VALIDATION_ERROR | ⚠️ CR-004 回寫：`details` = `[{ "path": "$", "reason", "message" }]`；`INVALID_IMAGE`（讀唔到圖嘅結構）、`INVALID_DIMENSIONS`（唔係指定尺寸嘅正方形） |
    | 413 | TOO_LARGE | 超過 `IMAGE_MAX_BYTES` |
    | 415 | UNSUPPORTED_TYPE | Content-Type 或者檔頭 magic bytes 唔係 WebP / JPEG / PNG，或者兩者唔一致 |

**[API-071] 封面圖**（⚠️ CR-004 回寫，T-024）：`GET`／`HEAD /catalog/v1/img/:name`。`name` 一定係 `<16 hex>.<webp｜jpg｜png>`，唔係就 404 `NOT_FOUND`（唔會砌出其他 key）。Header：`Cache-Control: public, max-age=31536000, immutable`、`X-Content-Type-Options: nosniff`、`ETag`、`Vary: Origin`；`Content-Type` 由副檔名決定；`Access-Control-Allow-Origin` 只回 `PLAYER_ORIGINS` 入面嘅 origin；唔設 cookie。T-026 帶入嘅 header（CSP、304）等佢嘅 review 之後回寫。

### [API-061] 重新生成 catalog（⚠️ CR-003：取代「發佈」）

- **Method**：POST
- **Path**：`/api/catalog/rebuild`
- **認證**：Required（session + same-origin）
- **用途**：平時唔使叫。每個成功嘅 `/api/*` 寫入請求之後，Worker 自動行同一個 `rebuildCatalog()`（做成寫入 route 嘅後置步驟，各 route 唔使自己叫）。呢個 endpoint 只係畀管理端喺生成失敗之後「重試」用
- **`rebuildCatalog()`**：D1 讀全部專輯同歌（冇上下架）→ 砌 document（空字串轉 `null`）→ `parseCatalogDocument()` → hash 同 `catalog_state.hash` 一樣就唔寫 R2 → 寫 R2 `catalog.json` → 更新 `catalog_state`
- **Response（200）**：
    ```json
    { "ok": true, "hash": "ab12…", "unchanged": false, "albumCount": 21, "trackCount": 291, "generatedAt": "…" }
    ```
- **生成失敗**（R2 寫入失敗，或者 document 過唔到 validator）：D1 嘅修改已經儲存，唔還原；`catalog_state.status = 'failed'`；觸發佢嘅寫入請求照回 200，但 `catalog.ok = false`；管理端頂部顯示提示同「重試」掣；播放端繼續用上一份 `catalog.json`。回應格式嘅細節由 T-026 定案
- **Error Cases**：
    | Status | Code | 描述 |
    | --- | --- | --- |
    | 422 | INVALID_DOCUMENT | 砌出嚟嘅 document 過唔到 validator（唔應該發生：輸入喺儲存時已經驗過；保護播放端） |
    | 502 | CATALOG_WRITE_FAILED | R2 寫入失敗 |

**ID 守衛**（⚠️ CR-003）：以前喺發佈時比對上次發佈嘅 id（409 `ID_REMOVED`）。而家冇上下架，id 只會因為刪除而由 catalog 消失，所以守衛搬去 API-014、API-022：冇 `?force=1` 回 409 `ID_REMOVED`（`details` 列出會消失嘅專輯 id / 歌 id），管理端用二次確認講明後果，確認之後帶 `?force=1` 再叫。

### [API-070] 內容檔（⚠️ CR-003：之前叫「已發佈內容」）

- **Method**：GET
- **Path**：`/catalog/v1/catalog.json`
- **認證**：None；`Access-Control-Allow-Origin` 只回 `PLAYER_ORIGINS` 入面嘅 origin
- **Header**：`Cache-Control: public, max-age=60`、`ETag: "<hash>"`；`If-None-Match` 啱就回 304
- **Response（200）**：
    ```json
    {
        "version": 1,
        "generatedAt": "2026-11-24T16:50:00.000Z",
        "mediaBase": "https://<media 公開網址>/",
        "imageBase": "https://<worker>/catalog/v1/img/",
        "lyricsBase": "https://<worker>/catalog/v1/lyrics/",
        "albums": [
            {
                "id": "apollo-18",
                "title": "Apollo 18",
                "wheelKey": "A",
                "releaseDate": "2008-09-26",
                "year": 2008,
                "type": "錄音室專輯",
                "category": "album",
                "categoryNo": 1,
                "label": "金牌娛樂",
                "accent": "#c8442b",
                "cover": "9f2c1a7b3d4e5f60.webp",
                "thumb": "1a2b3c4d5e6f7081.webp",
                "tracks": [
                    {
                        "id": "apollo-18-01",
                        "no": 1,
                        "title": "一早地下鐵",
                        "subtitle": null,
                        "credits": {
                            "composer": "阿正",
                            "lyricist": "Tim Lui / 6號",
                            "arranger": "阿正",
                            "producer": "RubberBand / 雷頌德"
                        },
                        "audio": "album-01-apollo-18/01 一早地下鐵.m4a",
                        "mv": "album-01-apollo-18/01 一早地下鐵.mp4",
                        "lyrics": "5d41402abc4b2a76.json"
                    }
                ]
            }
        ]
    }
    ```
    - 包全部專輯同歌（⚠️ CR-003：冇上下架），按管理端次序
    - ⚠️ CR-004：專輯加 `category`（六個短名之一）同 `categoryNo`（正整數）；播放端唔顯示，validator 要驗。`version` 仍然係 1（未部署過，冇舊播放端要兼容）
    - `audio` / `mv` / `lyrics` / `cover` 可以係 `null`（冇音檔嘅歌照列出，播放端顯示灰色）
    - `credits` 四個欄各自可以係 `null`；四個都冇就成個 `credits` 係 `null`。值係管理端輸入嘅原文字串（多個名用「 / 」分隔只係慣例，播放端照原文顯示，唔拆）
    - 播放端砌網址時每段路徑做 `encodeURIComponent`（檔名有中文同空格）
- **Error Cases**：
    | Status | Code | 描述 |
    | --- | --- | --- |
    | 404 | NOT_READY | 未生成過 catalog（例如啱啱 seed 完）。⚠️ CR-003 建議：呢個時候即場由 D1 生成並寫入，唔回 404；由 T-026 / T-027 定案。之前叫 `NOT_PUBLISHED` |

**歌詞 JSON**（API-072，`Cache-Control: public, max-age=31536000, immutable`）：

```json
{ "synced": true, "lines": [{ "t": 12300, "text": "一早地下鐵" }, { "t": 16800, "text": "" }] }
```

`t` 係毫秒、已按時間排序、已套用 `[offset:]`；空白 `text` = 間奏（唔 highlight 任何一行）。

⚠️ CR-003（Functional Spec D32，已確認）：加 `synced`。純文字歌詞係 `{ "synced": false, "lines": [{ "text": "第一句歌詞" }, { "text": "" }] }`：冇 `t`，空白 `text` = 分段；播放端唔行 `activeLine()`，歌書唔跟歌行（顯示方式：Functional Spec D38，已確認；設計稿第 17 版修訂為直身一欄，自動斷行、上下捲。JSON 格式唔使改：斷行只喺播放端顯示時做，空白 `text` 照舊係分段）。

---

## 數據庫設計

D1（SQLite）。時間欄一律 ISO 8601 UTC 字串（session 過期用 epoch ms）。

> ⚠️ **CR-003**：`albums.enabled`、`tracks.enabled` 刪走；`publishes` 換做 `catalog_state`；`lyrics` 改欄。已經寫好嘅 `apps/api/migrations/0001_init.sql` 同 `test/schema.test.ts` 要跟住改（Implementation Plan T-096）；D1 未部署過，冇資料要搬。

### albums

| 欄位 | 類型 | 約束 | 描述 |
| --- | --- | --- | --- |
| id | TEXT | PK；`^[a-z0-9]+(-[a-z0-9]+)*$`；唔可以係保留字 `favourites` | 專輯 id，建立後不變 |
| title | TEXT | NOT NULL | 碟名 |
| wheel_key | TEXT | NOT NULL | Wheel 標記（1–2 個字） |
| release_date | TEXT | NULL | `YYYY-MM-DD` |
| year | INTEGER | NULL | 顯示用年份（單曲集可以冇） |
| type | TEXT | NOT NULL DEFAULT '' | 類型（自由文字）。⚠️ CR-004：seed 填類別嘅中文名；係咪改為由 `category` 自動帶出，Functional Spec D44 待用戶確認 |
| category | TEXT | NOT NULL；CHECK IN ('album','ep','best','live','ost','single') | ⚠️ CR-004 新增：發行類別短名（錄音室專輯、迷你專輯、精選、現場專輯、電影原聲、單曲）。串法待用戶確認（D43） |
| category_no | INTEGER | NOT NULL；CHECK (category_no >= 1) | ⚠️ CR-004 新增：喺嗰個類別入面嘅序號。同類別唔可以重覆（API 層驗證） |
| label | TEXT | NOT NULL DEFAULT '' | 唱片公司 |
| accent | TEXT | NOT NULL | 專輯色 `#rrggbb` |
| cover | TEXT | NULL，FK → assets.name | 封面（1200 × 1200；⚠️ CR-004：D48 建議放寬為 640 至 1200 嘅正方形，待用戶確認） |
| cover_source_etag | TEXT | NULL | ⚠️ CR-004 新增：上次由掃描套用嘅封面來源（媒體 bucket 嘅 `cover.jpg｜png`）嘅 R2 ETag；NULL = 未套用過。人手上載封面唔改呢個欄 |
| thumb | TEXT | NULL，FK → assets.name | 縮圖（320 × 320；Wheel 兩旁嘅碟同管理端列表用） |
| folder | TEXT | NULL | 媒體 bucket `rb-discography` 入面嘅資料夾名，一層。⚠️ CR-004：NULL = 用預期資料夾名 `<category>-<NN>-<id>`（之前 NULL = 用 id）；非 NULL = 手動改綁。唔可以有 `/` `\` `?` `#` `%` `..`，唔可以 `_` 開頭 |
| sort_order | INTEGER | NOT NULL | Wheel 次序 |
| ~~enabled~~ | — | — | ⚠️ CR-003 刪除（冇上下架） |
| created_at / updated_at | TEXT | NOT NULL | `updated_at` 兼做 `If-Match` |

### tracks

| 欄位 | 類型 | 約束 | 描述 |
| --- | --- | --- | --- |
| id | TEXT | PK；`^[a-z0-9-]+$` | 歌 id，建立後不變。Seed：`<albumId>-<兩位歌號>`；管理端新增：`<albumId>-<6 位隨機>` |
| album_id | TEXT | NOT NULL，FK → albums.id ON DELETE CASCADE | |
| no | INTEGER | NOT NULL；UNIQUE (album_id, no) | 歌號（⚠️ CR-003：跟歌曲行次序由 1 連續編，API-023 重編；管理端唔可以直接改） |
| title | TEXT | NOT NULL | 歌名（⚠️ CR-003：經歌曲文字第一行輸入） |
| subtitle | TEXT | NULL | 副題（⚠️ CR-003 D37 已確認：經歌曲文字 `副題：` 行輸入） |
| audio_key | TEXT | NULL | R2 key |
| audio_manual | INTEGER | NOT NULL DEFAULT 0 | 1 = 手動指定，掃描唔蓋 |
| mv_key | TEXT | NULL | R2 key |
| mv_manual | INTEGER | NOT NULL DEFAULT 0 | |
| composer | TEXT | NULL；≤ `CREDIT_MAX_CHARS` | 作曲（原文字串，例如「Tim Lui / 6號」）。⚠️ CR-003：四個 credit 欄都係經歌曲文字嘅 `曲：` `詞：` `編：` `監：` 行輸入，儲存照舊分開 |
| lyricist | TEXT | NULL | 填詞 |
| arranger | TEXT | NULL | 編曲 |
| producer | TEXT | NULL | 監製 |
| lyrics_source_url | TEXT | NULL；只收 `https://` | 參考欄：歌詞參考連結，唔入 catalog |
| note | TEXT | NULL | 參考欄：備註，唔入 catalog |
| text_source_etag | TEXT | NULL | ⚠️ CR-004 新增：上次由掃描套用嘅歌曲文字檔（`NN 名.txt`）嘅 R2 ETag；NULL = 未套用過。喺管理端人手儲存唔改呢個欄（所以 bucket 嗰個檔冇再改，掃描唔會再建議） |
| youtube_id | TEXT | NULL | 參考欄，唔入 catalog |
| video_kind | TEXT | NULL | 參考欄（MV / Live / Audio…），唔入 catalog |
| ~~enabled~~ | — | — | ⚠️ CR-003 刪除（冇上下架） |
| created_at / updated_at | TEXT | NOT NULL | |

### lyrics

| 欄位 | 類型 | 約束 | 描述 |
| --- | --- | --- | --- |
| track_id | TEXT | PK，FK → tracks.id ON DELETE CASCADE | |
| source | TEXT | NOT NULL | ⚠️ CR-003：歌曲文字入面歌詞部分嘅原文（回填文字框用）；之前叫 `lrc` |
| synced | INTEGER | NOT NULL CHECK IN (0, 1) | ⚠️ CR-003（D32 已確認）：1 = 有時間標記；0 = 純文字 |
| json_name | TEXT | NOT NULL | R2 `lyrics/<hash>.json` 檔名（生成 catalog 時直接引用） |
| line_count | INTEGER | NOT NULL | |
| updated_at | TEXT | NOT NULL | |

獨立一張表：歌曲列表查詢唔使拎歌詞原文。

### assets

| 欄位 | 類型 | 約束 | 描述 |
| --- | --- | --- | --- |
| name | TEXT | PK | `<sha256 前 16 hex>.<ext>` |
| content_type | TEXT | NOT NULL | |
| bytes | INTEGER | NOT NULL | |
| created_at | TEXT | NOT NULL | |

### catalog_state（⚠️ CR-003：取代 publishes）

得一行（`id = 1`）：記低而家嗰份 `catalog.json`。冇發佈記錄、冇 diff、冇還原（Functional Spec FR-113、FR-116 已刪）。欄位係建議，由 T-096 / T-026 定案。

| 欄位 | 類型 | 約束 | 描述 |
| --- | --- | --- | --- |
| id | INTEGER | PK CHECK (id = 1) | 單行 |
| status | TEXT | NOT NULL CHECK IN ('ok','failed') | 最近一次生成嘅結果；`failed` = D1 比 `catalog.json` 新，管理端要顯示提示 |
| hash | TEXT | NULL | 而家 R2 嗰份 document JSON 嘅 sha256（= ETag）；未生成過係 NULL |
| generated_at | TEXT | NULL | 而家嗰份嘅生成時間 |
| album_count / track_count | INTEGER | NULL | |
| updated_at | TEXT | NOT NULL | 最近一次嘗試生成嘅時間 |
| updated_by | TEXT | NOT NULL | admin email（或者 `seed`） |
| error | TEXT | NULL | 失敗原因 |

### sessions

| 欄位 | 類型 | 約束 | 描述 |
| --- | --- | --- | --- |
| token_hash | TEXT | PK | session token 嘅 SHA-256 hex（D1 漏咗都用唔到） |
| email | TEXT | NOT NULL | |
| expires_at | INTEGER | NOT NULL | epoch ms |

### 索引設計

| 索引 | 原因 |
| --- | --- |
| `tracks (album_id, no)` UNIQUE | 專輯頁列歌；保證歌號唔重覆 |
| `tracks (title)` | API-024 搵同名歌 |
| `albums (sort_order)` | 列表排序 |
| `sessions (expires_at)` | 清過期 session |
| ~~`publishes (id DESC)`~~ | ⚠️ CR-003 刪除（`catalog_state` 得一行） |

### R2 key layout

| Bucket | Key | 寫入時機 |
| --- | --- | --- |
| `r-gram-catalog` | `catalog/v1/catalog.json` | 每個成功嘅寫入請求之後（⚠️ CR-003；hash 冇變就唔寫） |
| `r-gram-catalog` | `catalog/v1/img/<hash>.<ext>` | 上載封面 |
| `r-gram-catalog` | `catalog/v1/lyrics/<hash>.json` | **儲存嗰首歌嘅文字時**（API-041）；生成 catalog 只寫一個 `catalog.json`，唔會一次過寫幾百個檔 |
| `rb-discography`（⚠️ CR-004；之前 `r-gram-media`） | `<folder>/<NN> <名>.<m4a｜mp3>`、`<folder>/<NN> <名>.<mp4｜m4v>` | 用戶自行上載。`<folder>` 預設 = `<category>-<NN>-<id>` |
| `rb-discography` | `<folder>/cover.<jpg｜png>`（封面來源）、`<folder>/<NN> <名>.txt`（歌曲文字） | ⚠️ CR-004：用戶自行上載；Worker 只讀（掃描） |
| `rb-discography` | `_fonts/<檔名>`（可選：slab 字體檔） | ⚠️ CR-004：用戶自行上載；播放端直接載入，Worker 唔理 |

### 播放端本機資料（localStorage）

| Key | 內容 |
| --- | --- |
| `rgram.catalog.v1` | `{ etag, document }`：上次成功載入嘅 catalog |
| `rgram.favourites.v1` | `[{ trackId, addedAt }]` |
| `rgram.resume.v1` | `{ albumId, trackId, positionSec, source: 'album' ｜ 'favourites' }` |
| `rgram.playMode.v1` | `{ shuffle: boolean, repeat: 'off' ｜ 'all' ｜ 'one' }` |

Key 名集中喺 `config/storageKeys.ts`；讀取時驗 shape，壞咗就當冇。

---

## 安全設計

| 範疇 | 設計 |
| --- | --- |
| 認證 | Google Authorization Code + PKCE；`state` + `code_verifier` 存短期 `__Host-oauth` cookie；callback 驗 ID token（issuer、audience、`email_verified`），email 要喺 `ADMIN_EMAILS`（`wrangler.toml` `[vars]`，逗號分隔） |
| Session | 32 bytes 隨機 token；D1 只存 SHA-256；cookie `__Host-session`：`HttpOnly; Secure; SameSite=Lax; Path=/`；TTL 30 日（`SESSION_DAYS` 常數，同 903-player） |
| CSRF | 改資料嘅請求要 `Origin` header = `WORKER_ORIGIN`，唔啱回 403；admin SPA 同 Worker 同源，唔使開 CORS |
| 授權 | 單一角色：白名單內 = 全部權限；`/api/*`（除 `health`）全部過 session middleware |
| `next` 參數 | 只接受同站相對 path，其他一律當 `/`（防 open redirect） |
| 輸入驗證 | 全部 body 經 `packages/catalog` validator；字串長度上限、id 格式、日期格式、色碼格式；SQL 一律用 bound parameter |
| R2 key 驗證 | 手動指定嘅 key：唔可以有 `..`、唔可以以 `/` 開頭；儲存前 `MEDIA.head(key)` 確認存在。⚠️ CR-004：專輯 `folder` 用同一條 `..` 規則，另外唔可以 `_` 開頭；API-031 嘅 key 一定要喺嗰張專輯嘅資料夾入面 |
| 刪除（ID 守衛） | ⚠️ CR-003：刪專輯 / 刪歌要 `?force=1`（冇就回 409 `ID_REMOVED`）；管理端二次確認講明聽眾本機嘅收藏同續播會失效 |
| 上載 | 只收 `image/webp｜jpeg｜png`；檢查 magic bytes（⚠️ CR-004 回寫：宣稱嘅類型要同內容一致；結構同尺寸都驗）；大細上限 `IMAGE_MAX_BYTES`（2 MB）；檔名由 server 計 hash，唔用客戶端檔名 |
| 掃描讀檔（⚠️ CR-004） | 歌曲文字檔：`size` 超過 `SONG_TEXT_MAX_BYTES` 唔讀；內容只經 `parseSongText()`，唔執行、唔當 HTML；回應唔帶原文以外嘅檔案內容。封面來源 Worker 唔讀：由管理端頁面向公開 bucket 攞，畫入 canvas 再輸出（唔會原樣轉存） |
| 歌曲文字 / 歌詞 | `SONG_TEXT_MAX_BYTES`（64 KB；⚠️ CR-003 取代 `LRC_MAX_BYTES`）、行數同每行長度上限、`CREDIT_MAX_CHARS`；常數放 `packages/catalog`，管理端同 API 共用；播放端用文字節點 render，唔用 `innerHTML` |
| 公開路由 | `/catalog/v1/*` 只回 `PLAYER_ORIGINS` 嘅 CORS；唔設 cookie |
| Header | `/api/*`、`/auth/*`：`X-Frame-Options: DENY`、`Content-Security-Policy: frame-ancestors 'none'`、`Cache-Control: no-store`、`Referrer-Policy: no-referrer`、`X-Content-Type-Options: nosniff`（後兩個係 CR-003 同步 T-021 嘅實作）；admin 靜態檔用 `apps/admin/public/_headers` |
| Secret | `GOOGLE_CLIENT_SECRET`、`SESSION_SECRET` 用 `wrangler secret`；本機 `.dev.vars`（gitignore）；CI 嘅 Cloudflare token 只畀 deploy job（同 903-player `deploy-api.yml` 兩個 job 分隔） |
| 搜尋引擎 | 播放端：`<meta name="robots" content="noindex,nofollow">` + `robots.txt` + Vercel `X-Robots-Tag`；Worker 所有回應加 `X-Robots-Tag: noindex` |
| 媒體 | `rb-discography`（⚠️ CR-004）係公開網址（Functional Spec C2 / R-1，用戶已接受）；bucket 唔開 listing；CORS 容許 `PLAYER_ORIGINS`（MV 音量、字體）同管理端 origin（`WORKER_ORIGIN`：掃描套用封面時攞原圖），連本機開發用嘅 origin。而家入面仲有歌詞文字檔同（可選）字體檔：CORS 擋唔到直接下載（Functional Spec R-16） |

---

## 性能考量

| 項目 | 設計 |
| --- | --- |
| 預期負載 | 自用：個位數用戶；Worker / D1 / R2 用量遠低於免費額度級別，唔使做容量規劃 |
| 首次載入 | Preload 期間並行載：catalog（有 timeout，失敗用本機版本）、當前專輯封面、字體。進度 = 已完成項目 ÷ 總數。⚠️ CR-004：字體一項有逾時；bucket 字體失敗就用內建 Rokkitt，唔卡住 |
| Bundle | 電視、歌詞、Info、非手機版面各自 lazy chunk；主 chunk 只有 Preload + 主頁 + Wheel + 歌單 + 播放 |
| 圖片 | 每張封面兩個尺寸：`cover` 1200（揀中嘅碟）、`thumb` 320（Wheel 兩旁嘅碟）；hash 檔名 + `immutable`；Service Worker CacheFirst |
| 歌詞 | 唔放入 catalog；㩒歌詞掣或者歌開始播時先載嗰首歌嘅 JSON；CacheFirst |
| Catalog | 291 首歌（⚠️ CR-004；之前 262）、唔含歌詞，估計 < 170 KB（gzip 後更細）；`max-age=60` + ETag，返回前景時重新驗證。⚠️ CR-003：「儲存即生效」= 播放端下次啟動或者返回前景時攞到，最遲約 60 秒 |
| 音檔 / MV | R2 公開網址直出，瀏覽器用 Range 邊下邊播；Service Worker **唔攔截**媒體請求；`preload="metadata"` |
| 動畫 | 只郁 `transform` / `opacity`；轉動嘅碟同唱臂用獨立合成層；模糊層只喺 overlay 開住時存在；旗幟 canvas 有 DPR 上限同可調網格密度。⚠️ CR-003：零件喺同一個 SVG 入面，獨立合成層保證唔到；真機預覽（Implementation Plan R-005）要量轉碟時嘅 fps，唔夠就將隻碟抽出嚟做獨立一層 |
| 時間更新 | 進度圈 / 時間用 `timeupdate`（約 4 次 / 秒）；歌詞畫面開住時用 `requestAnimationFrame` 讀 `currentTime`，收埋就停 |
| D1 | 全部查詢行數以百計；專輯列表嘅完整度用一條 `GROUP BY`。⚠️ CR-003：每次寫入之後重新讀全部專輯同歌砌 catalog（幾百行） |
| 瓶頸 | ① 旗幟網格（Functional Spec R-5，M0 真機量度）② iOS 模糊濾鏡喺舊機嘅 fps（唔夠就改用預先模糊嘅靜態截圖）③ r2.dev 網址有速率限制（見 T2） |

---

## 部署架構

| 項目 | 設計 |
| --- | --- |
| 環境 | 本機（miniflare，唔使 Cloudflare 帳戶；`wrangler dev --local-protocol https`）＋ Production。唔設 staging（自用）。⚠️ CR-003：冇草稿，喺 Production 管理端儲存即係改播放端內容 |
| 播放端 | Vercel：`buildCommand = npm run build -w apps/player`、`outputDirectory = apps/player/dist`；只部署 production branch（feature / fix / claude branch 關閉，同 903-player `vercel.json`）。⚠️ CR-003 決定 12、13：未有 `main` 之前，Phase B spike 頁都放 Vercel；用邊條 branch 部署見 Implementation Plan A-7（待用戶確認） |
| 播放端 cache | `sw.js`、`index.html`、`manifest.webmanifest`：`Cache-Control: no-cache`；`assets/*`（有 hash）：`immutable` |
| Worker | `wrangler deploy`；admin SPA 係 Worker 嘅 static assets（`[assets] directory = "../admin/dist"`、`not_found_handling = "single-page-application"`、`run_worker_first = ["/api/*", "/auth/*", "/catalog/*"]`） |
| Bindings | `DB`（D1 `r-gram`）、`CATALOG`（R2 `r-gram-catalog`）、`MEDIA`（R2 `rb-discography`；⚠️ CR-004：bucket 改名，binding 名不變。`apps/api/wrangler.toml` 仲寫 `r-gram-media`，由 T-098 改） |
| `[vars]` | `GOOGLE_CLIENT_ID`、`ADMIN_EMAILS`、`PLAYER_ORIGINS`、`WORKER_ORIGIN`、`MEDIA_BASE`（只改 `wrangler.toml`，每次 deploy 會蓋走 dashboard 改動，同 903-player） |
| 播放端 build 變數 | `VITE_CATALOG_URL`（Worker 嘅 `catalog.json` 網址）；⚠️ CR-004（建議名，T-044 定案）：`VITE_SLAB_FONT_URL`（可選：媒體 bucket 嘅 slab 字體檔網址）、`VITE_SLAB_FONT_BOLD_URL`（可選：較粗嘅檔） |
| CI：`ci.yml` | 非 production branch push：lint、`tsc -b`、unit、build、e2e；淨改 docs 用 job 層 `if:` 跳過（SK-025） |
| CI：`deploy-api.yml` | production branch 改到 `apps/api`、`apps/admin`、`packages/catalog` 先跑：build job（冇 secret：lint + test + build admin）→ deploy job（有 secret：apply D1 migration → `wrangler deploy`） |
| 版本 | 播放端：`apps/player/package.json` version，build time 注入（Vite `define` + `index.html` placeholder）；管理端顯示 `apps/api/package.json` version |
| Rollback | 播放端：Vercel 回上一個 deployment；Worker：`wrangler rollback`；D1 migration 只加唔減（向前修正） |
| Seed | `npm run seed -w apps/api -- --local｜--remote`：讀 `seed/discography.json` → D1（`INSERT … ON CONFLICT DO NOTHING`）；讀 `seed/credits.json` 填 credit（只填而家係 `NULL` 嘅欄，唔蓋管理端改過嘅值）；下載 `coverUrl` → R2 `img/`（已有封面嘅專輯跳過）；完成後印出冇 credit 嘅歌。⚠️ CR-004：寫入 `category`、`category_no`（`folder` 留 NULL = 用預期資料夾名）；資料係 21 個發行、291 首歌（T-097 重新生成之後）；封面照 Functional Spec D48（待確認）：320 縮圖由 script 自己出，細過 1200 嘅唔放大，完成後列出細過 1200 同冇封面嘅專輯。⚠️ CR-003：冇上架欄，seed 完全部專輯同歌即刻入 catalog；seed 之後要生成一次 catalog（做法由 T-027 定案，見 API-070 `NOT_READY`） |
| Seed credit 配對 | 純函數 `matchCredits(discography, credits)`（有 unit test）：① 專輯 id + 歌號 + 歌名完全一樣 → 直接用；② 否則搵任何專輯同名而且有 credit 嘅行 → 用嗰行；③ 都冇 → 留空。值係「—」當冇。~~現有資料結果：187 / 22 / 53（共 262）~~ ⚠️ CR-004：呢組係舊資料嘅結果，作廢；新資料（291 首、credit 252 行）嘅結果由 T-097 報告，唔可以估 |

### 用戶要喺 dashboard 做嘅設定（一次性）

| # | 設定 | 備注 |
| --- | --- | --- |
| 1 | Cloudflare：R2 bucket **`rb-discography`**（⚠️ CR-004：用戶已開；之前寫 `r-gram-media`），開公開存取，設 CORS：容許播放端 origin **同管理端 origin**（Worker 嘅網址），連本機開發嘅 origin；`GET`、`HEAD`；容許 `Range` header | CORS 係 MV 音量旋鈕（Web Audio）、跨 origin 字體、同管理端攞封面原圖嘅必要條件 |
| 2 | Cloudflare：開 R2 bucket `r-gram-catalog`（private） | |
| 3 | Cloudflare：開 D1 database `r-gram`，將 id 填入 `wrangler.toml` | |
| 4 | Google Cloud：開 OAuth client，redirect URI = `<WORKER_ORIGIN>/auth/google/callback` 同 `https://localhost:8787/auth/google/callback` | |
| 5 | Worker secret：`GOOGLE_CLIENT_SECRET`、`SESSION_SECRET` | |
| 6 | GitHub secret：`CLOUDFLARE_API_TOKEN`（Workers Scripts / D1 / R2 Edit）、`CLOUDFLARE_ACCOUNT_ID` | |
| 7 | Vercel：開 project 連 repo，設 `VITE_CATALOG_URL` | |

---

## 待確認技術決定

| # | 題目 | 建議 | 另一個選擇 |
| --- | --- | --- | --- |
| T1 | 播放端寄存 | **Vercel**（同 903-player，設定可以照抄）✅ 用戶 2026-11-25 確認（CR-003 決定 13：spike 頁都放 Vercel） | Cloudflare（Workers static assets）：全部喺一個平台，但要自己寫 cache header 同部署 workflow |
| T2 | 媒體公開網址 | **先用 `r2.dev`**（同 903-player 音檔一樣，唔使網域）；`MEDIA_BASE` 係設定值，之後轉自訂網域只要改設定再生成一次 catalog（API-061） | 一開始就用自訂網域：冇速率限制、可以經 Cloudflare cache，但要你有網域 |
| T3 | Branch 模式 | **只用 `main`**（同 903-player：feature branch → PR → `main`，`main` = production）✅ 用戶 2026-11-25 確認（CR-003 決定 12）：雲端 session 期間全部喺 `claude/charming-cannon-8yulp0` 做，第一個可用版本由用戶開 PR 入 `main` | 團隊預設嘅 `main` + `develop` |
| T4 | 資源命名 | Worker `r-gram-api`、D1 `r-gram`、R2 ~~`r-gram-media`~~ **`rb-discography`**（✅ 用戶 2026-11-25 指定，CR-004 決定 2）+ `r-gram-catalog` | 你指定 |
| T5 | 媒體檔格式建議 | 音檔 AAC `.m4a`（或者 MP3）；MV H.264 + AAC `.mp4`、最高 1080p、**要 fast start**（moov atom 喺檔頭，否則要下載晒先播到） | — |
| T6 | 多碟專輯檔名 | 歌號用連續編號（同歌單一樣：第二隻碟第一首 = `16 …`），唔支援 `2-01` 呢種寫法 | 支援 `碟-歌` 格式（規則複雜啲） |

---

## 技術風險

| 風險 | 可能性 | 影響 | 應對方案 |
| --- | --- | --- | --- |
| iOS 要喺用戶手勢入面先播到聲，但設計係㩒 play 之後約 1.5 秒（落針）先出聲 | 高 | 高 | 手勢入面即刻解鎖 `<audio>`（靜音 `play()`），落針嗰刻先由頭出聲；M0 真機驗證（見實現注意事項 1）。設計稿第 17 版：唱針開場本身係 0.81 秒（轉入 0.65 + 放低 0.16）；由手勢到出聲嘅總時間（連歌單收返）喺 T-010 / T-038 量 |
| iOS 背景 / 鎖屏自動播下一首失敗 | 中 | 高 | 用同一個 `<audio>` 喺 `ended` 入面換 `src` 再 `play()`；唱片播放**唔經** Web Audio（AudioContext 喺背景會被暫停）；903-player 已有同類經驗；M0 驗證 |
| MV 音量旋鈕（Web Audio gain）喺 iPhone 唔穩定，或者 CORS 設錯導致冇聲 | 中 | 中 | M0 驗證；特徵檢測：`video.volume` 可寫就直接用（電腦 / Android）；唔得先行 Web Audio；兩樣都唔得就退做靜音開關 |
| 主頁改版令 v16 幾何數值作廢 | 高（已確定會改） | 中 | 幾何資料表同元件分離；改版 = 換數值 + 主頁排版元件 |
| 旗幟 canvas 喺真機 fps 唔夠 | 中 | 中 | 可調網格密度同 DPR 上限；最後手段改 WebGL |
| `r2.dev` 速率限制影響串流 | 低（自用） | 中 | T2：轉自訂網域，只係改設定 |
| MP4 冇 fast start，MV 要等好耐先播 | 中 | 中 | T5 寫入用戶準備檔案嘅指引；掃描時讀檔頭頭幾 KB 檢查 `moov` 位置並出警告（P1） |
| Duo / HomeView 尺寸係模擬器量度值 | 中 | 低 | 用範圍判斷唔用固定值；真機有出入只改 `config/layout.ts` |
| 加裝置版面改壞現有裝置 | 中 | 高 | 截圖比對工具（M6 之前建立），每個版面 PR 必跑 |
| Lubalin Graph 只喺有裝嘅機出現，其他機係 Rokkitt，字闊唔同（⚠️ CR-004：bucket 有字體檔時所有機都係 Lubalin Graph） | 高 | 低 | 版面以 Rokkitt 嘅字闊做準；兩隻字都要喺 e2e 截圖驗；字體載入後重新量字（T-044） |
| ⚠️ CR-004：一次掃描要讀好多歌曲文字檔，撞到 Worker 每個請求嘅 R2 操作上限 | 中 | 中 | ETag 冇變嘅唔讀；仍然超過就分批；上限嘅數值同計法由 T-025 照 Cloudflare 文件核實 |
| ⚠️ CR-004：媒體 bucket 嘅 CORS 冇包管理端 origin，掃描套用封面時攞唔到原圖；或者冇包播放端 origin，bucket 字體載入失敗 | 中 | 低 | 管理端顯示明確原因；字體失敗跌去內建 Rokkitt；Implementation Plan U-1 列明兩邊 origin |
| ⚠️ CR-004：bucket 嘅檔同管理端兩個入口，掃描建議蓋走管理端改過嘅內容 | 中 | 中 | `cover_source_etag`、`text_source_etag`：只建議未套用過或者改過嘅檔；確認先套用（Functional Spec D41、R-17） |
| ⚠️ CR-004：內容資料重新生成改到 seed 入面嘅 id 或者歌號，令測試 fixture 同設計稿示範資料對唔上 | 中 | 低 | 已有 16 個 id 唔變（script 用明確對照表）；寫死嘅數喺 T-097 一齊改；設計稿係設計成品，唔跟資料更新 |
| 檔名有中文 / 空格 / 特殊符號導致網址錯 | 中 | 中 | 逐段 `encodeURIComponent`；`matchMediaFiles` 同砌網址都有 unit test 覆蓋真實檔名 |
| 刪除 / 改 id 令用戶本機收藏失效 | 低 | 中 | id 不可改；⚠️ CR-003：ID 守衛搬去刪除（API-014、API-022，409 `ID_REMOVED`） |
| ⚠️ CR-003：儲存即生效而且冇版本記錄，儲存錯咗喺介面冇得還原 | 中 | 中 | 人手儲存、逐行驗證、清走成段歌詞同刪除要再確認；D1 嘅時間點還原做最後手段（T-028 確認並寫入操作清單）；Functional Spec R-14 |
| ⚠️ CR-003：catalog 生成失敗令 D1 同 `catalog.json` 唔一致 | 低 | 中 | `catalog_state.status = 'failed'` + 管理端提示同重試（API-061）；R2 寫入係成個檔取代，舊檔一直有效 |

---

## 實現注意事項

1. **iOS 播放解鎖**：`audioEngine.prime(src)` 一定要喺 click / pointerup handler 入面同步叫：設 `src`、`muted = true`、`play()`。落針時 `currentTime = 0`、`muted = false`。唔可以用 `volume`（iPhone 唯讀）。MV 嘅 `<video>` 同樣處理。呢個係 M0 第一個要驗證嘅嘢，結果會決定 `audioEngine` 介面。
2. **唱片播放唔經 Web Audio**：只有 MV 嘅 `<video>` 先接 `GainNode`。`<video>` 要 `crossorigin="anonymous"` + `playsinline`；`AudioContext` 喺 MV 掣嘅手勢入面 `resume()`。
3. **一個 `<audio>` element 用到尾**：換歌只換 `src`，唔好重新建立 element（iOS 解鎖狀態跟 element）。
4. **Media Session**：每次換歌更新 `metadata`（歌名、碟名、封面 `thumb` + `cover`）；註冊 `play`、`pause`、`previoustrack`、`nexttrack`、`seekto`。
5. **播放隊列係純函數**（`playback/queue.ts`）：輸入（歌曲列表、當前歌、模式、隨機數來源）→ 輸出下一首。隨機數來源由外面注入，test 先可以固定結果。Shuffle 用 Fisher–Yates，一輪之內唔重覆；只計有 `audio` 嘅歌。
6. **Favourites 係虛擬專輯**：`favouritesAlbum(catalog, favourites)` 砌出一個同真專輯同型別嘅物件（id = 保留字 `favourites`），Wheel、歌單、隊列全部當普通專輯用，唔使特別分支。catalog 入面搵唔到嘅收藏歌保留喺本機，但唔顯示。
7. **LRC parser 只有一份**（`packages/catalog/lrc`）：管理端即時驗證、API 儲存驗證、轉 JSON 都用佢。時間戳格式 `[mm:ss]`、`[mm:ss.x]`、`[mm:ss.xx]`、`[mm:ss.xxx]`；一行多個時間戳要拆開；輸出按 `t` 排序。 ⚠️ CR-003：入口改為 `parseSongText()`（`packages/catalog/song-text`），佢將歌詞部分交畀 `parseLrc()`；見「CR-003 對技術設計嘅影響」。
8. **歌詞當前行**：對 `lines[].t` 做 binary search；`activeLine(lines, ms)` 係純函數。
9. **掃描配對規則**（`packages/catalog/scan`）：檔名（唔計資料夾）開頭嘅 1–3 位數字 = 歌號；副檔名分類：`m4a`、`mp3` → audio；`mp4`、`m4v` → mv；其他 → `UNKNOWN_EXTENSION`。同一個歌號同一類有多過一個檔 → `conflicts`，唔自動揀。比對唔分大細楷。⚠️ CR-004：加兩類：`cover.jpg`／`cover.png`（冇歌號）→ 封面來源；開頭有歌號嘅 `txt` → 歌曲文字。完整分類表見「CR-004 對技術設計嘅影響 → 掃描嘅設計」。
10. **Design token**：開發第一步由 `anim.js` 檔頭常數生成 `apps/player/src/styles/tokens.css`（色、字級、陰影）同 `config/motion.ts`。時長分兩組：回饋類 `--motion-feedback-*`（≤ 300ms）同場景類 `--motion-scene-*`（旗幟淡出、落針、電視彈出、歌單進出；Functional Spec D1 已接受超過 300ms）。唔可以喺元件寫死毫秒數。
11. **減少動態**：CSS 動畫放喺 `@media (prefers-reduced-motion: no-preference)`；JS 喺動畫開始嗰刻先讀設定（唔 cache）；唔可以因為等 `animationend` 而卡住狀態機。狀態轉換要有「冇動畫」路徑，test 行呢條路。
12. **PWA 更新**（`pwa/updateManager.ts`，同 903-player）：啟動、`visibilitychange`、定時叫 `registration.update()`；新 SW 喺 waiting 等；播放狀態係 `idle` / `paused` 先 `SKIP_WAITING` → `controllerchange` → reload 一次（`sessionStorage` 防 loop）。
13. **畫面固定**：`html, body { height: 100dvh; overflow: hidden }`；舞台自己處理 `env(safe-area-inset-*)`；歌單 / Wheel / 歌詞嘅捲動係元件內部手勢，唔係頁面捲動；要 `touch-action: none` 防止 iOS 回彈。
14. **無障礙**：Wheel 同歌單用 `role="listbox"` + `aria-activedescendant`；所有 icon 掣 `aria-label`；停用掣用 `aria-disabled`（保持可 focus）；旋鈕用 `role="slider"` + `aria-valuenow`。
15. **介面文字（管理端同播放端）**：集中喺各自嘅 `src/i18n/zh-Hant.ts`，書面語；加 test 鎖住唔出現口語字（同 903-player `writtenChinese.test.ts`）。詳見「CR-002 對技術設計嘅影響」i18n 幾行。
16. **測試策略**：

    | 層 | 範圍 |
    | --- | --- |
    | Unit（Vitest） | `packages/catalog` 全部；`playback/queue`、`stageReducer`、`favouritesAlbum`、`activeLine`、`catalog/loader`（核心邏輯覆蓋率 ≥ 80%）；Worker route 喺 workerd 跑（真 D1 / R2 模擬） |
    | 元件（Testing Library） | 掣嘅狀態 / `aria`；歌單、Wheel 鍵盤操作 |
    | E2E（Playwright） | 播放端：假 catalog + 本機模擬媒體 server，行 Functional Spec 整體驗收第 1 項；管理端：mock `/api`、`/auth`（唔使 Google） |
    | 截圖比對 | 每種裝置 × 主要場景；加裝置版面時證明現有裝置零改變 |
    | 真機（人手） | M0 spike 項目；iOS 鎖屏 / 背景；PWA 安裝同自動更新 |

17. **Project `CLAUDE.md`**：scaffold 時建立，寫入 QA chain 清單、unit / e2e 指令、T3 嘅 branch 模式、雲端 sandbox 嘅 Playwright 路徑。

---

## Functional Spec 對照

| Functional 需求 | 技術落點 |
| --- | --- |
| FR-001 旗幟 + 真實進度 | `components/flag`、`catalog/loader`（進度事件） |
| FR-002–FR-006、FR-025 主頁 / Wheel / 歌單 / 播放 | `stage/layouts/phone.ts`、`stageReducer`、`components/*`、`playback/audioEngine` |
| FR-007、FR-024 自動下一首、Shuffle / Repeat | `playback/queue.ts`、`playModes.ts` |
| FR-008 內容載入 + fallback | API-070、`catalog/loader`、`rgram.catalog.v1` |
| FR-009 PWA | vite-plugin-pwa、`pwa/updateManager`、Vercel cache header |
| FR-010 無障礙 / 減少動態 | 實現注意事項 11、14 |
| FR-011 noindex | 安全設計「搜尋引擎」 |
| FR-012、FR-026 MV 電視 + 旋鈕 | `components/tv`、`mv/videoEngine`、`mv/volumeGain` |
| FR-013 歌詞 | API-072、`lyrics/*`、`components/lyrics` |
| FR-014 鎖屏控制 | `playback/mediaSession.ts` |
| FR-015 續播 | `playback/resume.ts`、`rgram.resume.v1` |
| FR-016、FR-023 收藏 + Favourites 碟 | `favourites/*`、`rgram.favourites.v1` |
| FR-017、FR-030 Info + 歌曲 credit | `components/info-panel`；catalog `tracks[].credits` |
| FR-117–FR-119 credit、由同名歌帶入、歌詞參考連結 | API-041（credit 經歌曲文字）、API-024、API-021、`tracks` credit 欄 + 參考欄 |
| FR-018、FR-027–FR-029 裝置 | `config/layout.ts`、`stage/layouts/*`、`rotate-notice` |
| FR-101 Login | API-001–004、`auth/*`、`sessions` |
| FR-102–FR-104 專輯 / 封面 / 歌 | API-010–023、API-050、`albums`、`tracks`、`assets` |
| FR-105 掃描 | API-030–032、`packages/catalog/scan`（⚠️ CR-004：連封面來源同歌曲文字檔，FR-123，見「CR-004 對技術設計嘅影響」） |
| FR-106、FR-110、FR-120 歌詞同歌曲文字（⚠️ CR-003） | API-040、API-041、API-043、`tracks`、`lyrics`、`packages/catalog/song-text`、`packages/catalog/lrc` |
| FR-121 儲存即生效（⚠️ CR-003：FR-107、FR-113、FR-116 已刪） | `rebuildCatalog()`、API-061、`catalog_state` |
| FR-108 初始匯入 | `apps/api/scripts/seed.mjs`、`matchCredits()`；⚠️ CR-004：`_design_/tools/`（重新生成 seed）、`category`／`category_no` |
| FR-109 公開讀取 | API-070–072 |

---

## CR-002 對技術設計嘅影響

Backend、API、資料庫、部署**全部唔受影響**。受影響嘅只有 `apps/player`。本節取代上文同佢有出入嘅地方。

| 範疇 | v1.0 | v1.1 |
| --- | --- | --- |
| 場景狀態機 | `scene`：`preload → home ⇄ wheel → list → home`；`overlay`：`mv`｜`lyrics`｜`info` | `scene`：`preload → home ⇄ discChange`、`home ⇄ list`；`overlay`：`mv`｜`booklet`。冇 `lyrics`、`info` |
| 播放狀態 | `idle`｜`loading`｜`playing`｜`paused`｜`error` | 不變。新增衍生值：唱片夾顯示（冇 icon／play／pause + 進度圈／play + 進度圈）由 `scene` + 播放狀態計出嚟 |
| 幾何資料表 | 初版數值由 v16 `anim.js` 抄入 | 初版數值由 `_mockups_/home-turntable/src/template.html` 嘅常數抄入（`DISC`、`PLATTER`、`ARM`、`BUTTONS`、`KNOB`、`SCALE`、`DIAL`、`ORBIT`、`LIST`、`ARC`、`CREDITS`、`TV`）。唱臂、旗幟、金屬質感、電視外觀仍然參考 v16。⚠️ 第 17 版（已確認）新增：`PLAIN_LAYOUT`、`PLAIN`、`LONG`（歌書歌詞）、`ARM_LIFT`、`ARM_IN`（唱臂）、`DIAL_ALL_UP_TO`、`DIAL_MAX_LETTERS`、`DIAL_CLEARANCE`、`DIAL_DOT`（字母盤） |
| 旋鈕位置 | — | 唔寫死：`KNOB.x = round(platterLeftAt(KNOB.y) / 2)`，其他裝置版面轉盤位置唔同都啱 |
| 刻度同字母盤 | Wheel 錶盤（SVG） | `positions = 專輯數 + 1`；角度 = `fromDeg + pos × (toDeg − fromDeg) ÷ 專輯數`（⚠️ CR-003 決定 2：弧固定 185°–376.25°，♥ 喺 `toDeg`；之前係固定每格 `step`，格數按已上架專輯數）；刻度同字母共用同一個函數 |
| 元件 | `wheel/`、`lyrics/`、`info-panel/` | 刪走；改為 `knob/`（旋鈕 + 刻度 + ♥）、`dial-ring/`（字母盤）、`booklet/`（曲詞編監 + 弧線歌詞；第 17 版：加純文字歌詞嘅直身一欄）、`spindle/`（固定唱片夾）、`platter/` |
| 碟 | 碟芯連唱片夾係碟嘅一部分 | 碟係空心環（封面用 evenodd clip 挖走碟孔）；唱片夾係獨立元件，DOM 次序緊接喺而家隻碟後面（之後嘅碟蓋過佢） |
| 弧線排列 | `drawList()` 邏輯重用 | 歌單同歌書共用一個純函數 `arcRows(centre, radius, stepDeg, focusIndex)`，輸出每行位置同淡出值 |
| 文字長度 | — | `fitText()`：量度文字闊度（canvas `measureText`），按 D23 縮字或者用「…」（歌名）；純函數部分（決定用邊個策略）有 unit test。⚠️ 第 17 版（D22 修訂）：歌詞行唔用跑馬燈；而家嗰行先縮字（44 → 32），仍然放唔落就用 `wrapLine()` 喺框入面斷行（`fitLyricLine()` 決定策略）；其他行同純文字歌詞嘅處理見「播放端設計稿第 17 版嘅技術設計」 |
| Favourites 碟面 | — | App 內建靜態圖（唔經管理端）：由用戶提供嘅 logo 生成嘅透明 PNG／SVG；正式用要高清檔 |
| Catalog | 專輯有 `type`、`label`、`releaseDate` | 播放端唔再用 `type`、`label`、`releaseDate`（只用 `year`）；欄位照留喺 catalog，方便之後用，唔影響 API |
| 淨空規則 | — | `stage/layouts/*.test.ts`：對每份幾何表驗 Functional Spec CR-002 嘅淨空規則（掣同 CD ≥ 16、控件同轉盤 ≥ 40、細掣同旋鈕 ≥ 40、螺絲周圍 120、旋鈕左右空白相差 ≤ 2、感應範圍 ≥ 44pt 唔重疊）。加裝置版面時同一組測試照跑。⚠️ CR-003：44pt 以 390pt 闊做基準；「唔重疊」同「螺絲周圍」要對任何專輯數都成立（測試掃 1 至 30 張） |
| 動畫 | scene token | 新增：轉碟 0.5s（字母盤、其他碟滑入、唱臂同細掣淡出）、指針轉動 0.5s；全部用現有 `--motion-scene-*`；preview 嘅做法（只改 `transform`／`opacity`，靠 CSS transition）可以照用 |
| 字母盤過場（FR-038） | — | 底盤：`scale` 由 0.42（內圈貼旋鈕邊）去 1，0.5s，打開用回彈曲線；字母：每個獨立 `transform` + `opacity`，0.26s，用 `transition-delay` 做順時針逐個出（打開每格 14ms、收返每格 8ms，由最尾一格先收）。延遲由格數計，唔寫死 17。⚠️ CR-003：打開嘅總時間固定 0.5s，每格延遲 = (0.5s − 0.26s) ÷ (格數 − 1)，最多 14ms（做法跟設計稿第 17 版 `DIAL_MOTION`，T-036 定案）。第 17 版：出細點嘅格同字母用同一組 `transform` + `opacity` 同延遲 |
| MV 電視過場（FR-038） | 升起 + CRT 開熄（v16） | CSS keyframes：`tvRise` 0.8s（回彈）→ `crtOn` 0.22s（0.7s 開始）；`crtOff` 0.15s → `tvDrop` 0.45s；天線 `scale` 彈出／縮返；背後模糊層疊喺清晰層上面做 `opacity` 淡入淡出（唔對 `filter: blur` 做動畫，慳 GPU）。熄機期間（約 0.63s）鎖住電視掣，完咗先轉場景狀態。時長全部入 `config/motion.ts` |
| 歌書過場（FR-038） | — | 打開 0.4s：暗層 `opacity`；框線以唱片夾嗰邊做原點 `scaleX(0 → 1)`（`vector-effect: non-scaling-stroke`）；歌詞每行以碟心做原點 `rotate(k × step → 0)` + `opacity`；曲詞編監逐行 `translateX` + `opacity`（每行遲 40ms）；左上資訊黑字墊底、白字淡入。收返 0.24s 倒轉，期間鎖住 i 掣，完咗先轉場景狀態。歌單日後要加過場可以重用同一組（`arcRows()` 已經以碟心做原點） |
| 減少動態效果 | `prefersReducedMotion` | 上面三組過場喺 `prefers-reduced-motion: reduce` 下時長 = 0，狀態即時切換 |
| i18n（FR-037） | 管理端 `apps/admin/src/i18n/zh-HK.ts` | 播放端加 `apps/player/src/i18n/`：`zh-Hant.ts`（語言檔，`as const`）、`t.ts`（有型別嘅 `t(key, params)`，key 打錯 = 編譯錯）、`locale.ts`（揀語言：而家固定 `zh-Hant`；之後按 `navigator.languages` 揀，冇對應就退返 `zh-Hant`）。管理端語言檔改名 `zh-Hant.ts`，同一套 `t()`。唔用第三方 i18n 套件（同 903-player 一樣，文字量少） |
| 書面語測試（FR-037） | 只限管理端 | 兩個 app 各一個 `writtenChinese.test.ts`：掃語言檔每一句，見到口語字（`嘅咗唔喺嚟啲佢冇睇嗰咁啱俾嘢揾搵乜咩撳㩒㗎囉嘞噉`）就 fail。只掃語言檔，唔掃 catalog 資料（歌名可以有口語字） |
| 寫死文字測試（FR-037） | — | `apps/player` 加一個 test：`src/components/**` 同 `src/app/**` 嘅 `.tsx` 唔可以出現中文字面值（要經 `t()`）；`aria-label` 一樣 |
| `<html lang>`、manifest | — | `index.html` `lang="zh-Hant"`；PWA manifest `lang: "zh-Hant"`，`name`／`description` 用書面語 |
| MV 音量旋鈕 | Web Audio gain | 不變 |

### Functional Spec 對照（CR-002 新增／改動）

| Functional 需求 | 技術落點 |
| --- | --- |
| FR-031 固定唱片夾 + 空心碟 | `components/spindle`、`components/disc`（空心環）、`stage` 層次規則 |
| FR-032 淨空同感應範圍規則 | `stage/layouts/*.test.ts` |
| FR-033 歌書 | `components/booklet`、`lyrics/activeLine.ts`、`stage/arcRows.ts`、catalog `tracks[].credits` |
| FR-034 Preload 文字 | `components/flag`（版本號用 build 注入嘅值） |
| FR-035 刻度同字母盤自動生成 | `components/knob`、`components/dial-ring`、catalog `albums[].wheelKey` |
| FR-036 超長文字 | `utils/fitText.ts`（歌名）；第 17 版：歌詞行用 `wrapLine()`、`fitLyricLine()`（`lyrics/`） |
| FR-037 介面語言同 i18n | `apps/player/src/i18n/`、`apps/admin/src/i18n/`、兩邊嘅 `writtenChinese.test.ts`、寫死文字測試 |
| FR-038 過場動畫 | `components/dial-ring`、`components/booklet`、`components/tv`、`config/motion.ts`、`utils/motion.ts` |
| FR-017 Info | 刪 |

## CR-003 對技術設計嘅影響

同 CR-002 唔同，今次 Backend、API、資料庫都受影響。本節取代上文同佢有出入嘅地方；受影響嘅表已喺原位改（標 ⚠️ CR-003）。「狀態」欄對應 Functional Spec D30–D39 嘅行：用戶 2026-11-25 已確認（D33 係技術決定，唔使用戶確認；D35 等管理端設計稿第 2 版確認）。寫「等確認」嘅係設計稿，確認之前靠佢嘅任務唔開工：播放端設計稿第 17 版用戶 2026-11-25 已確認，淨返管理端設計稿第 2 版。

| 範疇 | v1.1 | v1.2 | 狀態 |
| --- | --- | --- | --- |
| 內容流程 | 草稿（D1）→ 發佈 → `catalog.json` | 冇草稿：每個成功嘅寫入請求之後即刻 `rebuildCatalog()`（D1 → document → validator → R2 `catalog.json`，hash 冇變就唔寫）。做成 `/api/*` 寫入 route 嘅後置步驟，各 route 唔使自己叫 | 決定 7 已確認；做法 D30 已確認（用戶 2026-11-25） |
| 生成失敗 | 發佈失敗唔影響播放端 | R2 寫入係成個檔取代，失敗 = 舊檔仍然有效。D1 已寫入嘅修改唔還原：`catalog_state.status = 'failed'`，回應帶 `catalog.ok = false`，管理端出提示同重試（API-061） | D30 已確認 |
| 上下架 | `albums.enabled`、`tracks.enabled`；catalog 只包已上架 | 兩欄刪走；catalog 包全部專輯同歌；API-013、API-021 冇 `enabled` | 決定 7 已確認 |
| 發佈記錄 | `publishes`：記錄、diff、ID 守衛、還原 | 刪；改為單行 `catalog_state` | D30 已確認 |
| ID 守衛 | 發佈時比對上次嘅 id | id 只會因為刪除而消失：守衛搬去 API-014、API-022（`?force=1`） | D30 已確認 |
| 歌曲輸入 | API-021 改欄位；API-041 存 LRC | `packages/catalog/song-text/`：`parseSongText()`、`formatSongText()`、round-trip 測試。API-040 / API-041 改為讀 / 寫成首歌嘅文字；API-020 用同一個 body 新增 | 決定 8 已確認；格式 D31、D37 已確認（D31 由決定 8、D32、D37 完全決定） |
| 純文字歌詞 | 冇（`NO_TIMED_LINES`） | 歌詞 JSON 加 `synced`；`synced = false` 時 `lines[]` 冇 `t`；`lyrics.synced`；播放端 `activeLine()` 只喺 `synced` 用 | D32 已確認（取代 Functional Spec C4） |
| 儲存欄位 | 結構化 | 不變；`lyrics.lrc` 改名 `source` | D33：技術決定（冇用戶睇得到嘅影響），唔使用戶確認 |
| 批量匯入、同名歌 | API-043、API-024、API-044 | API-043 只換歌詞部分；API-024 回同名歌嘅歌曲文字；API-044 刪 | D34 已確認 |
| 統計 | API-010 每張專輯嘅完整度 | API-010 加全站統計（專輯數、歌曲數、有音檔 / 歌詞 / MV 嘅歌數、有封面嘅專輯數） | 決定 9 已確認；項目 D35 **待確認**（等管理端設計稿第 2 版） |
| 場景零件 | 逐個元件 `<div>` / `<img>` / inline SVG | 單一 `<svg>` 畫布（`stage/StageSvg.tsx`），零件係 React SVG 元件；共用 `<defs>`（`metal/SvgDefs.tsx`、`defIds.ts`） | 決定 4 已確認（T-033 已做） |
| 高身手機 | 舞台 9:16 按比例 | `StageSvg`：「貼頂」組唔郁，「貼底」組 `translate(0, extraUnits)` | 決定 1 已確認（T-033 已做） |
| 刻度弧 | 角度 = `fromDeg + pos × stepDeg`（固定 11.25°） | 幾何表 `scale: { fromDeg: 185, toDeg: 376.25, … }`，刪 `stepDeg`；`scaleAngle(layout, pos, albumCount)` = `fromDeg + pos × (toDeg − fromDeg) ÷ albumCount`；♥ 永遠喺 `toDeg` | 決定 2 已確認；設計稿第 17 版已確認（2026-11-25） |
| 淨空測試 | `SUPPORTED_POSITIONS = [8, 9, 10, 15, 16, 17, 18]` | ♥ 位置固定，感應範圍同螺絲規則同專輯數無關：測試改為掃 1 至 30 張全部過。唔設專輯數硬上限。字母盤可讀性：⚠️ 第 17 版由 `dialShowsLetter()` 處理（碟多時每幾格先出一個字母，其餘出細點），唔使縮字；呢條規則有自己嘅 unit test（見「播放端設計稿第 17 版嘅技術設計」） | 決定 2 已確認；字母規則（D28 補充）已確認（2026-11-25） |
| 細屏 | 感應範圍 ≥ 44pt | 以 `clearance.viewportPt = 390` 做基準（而家已經係咁計）；唔加細屏分支 | 決定 3 已確認 |
| 唱臂 | 落針 = `playing` 而且 `overlay ≠ mv` 而且 `viewAlbumId` = 播緊嘅碟；否則泊位 | 三個姿勢 `parked｜playing｜lifted`（衍生值）；播放 store 記暫停原因；`Tonearm` 由 `playing: boolean` 改為 `pose`。第 17 版：`parked → playing` 有兩段開場（650ms + 160ms），`lifted ⇄ playing` 只係放低／升起（160ms） | 決定 11 已確認；其餘情況 D36 已確認；設計稿第 17 版已確認（2026-11-25） |
| 歌書 + 暫停 | 冇講 | 暫停唔改 `overlay`；`stageReducer` 唔使改 | 決定 5 已確認 |
| 管理端 UI | 沿用 903-player `apps/admin/src/ui/` 嘅元件 | 外觀按設計稿第 2 版重做（鋁面板、螺絲、碟、儀錶）；只移植行為（裁切、拖動排序、Toast、確認對話框）。播放端嘅金屬 SVG 零件（`components/metal`、車床紋、螺絲）係咪抽去共用 package：設計稿第 2 版確認之後先定（Implementation Plan 開放問題） | 決定 9 已確認；設計稿第 2 版等確認 |
| 管理端主題 | — | 只做淺色；唔加 `prefers-color-scheme` 分支 | 決定 10 已確認 |
| Branch、寄存 | T1、T3 待確認 | T1 ✅ Vercel（spike 頁都喺度）；T3 ✅ 留喺 session branch，第一個可用版本由用戶開 PR 入 `main` | 決定 12、13 已確認 |

### `parseSongText()` 嘅規則（Functional Spec D31、D32、D37，已確認）

| 步驟 | 規則 |
| --- | --- |
| 歌名 | 第一個非空白行；冇，或者係時間標記開頭 → `TITLE_REQUIRED` |
| 標籤行 | `曲`／`詞`／`編`／`監`／`副題` + `：` 或 `:`；次序隨意；各自最多一次（重覆 → 嗰行 `DUPLICATE_LABEL`）；值 trim 之後係空就當冇 |
| 標籤段完結 | 第一個空行，或者第一行唔係標籤行嘅行 |
| 歌詞 | 之後全部。有任何一行讀到時間標記 → 行 `parseLrc()`（現有規則：冇時間標記嘅行逐行報錯）；全部都冇 → 純文字（D32）：前後空行刪走，中間連續空行當一個分段 |
| 輸出 | `{ title, subtitle, credits: { composer, lyricist, arranger, producer }, lyrics: { source, synced, lines } ｜ null, errors: [{ line, code }] }`；`line` 係成段文字入面嘅行號（由 1 開始） |
| `formatSongText()` | 固定次序：歌名、`副題：`、`曲：`、`詞：`、`編：`、`監：`（冇值唔出）、空行、歌詞原文（`lyrics.source` 原樣）。`parseSongText(formatSongText(x))` 要等於 `x` |

### 已完成嘅 code 受 CR-003 影響（跟進任務；今次冇改 code）

| 檔案 | 而家 | 要改 | 任務 |
| --- | --- | --- | --- |
| `apps/api/migrations/0001_init.sql` | `albums.enabled`（DEFAULT 0）、`tracks.enabled`（DEFAULT 1）、`publishes` 表、`lyrics.lrc` | 刪兩個 `enabled`；`publishes` → `catalog_state`；`lyrics.lrc` → `source` + `synced`。D1 未部署過（U-3 未做），建議直接改 `0001`，唔加 `0002` | T-096 |
| `apps/api/test/schema.test.ts` | 鎖住上面嘅欄同表（`enabled` 預設值 :108、:133、:244–251；`publishes` :153、:265–275） | 跟住改 | T-096 |
| `apps/api/test/applyMigrations.ts:7` | `TABLES` 有 `publishes` | 改 `catalog_state` | T-096 |
| `apps/api/test/sessionGuard.test.ts:18` | 用 `/api/publish` 做受保護路徑嘅例子 | 測試仍然成立；順手換做 `/api/catalog/rebuild` | T-096 |
| `packages/catalog/src/schema/types.ts:3-4` | 註解「只包已上架…發佈時…」 | 改註解；型別冇上架欄，唔使改 | T-029 |
| `packages/catalog/src/lrc/parseLrc.ts` | `LyricLine.t: number`；`LyricsJson` 冇 `synced`；註解提「已發佈嘅歌詞檔」 | 加 `synced`；純文字嘅行型別（D32）；`parseLrc()` 本身規則唔變 | T-029 |
| `packages/catalog/src/index.ts` | — | export `song-text/` | T-029 |
| `apps/player/src/stage/layouts/types.ts`、`phone.ts:44` | `scale.stepDeg: 11.25` | `toDeg: 376.25`，刪 `stepDeg` | T-042 |
| `apps/player/src/stage/geometry.ts:30-31` 同用到 `scaleAngle` 嘅 `heartPoint`、`heartHitPoint`、`screwGap` | 每格固定角度；♥ = 最尾一格 | 角度按專輯數平均分；♥ 用 `toDeg` | T-042 |
| `apps/player/src/stage/geometry.test.ts:20-21`、`layouts/clearance.test.ts`（`SUPPORTED_POSITIONS`、註解指去 B-010） | 只列 7 個過到嘅格數 | 改為任何專輯數都過；刪 B-010 註解 | T-042 |
| `apps/player/src/components/tonearm/Tonearm.tsx:15,82`、`armShape.ts`、`Tonearm.test.tsx`、`partsMarkup` snapshot | `playing: boolean`（落針 / 泊位） | `pose: 'parked'｜'playing'｜'lifted'`；升針照設計稿第 17 版 `ARM_LIFT`；唱針開場照 `ARM_IN`（`armSwing` 650ms → `armDrop` 160ms），`config/motion.ts`、`tokens.css` 加 160ms 嘅 token（連 `motion.test.ts`、`tokens.node.test.ts`） | T-042 |
| `apps/player/src/stage/StageSvg.tsx:16` | 註解「backlog B-009：等用戶睇過預覽再定」 | 改註解（決定 1 已定） | T-042 |
| `apps/player/src/app/TurntableShell.tsx` | 暫時外殼：暫停 = 泊位 | T-035 取代呢個檔時跟新規則 | T-035 |
| `apps/player/src/app/stageReducer.ts` | — | 唔使改 | — |

上面嘅檔案屬於已凍結嘅 QA 鏈（`api-auth`、`catalog-core`、`player-foundation`），改完要按 validation gate 重驗有改動嘅部分。

### 播放端設計稿第 17 版嘅技術設計（用戶 2026-11-25 確認）

對應 Functional Spec §CR-003「補充：播放端設計稿第 17 版」。只影響 `apps/player`；Backend、API、資料庫、歌詞 JSON 唔使改。數值全部嚟自 `_mockups_/home-turntable/src/template.html` 嘅常數（1080 × 1920 基準），抄入 `stage/layouts/phone.ts`，元件只讀表；時長入 `config/motion.ts`。寫「定案」嘅細節留畀嗰個任務。

**歌書歌詞版面**（T-082）

| 範疇 | 做法 | 設計稿常數 |
| --- | --- | --- |
| 揀邊個版面 | 歌詞 JSON `synced = true` → 弧線版面（`activeLine()`）；`synced = false` → 直身一欄，唔行 `activeLine()` | — |
| 斷行（共用純函數） | `wrapLine(line, size, width, indentEm, measure)` → 每列 `{ text, indent }`。規則：喺全形／半形空格後面切成詞，成個詞放唔落就開新列；一個詞自己都放唔落先逐字斷；行尾嘅空格唔計闊度，亦唔會帶去下一列嘅開頭；續列縮入 `indentEm × size`。量字闊嘅函數由外面注入（瀏覽器用 canvas `measureText`，同 `fitText()` 共用；unit test 用固定字闊），所以規則可以唔靠 DOM 測試 | `wrapLine` |
| 字體載入 | 量字闊要用同畫面一樣嘅字體；字體未載入完就量會斷錯位，`document.fonts.ready` 之後要重新斷一次（Lubalin Graph／Rokkitt 字闊唔同，見技術風險）。⚠️ CR-004：T-035 嘅左上資訊而家只量一次（review W-017）；連 `loadingdone`（分片字體用到先載）一齊喺 T-044 處理，`wrapLine()` 用同一個機制 | — |
| 純文字：直身一欄 | 幾何表加一組：左邊 x = 230、右邊界 = 唱片夾窿左邊再留 20（= 碟心 x − 碟半徑 × 0.16 − 20 = 808，由幾何計，唔寫死）、頂 690、底 1650、字級 30、行距 = 字級 × 1.45、續行縮入 1 個字。全部列同一個字重同透明度；冇框線；歌詞 JSON 入面空白 `text` = 空一列 | `PLAIN_LAYOUT`、`PLAIN` |
| 純文字：捲動 | 元件自己記捲動位置（0 至 列數 × 行距 − 可見高度），pointer 拖動同滾輪改 `translateY`，唔吸附；同歌單一樣係元件內部手勢（`touch-action: none`，實現注意事項 13）。只 render 可見範圍上下各多一列。播放／暫停唔改位置。換歌返去頂（建議）、鍵盤同螢幕閱讀器嘅做法由 T-082 定案 | `plainLyrics` |
| 純文字：淡出 | SVG `mask` + 直向 `linearGradient`，淡出高 110：頂邊只喺捲咗（位置 > 0）先淡，底邊只喺下面仲有（位置 < 最大值）先淡 | `PLAIN.fade` |
| 有時間標記：而家嗰行 | `fitLyricLine(text, measure)` 決定策略：字級 44 一列放得落 → 照舊；縮到最細 32 一列放得落 → 縮字；仍然放唔落 → `wrapLine(text, 32, 框內闊, 0)`（續列唔縮入，左邊對齊）。框內闊 = 唱片夾窿邊留 10 至框線左邊（碟心 x − 弧線半徑）再留 24（而家嘅數 = 410）。斷咗行：列距 44，框線高 = 列數 × 44 + 34（一列時照舊 92）。唔做跑馬燈 | `LONG`（`size`、`pitch`、`pad`、`inset`、`rim`） |
| 有時間標記：其他行 | 各佔一列，唔斷行。闊過右邊界就用 `clipPath` + 橫向 `linearGradient` 淡出（闊 110），唔加「…」。右邊界：行嘅中心離碟心高度少過「唱片夾窿半徑 + 20」（132）→ 去到唱片夾之前（同純文字欄嘅右邊界，808）；其餘 → 畫面闊 − 40。長行版面入面其他行由框線邊起計（隔 14），字級 28、行距 50、上下各 3 行，x 跟弧線（碟心 x − √(弧線半徑² − 高度差²)） | `LONG`（`other`、`otherPitch`、`gap`、`around`、`fade`、`edge`）、`CLAMP_BAND` |
| 有時間標記：換行 | `activeLine()` 變咗，成組沿弧線移動；`prefers-reduced-motion` 直接切換。時長 token 由 T-082 定案 | `longLyrics` |
| 未定嘅細節（T-082 定案，照設計稿「歌書」同「試排版」兩格） | ① 短行用 `ARC`（其他行字級 32、每行隔 9.2°）、長行用 `LONG`（其他行字級 28、行距 50）：同一首歌入面長短行交替時點樣過渡。② 高身手機：純文字欄頂邊跟「貼頂」組、底邊跟「貼底」組（Functional Spec 建議），多出嚟嘅高度畀歌詞欄 | — |
| 測試 | `wrapLine`、`fitLyricLine`：unit test（空格優先、逐字斷、行尾空格、續列縮入、空行）。直身一欄嘅右邊界同頂底入幾何表，加入淨空規則測試（唔入唱片夾窿、唔掂三粒細掣同旋鈕刻度）。截圖比對：設計稿「歌書（歌詞冇時間標記）」同「試排版」兩格 | — |

**字母盤嘅字母**（T-036）

| 範疇 | 做法 | 設計稿常數 |
| --- | --- | --- |
| 規則（純函數） | `dialLetterEvery(positions)`：`positions ≤ 18` → 1；否則 `⌈(positions − 1) ÷ 9⌉`（`positions` = 專輯數 + 1）。`dialShowsLetter(pos, current, positions)`：`pos = current` 永遠 true；`every = 1` 全部 true；`pos % every ≠ 0` → false；其餘要離揀中嗰格同離 ♥（最尾一格）嘅弧長都 ≥ 淨空先 true | `dialLetterEvery`、`dialShowsLetter` |
| 淨空 | 字母半徑（237）× 18 格時一格嘅弧度（11.25°）× 1.3 ≈ 60.5；由幾何表嘅數計出嚟，唔寫死 | `DIAL_CLEARANCE` |
| 數值放邊 | `layouts/phone.ts` 嘅字母盤一組加：全部出字母嘅格數上限 18、字母數上限 9、淨空倍數 1.3、細點半徑 2.2；細點顏色（`#8f8f8b`）入 `tokens.css` | `DIAL_ALL_UP_TO`、`DIAL_MAX_LETTERS`、`DIAL_DOT` |
| 繪圖 | 冇出字母嘅格畫一粒細點（`<circle>`），位置、過場同字母一樣；刻度線照舊每張專輯一條 | `dialDot` |
| 測試 | 掃 1 至 30 張 × 每個揀中位置：揀中嗰格一定出字母；`positions ≤ 18` 全部出字母；出字母嘅格（唔計揀中）最多 9 個；冇字母喺揀中嗰格或者 ♥ 嘅淨空之內 | — |

**唱臂**（T-042；狀態同時長見「場景狀態機」下面嘅「唱針開場同姿勢之間嘅動作」）

| 範疇 | 做法 | 設計稿常數 |
| --- | --- | --- |
| 姿勢 | `pose: 'parked'｜'playing'｜'lifted'`（衍生值，唔另外存） | `armOnDisc`、`armLifted` |
| 開場 | `parked → playing`：`armSwing` 650ms → `armDrop` 160ms；小燈同碟轉延遲 810ms（兩個 token 相加） | `ARM_IN`、`ARM_IN_MS` |
| 升針嘅樣 | 成支臂 `scale(1.018)`，落影由 (5, 9) 移去 (14, 25) | `ARM_LIFT` |
| Token | `config/motion.ts`、`tokens.css` 加放低／升起唱針嘅 160ms；`tonearmMs` 650 不變 | — |

### Functional Spec 對照（CR-003 新增／改動）

| Functional 需求 | 技術落點 |
| --- | --- |
| FR-039 高身手機 | `stage/StageSvg.tsx`、`stage/fitStage.ts`（`extraUnits`） |
| FR-040 暫停時嘅唱臂、唱針開場（第 17 版） | `components/tonearm`（`pose`、開場 class）、播放 store（暫停原因）、`config/motion.ts`（`tonearmMs` + 新嘅 160ms token）、`styles/tokens.css` |
| FR-035 刻度弧（改）、字母盤嘅字母（第 17 版） | `stage/geometry.ts`（`scaleAngle`、`dialShowsLetter`）、`stage/layouts/*.ts`（`scale.toDeg`、字母盤嘅上限同淨空）、`components/knob`、`components/dial-ring` |
| FR-032 淨空（改） | `stage/layouts/clearance.test.ts` |
| FR-033 歌書（改） | `components/booklet`；歌詞 JSON `synced`（D32）。第 17 版：`synced = false` 用直身一欄（`wrapLine`、捲動、頂底淡出） |
| FR-036 超長歌詞行（第 17 版改） | `lyrics/` 嘅 `wrapLine()`、`fitLyricLine()`；`components/booklet`（框線變高、其他行右邊淡出）。冇跑馬燈 |
| FR-120 歌曲文字框 | `packages/catalog/song-text`、API-020、API-040、API-041、`apps/admin`（文字框 + 檢查結果） |
| FR-121 儲存即生效 | `apps/api/src/catalog/rebuild.ts`、API-061、`catalog_state`、API-014 / API-022（ID 守衛） |
| FR-122 管理端外觀 | `apps/admin`：按 `_mockups_/admin/` 第 2 版；只做淺色 |
| FR-114 統計（改） | API-010 |
| FR-107、FR-113、FR-116 | 刪 |

## CR-004 對技術設計嘅影響

對應 Functional Spec v1.5 §CR-004（用戶 2026-11-25 嘅 5 項決定，已確認）。今次 Backend、API、資料庫、`packages/catalog`、播放端字體同部署設定都受影響。本節取代上文同佢有出入嘅地方；受影響嘅表已喺原位改（標 ⚠️ CR-004）。「狀態」欄寫「待用戶確認」嘅對應 Functional Spec D43（短名串法）、D44（「類型」欄）、D47、D48、D49；寫「技術做法」嘅由對應任務定案。**今次冇改 code**：跟進任務見「已完成嘅 code 受 CR-004 影響」。

| 範疇 | v1.2 | v1.3 | 狀態 |
| --- | --- | --- | --- |
| 媒體 bucket | `r-gram-media` | **`rb-discography`**（用戶已開）。Worker 嘅 binding 名 `MEDIA` 同 `MEDIA_BASE` 不變；`r-gram-catalog`（private）不變 | 決定 2 已確認（D42） |
| 專輯資料夾 | `albums.folder`：一層，NULL = 用專輯 id | NULL = 用**預期資料夾名** `<category>-<NN>-<id>`（由類別、序號、id 即時計，唔另外存）；非 NULL = 手動改綁。純函數 `expectedFolder()` 放 `packages/catalog`，API、seed、管理端共用。資料夾名唔可以有 `..`（同手動指定 key 嘅規則睇齊）；`_` 開頭保留 | 決定 3 已確認（D43）；短名串法待用戶確認 |
| 專輯資料模型 | — | `albums` 加 `category`（六個短名之一）、`category_no`（類別內序號）、`cover_source_etag`（上次套用嘅封面來源）。`tracks` 加 `text_source_etag`（上次套用嘅文字檔） | 決定 5 已確認（D44）；兩個 `*_source_etag` 係技術做法（D41） |
| 內容檔 schema | 專輯有 `type`（自由文字） | `albums[]` 加 `category`、`categoryNo`；`type` 照留。播放端唔顯示呢兩個欄，validator 要收 | 決定 5 已確認；`type` 點處理待用戶確認（D44） |
| 掃描 | list → `matchMediaFiles()`：音檔、MV | 加兩類：封面來源（`cover.jpg｜png`）同歌曲文字檔（`NN 名.txt`）。預覽（API-030）列出封面、歌曲文字、媒體配對、衝突、未配對；套用（API-031）只做管理員確認咗嘅項目 | 決定 1 已確認（D40） |
| 封面由掃描套用 | — | Worker 只報告有冇來源同 ETag 有冇變。管理端頁面由媒體 bucket 公開網址攞原圖（跨 origin，要 bucket CORS 容許管理端 origin）→ 裁切 → 1200 同 320 → WebP → 抽專輯色 → 現有 API-050 × 2 → PATCH 專輯（連 `coverSourceEtag`） | 決定 1 已確認；Worker 冇圖片編解碼（T-024 已確立） |
| 歌曲文字由掃描套用 | — | Worker 讀 `.txt`（大細上限同 API-041）→ `parseSongText()`；套用行同 API-041 一樣嘅儲存路徑（逐行錯誤、`LYRICS_REMOVED` 要 `force`、寫歌詞 JSON、生成 catalog），並記低 `text_source_etag` | 決定 1 已確認 |
| 字體 | Rokkitt + Noto Sans HK 隨 app 提供；Lubalin Graph 只用 `local()`（實際未載入任何字體檔，backlog B-054） | slab：`local()` Lubalin Graph → 媒體 bucket 字體 URL（build 時可選設定）→ 內建 Rokkitt。字體載入後重新量字。商業字體檔唔入 repo | 決定 4 已確認（D45）；路徑同設定名係建議，T-044 定案 |
| 內容資料 | 17 張專輯、262 首歌；credit 配對 187 / 22 / 53 | 21 個發行、291 首歌、六個類別；credit 檔 21 個發行、252 行。seed 由 `_design_/tools/` 重新生成（T-097）；**新嘅 credit 配對數字等 T-097**，本文件寫 187 / 22 / 53 嘅地方作廢 | 決定 5 已確認（D46） |
| 轉盤 | 18 格，每格都出字母 | 22 格（21 + ♥）：`dialLetterEvery(22)` = ⌈21 ÷ 9⌉ = 3，由第一日起行「碟多」規則。規則同 code 設計不變（「播放端設計稿第 17 版嘅技術設計」） | 決定 5 嘅後果；規則第 17 版已確認 |
| 初始次序 | seed `order` = 發行日期次序 | seed `order` 照用戶嘅歌單檔：先類別、後序號 | 待用戶確認（D47）；只影響 T-097 嘅輸出 |
| 封面尺寸 | 1200 × 1200 同 320 × 320（T-024 已實作：只收呢兩個尺寸） | 建議：大封面放寬為正方形、邊長 640 至 1200；縮圖仍然 320；seed 自己出縮圖、唔放大 | 待用戶確認（D48）；確認後做 T-099 |
| API 細節回寫 | 多處「由 T-xxx 定案」 | 專輯、歌曲、封面、公開圖片 route 開發時定落嚟嘅回應同錯誤碼寫返落嚟（見「回寫」） | 已實作同 review（唔使用戶確認） |

### 掃描嘅設計（T-025 定案；API-030、API-031）

**檔案分類**（`packages/catalog/scan`，純函數；取代實現注意事項 9 嘅分類表）：

| 檔名（唔計資料夾；唔分大細楷） | 類別 | 備注 |
| --- | --- | --- |
| `cover.jpg`、`cover.png` | 封面來源 | 冇歌號。兩個都有 → `conflicts`（`kind: 'cover'`），唔自動揀 |
| 開頭 1–3 位數字 + `.txt` | 歌曲文字 | 歌號規則同音檔一樣。同一個歌號多過一個 → `conflicts`（`kind: 'text'`） |
| 開頭 1–3 位數字 + `.m4a`／`.mp3` | 音檔 | 不變 |
| 開頭 1–3 位數字 + `.mp4`／`.m4v` | MV | 不變 |
| 冇歌號嘅 `.txt`／媒體檔 | 未配對：`NO_TRACK_NUMBER` | 不變 |
| 歌號冇對應嘅歌 | 未配對：`NO_SUCH_TRACK` | `.txt` 嘅情況見 Functional Spec D49（待確認：建議歌號接住歌單就可以新增） |
| 其他（包括 `cover.jpeg`、`cover.webp`、`.lrc`） | 未配對：`UNKNOWN_EXTENSION` | v1 唔擴大；之後要加再行 CR |

而家 `matchMediaFiles()` 會將 `cover.jpg` 回做 `UNKNOWN_EXTENSION`（API-030 舊例子就係咁），T-025 要改。

**邊個做乜**：

| 步驟 | Worker | 管理端頁面 |
| --- | --- | --- |
| 列檔 | `MEDIA.list({ prefix: '<folder>/' })`（分頁讀晒）；每個 object 有 `key`、`size`、`etag` | — |
| 封面 | 只報告：`key`、`etag`、`bytes`、`change`（同 `albums.cover_source_etag` 比）。唔讀圖 | 確認後：`fetch(MEDIA_BASE + key)` → 裁切（唔係正方形就置中裁，可以調）→ 1200 同 320 → WebP → `dominantColor()` → API-050 × 2 → API-013（`cover`、`thumb`、`accent`、`coverSourceEtag`） |
| 歌曲文字 | `etag` 同 `tracks.text_source_etag` 一樣 → `same`，唔讀檔。否則讀檔（`size` 大過 `SONG_TEXT_MAX_BYTES` 就唔讀，直接報 `TOO_LARGE`）→ `parseSongText()` → 同已儲存嘅內容（`formatSongText()` 嘅結果）比較 | 顯示結果；確認後叫 API-031 |
| 媒體配對 | 不變 | 不變 |

**`change` 嘅值**：

| 對象 | `new` | `replace` | `same` |
| --- | --- | --- | --- |
| 封面 | 專輯未套用過封面來源（`cover_source_etag` 係 NULL）。專輯本身已經有封面（人手上載或者 seed）嘅話，回應另外帶 `hasCover: true`，管理端要標明「會取代現有封面」 | ETag 同上次套用嘅唔同（來源已更換） | ETag 一樣 |
| 歌曲文字 | 未套用過，而且套用只會加嘢（嗰首歌而家冇歌詞亦冇曲詞編監，歌名一樣） | 會改到已儲存嘅內容（歌名、副題、曲詞編監或者歌詞有分別）；`titleChanged`、`removesLyrics` 逐項標明 | ETag 同上次套用嘅一樣，或者解析結果同已儲存嘅內容完全一樣 |
| 音檔／MV | 不變 | 不變 | 不變 |

**套用**（API-031）：body 列出管理員確認咗嘅項目（媒體配對、歌曲文字檔連佢哋嘅 `etag`）。Worker 對每個歌曲文字檔重新讀一次：ETag 同預覽時唔同 → 嗰個項目回 `STALE`，唔套用；有驗證錯誤 → 唔套用；會清走現有歌詞而嗰個項目冇 `force: true` → 回 `LYRICS_REMOVED`，唔套用。其餘照寫入（同 API-041 同一個 store 函數），逐個項目回結果；最後生成一次 catalog（現有後置步驟）。封面唔經 API-031。

**限制同風險**：

| 項目 | 處理 |
| --- | --- |
| 一次掃描要讀好多 `.txt`（原聲大碟 41 首） | Worker 每個請求可以做嘅 R2 操作有上限（數值同計法要 T-025 照 Cloudflare 文件核實，免費同付費計劃唔同）。ETag 一樣嘅唔讀可以大減；仍然超過就分批（預覽回 `more: true`，管理端再叫），由 T-025 定案 |
| 文字檔唔係 UTF-8、有 BOM、CRLF | BOM、CRLF 照 `parseSongText()` 現有嘅正規化；解碼失敗回一個檔案層面嘅錯誤（建議 `BAD_ENCODING`） |
| 管理端攞唔到封面原圖 | 媒體 bucket 未設 CORS 容許管理端 origin：`fetch` 失敗，或者圖畫入 canvas 之後讀唔到像素。管理端要顯示明確原因（「媒體儲存區未允許管理端網域」），唔好只出「失敗」 |
| 原圖好大（例如 3000 × 3000、幾 MB） | 冇問題：原圖由瀏覽器直接向公開 bucket 攞，唔經 Worker；上載嘅係縮細之後嘅 WebP（`IMAGE_MAX_BYTES` 2 MB 照舊） |
| `_` 開頭嘅資料夾 | 唔係專輯資料夾：`folder` 驗證唔收 `_` 開頭嘅名；API-032 列資料夾時唔顯示 |
| Worker 唔寫媒體 bucket | 照舊只 list / head / get；喺管理端改過嘅歌，bucket 嘅 `.txt` 唔會更新（Functional Spec 範圍外） |

### 資料夾名同發行類別（T-098）

| 項目 | 設計 |
| --- | --- |
| 類別短名 | `RELEASE_CATEGORIES`（`packages/catalog`）：`album`（錄音室專輯）、`ep`（迷你專輯）、`best`（精選）、`live`（現場專輯）、`ost`（電影原聲）、`single`（單曲）。中文名喺各 app 嘅語言檔。**串法待用戶確認** |
| `expectedFolder(category, categoryNo, id)` | `` `${category}-${NN}-${id}` ``，`NN` = 序號補零到兩位（100 以上照出三位）。例：`album-01-apollo-18`、`ep-01-frank-ep`、`live-02-rubberband-ciao-2021-live` |
| 實際用嘅資料夾 | `albums.folder ?? expectedFolder(…)`。API-012、API-013 回應同 API-010 列表都帶 `expectedFolder`（計出嚟）同 `folder`（NULL 或者手動值），管理端兩樣都顯示 |
| 序號 | 整數 ≥ 1；同一個 `category` 入面唔可以重覆（API 層驗證，建議 `reason: 'ORDINAL_TAKEN'`；DB 唔加 UNIQUE，方便兩張碟對調序號時分兩步改）。API-011 冇畀序號 = 嗰個類別最大序號 + 1 |
| 改類別／序號 | 只改欄位；`tracks.audio_key`／`mv_key` 係完整 key，唔會跟住變。管理端提示用戶去 bucket 搬檔再掃描 |
| `folder` 規則（統一，backlog B-045 ①、B-049 ②） | 一層；唔可以空；唔可以有 `/` `\` `?` `#` `%`；**唔可以有 `..`**（之前只擋成個名係 `.` 或者 `..`）；唔可以 `_` 開頭 |
| `type` | 未確認 D44 之前：照舊係可以改嘅自由文字；seed 填類別嘅中文名。確認之後：API 唔再收 `type`，寫入時由 `category` 帶出 |
| Migration | D1 未部署過（Implementation Plan U-3 未做）：照 T-096 嘅做法直接改 `0001_init.sql`，唔加 `0002` |

### 字體（T-044）

| 項目 | 設計 |
| --- | --- |
| 內建 | Rokkitt（`@fontsource` 系列，woff2；用可變字重或者設計用到嘅幾個字重，T-044 定），由 `apps/player` 自己嘅 bundle 出 |
| 次序 | ① `local()`：`ITC Lubalin Graph Std Book`、`LubalinGraphStd-Book`、`ITC Lubalin Graph Std`（設計稿 `fonts.css` 用嘅三個名）→ ② `url(<VITE_SLAB_FONT_URL>)`（build 時有設定先出呢一項）→ ③ 內建 Rokkitt。做法（一個 `@font-face` 嘅 `src` 清單，定係幾個 family 順序排入 `--font-slab`）由 T-044 定案；要求：Rokkitt 用真字重；Book 單一字重遇到粗體由瀏覽器模擬，除非另外提供粗體檔 |
| 設定 | 播放端 build 變數（建議名）：`VITE_SLAB_FONT_URL`（可選；例如 `<MEDIA_BASE>_fonts/slab-book.woff2`，`.otf` 都得），`VITE_SLAB_FONT_BOLD_URL`（可選，較粗嘅檔）。冇設定 = 完全唔向 bucket 發請求 |
| CORS | 跨 origin 載入字體一定要 bucket 回 `Access-Control-Allow-Origin`（播放端 origin）；冇就載入失敗，跌去 Rokkitt |
| Preload | 字體係載入進度嘅一項：等 slab 字體就緒（`document.fonts.load()`），有逾時（常數，T-044 定）；逾時或者失敗照樣完成，用當時用到嘅字 |
| 重新量字 | `document.fonts.ready` 同 `loadingdone` 之後，量字函數要換新，用到佢嘅元件重新 fit／斷行（review W-017；「字體載入」一行原有要求）。Noto Sans HK 按 unicode-range 分片，新字用到先載，所以唔可以只量一次 |
| 版面基準 | 幾何表同設計稿嘅字闊以 Rokkitt 做準（Implementation Plan R-009）；截圖比對用 Rokkitt |
| PWA | 內建字體入 precache（留意 backlog B-013：分片 woff2 會全部 precache）；bucket 字體係跨 origin：用 runtime cache（CacheFirst），唔入 precache |
| 唔入 repo | 商業字體檔唔可以 commit（repo 公開）；`.gitignore` 加一條防誤入（建議） |
| Noto Sans HK | Tech Stack 表一直寫隨 app 提供，但而家 `apps/player/package.json` 冇任何字體依賴，中文係用系統字（`--font-cjk` 嘅後備）。要唔要同一個任務做，見 Implementation Plan 開放問題 |

### 內容資料重新生成（T-097）

| 項目 | 設計 |
| --- | --- |
| 來源 | 用戶 2026-11-25 提供嘅新版 `rubberband-discography.html`、`rubberband-credits.html`，放入 `_design_/`（取代舊版）。寫呢份 spec 時 repo 入面仲係舊版（17 個專輯段） |
| 轉檔 script | `_design_/tools/parse_credits.py` 已有（`source` 字串寫死咗日期，靠碟名對專輯 id）。**`discography.json` 而家冇生成佢嘅 script**（scaffold 時由 `data/` 搬入）：要補一個（建議 `_design_/tools/parse_discography.py`），project 規則係 seed 唔人手改 |
| 輸出 | `apps/api/seed/discography.json`：每個發行加 `category`（短名）、`categoryNo`；`order` 見 D47；已有嘅 16 個 id 不變；`singles` 呢個 id 冇咗；5 個新發行嘅 id 由 script 入面一個明確嘅對照表定（中文名唔可以自動轉 id）。`apps/api/seed/credits.json`：21 個發行、252 行 |
| 交畀用戶 | 21 個發行嘅 id 同預期資料夾名清單（用戶照住上載，Implementation Plan U-13）；新嘅 credit 配對數字（直接對到／靠同名歌補／冇） |
| 寫死嘅數 | `packages/catalog/src/seed/seed.node.test.ts`（17、262、187 / 22 / 53、原聲大碟 39 首）、`song-text/songText.node.test.ts`（262）、`wheel/wheelKeyFor.test.ts`（17 張碟名嘅例子）、`apps/player/src/catalog/seedCatalog.node.test.ts`（17）：跟新資料改 |

### 回寫：開發時定落嚟嘅 API 細節（backlog B-044、B-049 ①、B-052 ②）

下面每一行都對過列出嘅 review 報告（報告入面寫「實測」或者有測試覆蓋）同而家嘅 code。未對到嘅留喺 backlog（B-041 嘅 `parseSongText()` 細節、API-012／API-021 完整嘅欄位表同上限）。

| 範圍 | 定咗嘅做法 | 來源 |
| --- | --- | --- |
| 錯誤訊息語言 | `error.message` 同 `details[].message` 一律係中文書面語，全部嚟自 `apps/api/src/i18n/zh-Hant.ts`（有測試鎖住冇口語字、冇漏咗參數嘅 `{…}`）。管理端唔好直接顯示 Backend 嘅句子做唯一文字：用 `code`／`reason` 喺自己嘅語言檔砌字，Backend 嘅 `message` 做後備 | B-044（commit `ebc3568`）；T-023 review「Backlog 修正」 |
| `details` 形狀 | 欄位錯誤：`{ path, reason, message }`；`reason` 用大楷（`REQUIRED`、`INVALID_DATE`…；之前例子寫細楷 `required`）。body 唔係 JSON object：`path: '$'`、`NOT_AN_OBJECT`。未知欄位：`NOT_EDITABLE`，最多列 20 個，之後一條 `TOO_MANY_UNKNOWN_FIELDS` | T-022 review S-059、#7；T-023 review #10 |
| `If-Match` | 冇帶 → 400 `VALIDATION_ERROR`（`path: 'If-Match'`、`REQUIRED`）；唔啱 → 409 `STALE`。檢查同寫入係同一句 `UPDATE … WHERE updated_at = ?` | T-022 review #4；T-023 review |
| API-011 新增專輯 | 201，回完整專輯。`id`、`title` 必填；冇畀嘅欄位：`wheelKey` 按 `wheelKeyFor(title)`、`accent` 中性灰、排最尾。id 撞咗 → 409 `CONFLICT` | T-022 review #2 |
| API-013 改專輯 | `year` 唔可以直接改，跟 `releaseDate` 計；改碟名唔會重計 `wheelKey`；`accent` 存細楷；空 body 只更新 `updatedAt`；文字欄上限 200 個字（`TITLE_MAX_CHARS`），`wheelKey` 最多 2 個字，唔收換行、控制字元同隱形格式字元 | T-022 review #1、#3、#7、#9；re-review |
| API-014 刪專輯 | 冇 `?force=1`：409 `ID_REMOVED`，`details` = `[{ type, id }]`（專輯同佢啲歌）。有：200 `{ deleted: { albumId, trackIds } }`；冇其他歌用嘅歌詞檔一齊刪 | T-022 review #5；commit `6ef24f9`（B-048） |
| API-015、API-023 排序 | body `{ ids }`；格式錯 → 400（`INVALID_LIST`）；`ids` 同現有嗰批唔一樣（期間有人加減過）→ 409 `CONFLICT`；成功回 `{ ids }`。歌曲排序唔更新 `updatedAt` | T-022 review #6；T-023 review S-069、#8 |
| API-020 新增歌 | 201，形狀同 API-041 嘅 200 一樣。歌 id = `<albumId>-<6 位隨機>`（撞咗重試，最多 3 次） | T-023 review #7、S-069 |
| API-041 儲存歌曲文字 | 200 回應加 `track`（歌曲列表用嘅形狀：四個 credit 欄各自可以係 `null`）同 `hints`（似標籤但前面有空行嘅行：只提示，唔擋；backlog B-038）。400 `details`：`{ path: 'text', line, reason, message }`，唔回原文。會清走現有歌詞而冇 `?force=1`：409 `LYRICS_REMOVED`，`details` = `[{ type: 'lyrics', trackId, lineCount }]`。413 喺解析之前回：body 上限 = 6 × 64 KiB + 1 KiB，文字本身超過 64 KiB 都係 413。錯誤碼加 `BAD_OFFSET`、`TITLE_TOO_LONG` | T-023 review #1–#4、S-069 |
| API-021 改歌嘅其他欄位 | 只收四個欄：歌詞參考連結（只收 `https://`，唔可以有 userinfo）、備註（一行，最多 1000 個字）、手動指定音檔 key、手動指定 MV key。key 原樣儲存，最長 1024 byte，唔可以有 `..`、唔可以 `/` 開頭，儲存前 `MEDIA.head()`（冇 → `MEDIA_NOT_FOUND`）；手動指定會設 `*_manual = 1` | T-023 review #5、#6；commit `f826fa8`（S-067） |
| API-022 刪歌 | 冇 `?force=1`：409 `ID_REMOVED`。有：200 `{ deleted: { trackId, albumId } }` | T-023 review S-069 |
| 歌詞檔 | R2 key `catalog/v1/lyrics/<內容 sha256 頭 16 個 hex>.json`；儲存之後清走冇歌再用嘅舊檔 | T-023 review #11 |
| API-050 上載封面 | 次序：Content-Type 唔係 WebP／JPEG／PNG → 415；超過 2 MB → 413（有 `Content-Length` 就唔讀 body）；檔頭嘅格式同宣稱嘅唔一樣 → 415；結構讀唔到 → 400 `VALIDATION_ERROR`（`INVALID_IMAGE`）；唔係 1200 × 1200 或者 320 × 320 嘅正方形 → 400（`INVALID_DIMENSIONS`）；`details` = `[{ path: '$', reason, message }]`。檔名副檔名跟內容：`.webp`／`.jpg`／`.png`。上載本身唔會生成 catalog（PATCH 專輯先會） | T-024 review S-088、#2–#5、#8 |
| API-071 封面圖 | `GET`／`HEAD`。檔名一定係 `<16 hex>.<webp｜jpg｜png>`，唔係就 404 `NOT_FOUND`。Header：`Cache-Control: public, max-age=31536000, immutable`、`X-Content-Type-Options: nosniff`、`ETag`、`Vary: Origin`；`Content-Type` 由副檔名決定，唔靠 R2 metadata；CORS 只回 `PLAYER_ORIGINS`；唔設 cookie | T-024 review S-088、#7 |
| 通用錯誤碼 | 加 `ID_REMOVED`（409）、`LYRICS_REMOVED`（409）、`NOT_READY`（404）、`INVALID_DOCUMENT`（422）、`CATALOG_WRITE_FAILED`（502）；`TOO_LARGE`（413）已有 | `apps/api/src/config.ts` `ERROR_CODE` |

T-026（catalog 生成同公開 route）嘅 code 已交（commit `aad0d81`、`8364c15`），寫呢份 spec 時未有 review 報告：佢帶入嘅做法（`/catalog/v1/*` 加 `Content-Security-Policy: default-src 'none'; sandbox`、`HEAD` 用 `head()`、`If-None-Match` 回 304、`Access-Control-Expose-Headers: ETag`）等 review 之後先回寫。

### 已完成嘅 code 受 CR-004 影響（跟進任務；今次冇改 code）

| 檔案 | 而家 | 要改 | 任務 |
| --- | --- | --- | --- |
| `apps/api/wrangler.toml:29`、`:42-43` | `bucket_name = "r-gram-media"`；`MEDIA_BASE` 嘅註解同 placeholder 寫 `r-gram-media` | 改 `rb-discography`（binding `MEDIA` 不變）；placeholder 換做 bucket 真正嘅公開網址（U-1 之後） | T-098 |
| `apps/api/.dev.vars.example` | 冇 bucket 名、冇 `MEDIA_BASE` | 加一行註解：本機點樣蓋過 `MEDIA_BASE`（同其他 `[vars]` 一樣嘅寫法） | T-098 |
| 註解：`apps/api/src/env.ts:19`、`src/catalog/buildDocument.ts:5`、`src/tracks/validate.ts:15`、`migrations/0001_init.sql:19`、`packages/catalog/src/schema/types.ts:27` | 寫 `r-gram-media` | 改名 | T-098 |
| `apps/api/migrations/0001_init.sql`、`test/schema.test.ts` | `albums` 冇類別、序號；`folder` 註解「NULL = 用 id」 | `albums` 加 `category`（CHECK 六個值）、`category_no`（CHECK ≥ 1）、`cover_source_etag`；`tracks` 加 `text_source_etag`；改註解。直接改 `0001`（未部署過） | T-098 |
| `apps/api/src/albums/fieldRules.ts`、`validate.ts`、`rows.ts`、`store.ts`、`overview.ts`、`errors.ts`；`src/i18n/zh-Hant.ts`；`test/albumFieldRules.test.ts`、`albumsCreate.test.ts`、`albumsUpdate.test.ts`、`albumsList.test.ts`、`albumFixtures.ts` | 可改欄位冇類別、序號；`folder` 收 `a..b`、收 `_` 開頭；新增專輯冇預設序號 | 加 `category`、`categoryNo`、`coverSourceEtag` 三個欄嘅驗證同讀寫；序號唔重覆；回應加 `expectedFolder`；`folder` 規則收緊（`..`、`_`） | T-098 |
| `packages/catalog/src/schema/types.ts`、`parseCatalogDocument.ts`（連測試）、`src/index.ts` | `CatalogAlbum` 冇類別、序號 | 加 `category`、`categoryNo`；新增 `RELEASE_CATEGORIES`、`expectedFolder()`（連測試） | T-098 |
| `apps/api/src/catalog/buildDocument.ts`、`snapshot.ts`；`test/catalogFixtures.ts`；`apps/player/src/catalog/testing/catalogFixtures.ts` | 砌 document 同測試 fixture 冇新欄 | 跟 schema 加 | T-098 |
| `_design_/rubberband-discography.html`、`_design_/rubberband-credits.html` | 舊版（17 個專輯段；credit 16 張） | 換做用戶 2026-11-25 嘅新版 | T-097 |
| `_design_/tools/parse_credits.py`；（冇）`_design_/tools/parse_discography.py` | credit 有 script；歌單冇 | 補歌單嘅 script（連類別、序號、id 對照表）；credit script 嘅日期字串唔好寫死 | T-097 |
| `apps/api/seed/discography.json`、`credits.json` | 17 張、262 首；16 張、193 行 | 重新生成：21 個發行、291 首；21 個發行、252 行 | T-097 |
| `packages/catalog/src/seed/types.ts`、`seedToCatalog.ts`、`seed.node.test.ts:20-32`；`song-text/songText.node.test.ts:18`；`wheel/wheelKeyFor.test.ts:4`；`apps/player/src/catalog/seedCatalog.node.test.ts:16` | `SeedAlbum` 冇類別、序號；測試寫死 17、262、187 / 22 / 53、39 | 型別加欄；數字跟新資料（新嘅配對數字由呢個任務報告） | T-097 |
| `_design_/HANDOFF.md:229` | 提到 `singles` 呢個 id | 加註：已由 CR-004 取代（同 backlog B-002 一齊做） | T-097 |
| `packages/catalog/src/scan/matchMediaFiles.ts`（連測試） | 只識音檔、MV；`cover.jpg` = `UNKNOWN_EXTENSION` | 加封面來源同歌曲文字兩類、對應嘅衝突 | T-025 |
| （未有）`apps/api/src/media/scan.ts`、`routes.ts`；`src/api/routes.ts`；`src/tracks/songText.ts`、`store.ts` | T-025 未開始 | 照「掃描嘅設計」做；歌曲文字嘅套用重用 API-041 嘅儲存函數，加寫 `text_source_etag` | T-025 |
| `apps/api/src/assets/routes.ts`（`ALLOWED_SIDES`、`isAllowedSize`）、`src/config.ts`（`COVER_SIDE_PX`）、`src/i18n/zh-Hant.ts`（`INVALID_DIMENSIONS`）、`test/assetsUpload.test.ts` | 只收 1200 同 320 | D48 確認後：大封面收 640 至 1200 嘅正方形（加 `COVER_MIN_SIDE_PX`）；順手處理 backlog B-052 ①（PATCH 專輯分唔到大封面同縮圖） | T-099（等 D48） |
| `apps/player/package.json`、`src/styles/tokens.css:24-28`、`src/styles/tokens.node.test.ts:25`、（新）`src/styles/fonts.css`、`src/utils/textMeasure.ts`、`src/app/App.tsx`、`vite.config.ts`、`src/vite-env.d.ts`、（新）`.env.example` | 冇字體依賴；`--font-slab` 直接寫字體名，冇 `@font-face`；量字函數只建立一次 | 照「字體」做；`.env.example` 連 `VITE_CATALOG_URL` 一齊列（backlog B-036） | T-044 |
| `_mockups_/admin/src/template.html`（改完跑 `python3 src/build.py`） | 掃描結果只有媒體配對；專輯表格冇類別、序號、預期資料夾名 | 補畫（Functional Spec P-3） | T-050 |
| （未有）`apps/api/scripts/seed.mjs` | T-027 未開始 | 匯入類別、序號；封面照 D48 | T-027 |
| `.claude/CLAUDE.md` | 文件表、QA chain 表冇掃描（`apps/api/src/media`） | T-025 完成時加 chain；seed 生成指令加入「指令」表 | T-025、T-097 |

上面部分檔案屬於已凍結嘅 QA 鏈（`api-albums`、`api-assets`、`api-auth`（schema）、`catalog-core`、`player-catalog`、`player-foundation`）：改完按 validation gate 重驗有改動嘅部分。

### Functional Spec 對照（CR-004 新增／改動）

| Functional 需求 | 技術落點 |
| --- | --- |
| FR-123 掃描讀封面來源同歌曲文字檔 | `packages/catalog/scan`、`apps/api/src/media`、API-030、API-031、`albums.cover_source_etag`、`tracks.text_source_etag`；管理端掃描結果（封面處理喺瀏覽器，行 API-050、API-013） |
| FR-124 發行類別、序號、資料夾名 | `albums.category`、`albums.category_no`、`expectedFolder()`、API-010–013、內容檔 `albums[].category`／`categoryNo` |
| FR-041 字體 | `apps/player/src/styles/fonts.css`、`tokens.css`、`utils/textMeasure.ts`、`VITE_SLAB_FONT_URL`、Preload 進度、PWA cache |
| FR-105、FR-103（改） | 同 FR-123；API-050（尺寸規則 D48 待確認） |
| FR-108（改） | `_design_/tools/`、`apps/api/seed/*.json`、`apps/api/scripts/seed.mjs`、`matchCredits()` |
| FR-035（22 格） | `dialLetterEvery()`、`dialShowsLetter()`（設計不變） |
| 非功能需求「介面文字」（Backend 錯誤訊息） | `apps/api/src/i18n/zh-Hant.ts`、`test/writtenChinese.test.ts`、`test/messageParams.test.ts` |

## 修訂記錄

| 版本 | 日期 | 改動 |
| --- | --- | --- |
| v1.0 | 2026-11-24 16:50 | 初稿 |
| v1.1 | 2026-11-24 23:18 | 跟 Functional Spec v1.3（CR-002）更新：加「CR-002 對技術設計嘅影響」一節。只影響 `apps/player`；Backend、API、資料庫、部署不變 |
| v1.1（補） | 2026-11-24 23:52 | 跟 CR-002 補充：i18n（播放端加 `src/i18n/`、兩邊書面語測試、寫死文字測試、`lang`）；字母盤同 MV 電視過場嘅做法。管理端語言檔改名 `zh-Hant.ts` |
| v1.1（補二） | 2026-11-25 00:01 | 跟 CR-002 補充（preview 第 15 版）：歌書過場嘅做法；CRT 開機 0.22s、熄機 0.15s |
| v1.1 Approved | 2026-11-25 00:07 | 用戶確認；狀態改 Approved。內容冇改 |
| v1.2 | 2026-11-25 08:06 | 跟 Functional Spec v1.4（**CR-003**）更新：加「CR-003 對技術設計嘅影響」一節（對照表、`parseSongText()` 規則、已完成 code 受影響清單）。Backend：冇草稿同發佈，每次寫入之後生成 catalog（核心原則 1、數據流 A、API-061）；刪 `enabled` 兩欄；`publishes` → `catalog_state`；`lyrics` 改欄；歌曲文字 API（API-020、API-040、API-041）；刪 API-042、API-044、API-060、API-062；ID 守衛搬去刪除。播放端：繪圖方式改為單一 SVG 畫布；狀態機補 `discChange → list` 同 `previousAlbumId`（review S-042）；唱臂三個姿勢；刻度弧固定；高身同細屏。同步已完成嘅實作（backlog B-017）：API-003 認證欄、`apps/api` 組件圖、Header 行。T1、T3 用戶已確認。標「待確認」嘅行等 Functional Spec D30–D39 |
| v1.2（確認） | 2026-11-25 | **2026-11-25：D30–D39 確認**（CR-003 之內嘅狀態更新，唔係新 CR；版本號不變，設計內容冇改）。用戶答「嗰 8 條跟建議」：對應 D30、D31、D32、D34、D36、D37 嘅「待確認」改為已確認（內容流程、生成失敗、`catalog_state`、ID 守衛、歌曲文字、純文字歌詞同 `synced`、批量匯入同同名歌、唱臂其餘情況、`parseSongText()` 規則）。D33（儲存欄位照舊分開、`lyrics.lrc` 改名 `source`）記做技術決定，唔使用戶確認。D35（API-010 嘅統計項目）仍然待確認，等管理端設計稿第 2 版。刪走「D32 唔接受嘅話」嘅兩個後備講法（API-041 嘅 `NO_TIMED_LINES`、歌詞 JSON 唔加 `synced`）；API-024 嘅「併入」講法改清楚（API-044 併入 API-024） |
| v1.2（第 17 版確認） | 2026-11-25 | **2026-11-25：播放端設計稿第 17 版確認**（CR-003 之內嘅補充，唔係新 CR；版本號不變）。跟 Functional Spec v1.4 嘅同名補充：加「播放端設計稿第 17 版嘅技術設計」一節：歌書歌詞版面（純文字用直身一欄，`wrapLine()` 自動斷行、上下捲、頂底淡出；有時間標記嘅長行用 `fitLyricLine()`，縮字之後喺框入面斷行、框線變高，其他行右邊淡出）、字母盤嘅字母（`dialShowsLetter()`）、唱臂。「場景狀態機」加「唱針開場同姿勢之間嘅動作」：`parked → playing` 兩段（650ms + 160ms，小燈同碟轉延遲 810ms），`lifted ⇄ playing` 只係放低／升起（160ms），減少動態效果直接到位；`config/motion.ts` 要加 160ms 嘅 token。`fitText()` 嘅跑馬燈策略刪走（D22 修訂）。狀態：刻度弧、唱臂兩行由「設計稿第 16 版等確認」改為「第 17 版已確認」。Backend、API、資料庫、歌詞 JSON 唔受影響。仍然等用戶：管理端設計稿第 2 版連 D35、A-7、A-8 |
| v1.3 | 2026-11-25 12:40 | 跟 Functional Spec v1.5（**CR-004**）更新：加「CR-004 對技術設計嘅影響」一節（對照表、掃描嘅設計、資料夾名同發行類別、字體、內容資料重新生成、API 細節回寫、已完成 code 受影響清單連任務編號）。媒體 bucket 改名 `rb-discography`（架構圖、R2 key layout、Bindings、dashboard 設定、T4；binding `MEDIA` 同 `MEDIA_BASE` 不變）。`albums` 加 `category`、`category_no`、`cover_source_etag`，`folder` NULL = 預期資料夾名 `<category>-<NN>-<id>`；`tracks` 加 `text_source_etag`；內容檔專輯加 `category`、`categoryNo`。API-030 重寫（封面來源、歌曲文字）、加 API-031 一節；API-011、API-013、API-032 跟住改。字體：local Lubalin Graph → bucket 字體 URL → 內建 Rokkitt（Tech Stack、build 變數、技術風險）。內容資料 21 個發行、291 首歌；187 / 22 / 53 作廢，等 T-097。回寫（backlog B-044、B-049 ①、B-052 ②、T-024 review S-088）：錯誤訊息語言同 `details` 形狀、`If-Match`、API-011／013／014／015／020／021／022／023／041／050／071 嘅回應同錯誤碼、通用錯誤碼。**待用戶確認**嘅部分：類別短名串法、`type` 欄、初始次序、封面尺寸、文字檔新增歌曲（Functional Spec D43、D44、D47、D48、D49）。今次冇改 code |
