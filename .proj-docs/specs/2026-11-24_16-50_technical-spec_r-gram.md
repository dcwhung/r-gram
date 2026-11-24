# Technical Spec：R Gram（播放端 PWA + 內容管理 Backend）

**版本**：v1.1
**日期**：2026-11-24 23:52（v1.0：2026-11-24 16:50；v1.1 初稿：23:18）
**作者**：Architect Agent
**關聯 Functional Spec**：v1.3（包括 CR-001 歌曲 credit、CR-002 播放端介面定稿）`2026-11-24_16-13_functional-spec_r-gram.md`
**狀態**：v1.0 Approved；v1.1 = 跟 CR-002 更新（見文末「CR-002 對技術設計嘅影響」），等用戶確認

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
            │ R2「r-gram-media」│◄──┤ list / head │ │ D1「r-gram」 │ │ R2「r-gram- │
            │ 公開網址          │   │（掃描）     │ │ 草稿 SSoT    │ │ catalog」   │
            │ <專輯資料夾>/檔案 │   └─────────────┘ └─────────────┘ │ private     │
            └──────────────────┘                                   │ catalog.json│
                      ▲                                            │ img/ lyrics/│
                      │ 用戶用 Cloudflare 介面 / 工具直接上載       └─────────────┘
```

| 層 | 職責 |
| --- | --- |
| `apps/player` | 唱片機介面、播放、歌詞、MV、收藏、播放模式；只讀 catalog；所有個人狀態存本機 |
| `apps/admin` | 管理介面 SPA；由同一個 Worker 以靜態檔形式出，同管理 API 同源 |
| `apps/api` | 認證、管理 API、R2 掃描、圖片上載、發佈、對外出 catalog / 圖 / 歌詞 |
| `packages/catalog` | 純邏輯、冇 build step：catalog 型別同 validator、LRC parser、掃描配對規則、Wheel 字母規則、顏色計算。三個 app 共用，保證「管理端驗得過 = 播放端讀得到」 |
| D1 | 內容草稿嘅唯一來源（SSoT）；session；發佈記錄 |
| R2 `r-gram-catalog` | 已發佈嘅 `catalog.json`、封面圖、歌詞 JSON；private，只經 Worker 出 |
| R2 `r-gram-media` | 音檔同 MV 檔；公開網址直接串流；Worker 只 list / head，唔寫 |

**核心原則**

1. **草稿同已發佈分開**：管理端改 D1；㩒發佈先生成 `catalog.json`。播放端永遠只見到已發佈版本。
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
| 字體 | Rokkitt（`@fontsource/rokkitt`）、Noto Sans HK（`@fontsource/noto-sans-hk`，按 unicode-range 分片） | ^5.3 | 開源、隨 app 提供；Lubalin Graph 只用 `local()`（Functional Spec D18） |
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

`data/discography.json`、`data/credits.json` 喺 scaffold 時搬去 `apps/api/seed/`（「app / script 會讀嘅檔放 app 自己 folder」）；`data/rubberband-discography.html` 搬去 `_design_/`（`_design_/rubberband-credits.html` 同轉檔 script `_design_/tools/parse_credits.py` 已經喺度）。

### 組件圖：`packages/catalog`

| 模組 | 內容 | 邊個用 |
| --- | --- | --- |
| `schema/` | `CatalogDocument`、`Album`、`Track` 型別；`parseCatalogDocument()` validator；id 格式規則 | api（發佈前驗）、player（載入時驗）、admin |
| `lrc/` | `parseLrc(text) → { lines, errors }`；`toLyricsJson()` | api（儲存時驗 + 轉 JSON）、admin（即時逐行驗證） |
| `scan/` | `matchMediaFiles(keys, tracks) → { matched, unmatchedFiles, tracksWithoutAudio, conflicts }` | api（掃描）、test |
| `wheel/` | `wheelKeyFor(title)`：英文名第一個字母（忽略 `¿` 等符號）、中文名第一個字 | api（預設值）、admin |
| `color/` | `dominantColor(pixels)`、`glowColor(hex)`（由 mockup `template.html` / `anim.js` 移植） | admin（上載封面時抽色）、player（著燈色） |

### 組件圖：`apps/player`

```
src/
├── app/            App.tsx、stageReducer.ts（場景狀態機）、providers
├── config/         layout.ts（裝置 media query 常數）、motion.ts（時長 token）、storageKeys.ts、limits.ts
├── catalog/        loader.ts（fetch + 驗證 + 本機 cache）、selectors.ts
├── stage/          Stage.tsx（按比例縮放舞台）、layouts/<mode>.ts（幾何資料表）、useLayoutMode.ts
├── components/     flag/ disc/ tonearm/ wheel/ tracklist/ info-block/ metal-button/ tv/ lyrics/ info-panel/ rotate-notice/
├── playback/       audioEngine.ts、queue.ts（純函數）、playModes.ts、mediaSession.ts、resume.ts
├── mv/             videoEngine.ts、volumeGain.ts（Web Audio）
├── favourites/     store.ts、favouritesAlbum.ts（由收藏砌出虛擬專輯）
├── lyrics/         loader.ts、activeLine.ts
├── pwa/            updateManager.ts
├── styles/         tokens.css、global.css
├── i18n/           zh-Hant.ts（語言檔）、t.ts、locale.ts、writtenChinese.test.ts（CR-002：FR-037）
└── utils/          motion.ts（prefersReducedMotion）、format.ts
```

**場景狀態機**（`stageReducer.ts`）

| 狀態 | 值 |
| --- | --- |
| `scene` | `preload` → `home` ⇄ `wheel` → `list` → `home` |
| `overlay` | `null`｜`mv`｜`lyrics`｜`info`（只喺 `scene = home` 有；`mv` 同 `lyrics` 互斥） |
| `viewAlbumId` | 畫面顯示緊嘅碟（可以同播緊嘅碟唔同，Functional Spec D13） |
| `selectedTrackId` | 歌單揀中 / 左上顯示嘅歌 |
| 播放狀態（獨立 store） | `idle`｜`loading`｜`playing`｜`paused`｜`error` + `queue`、`currentTrackId`、`positionSec`、`durationSec` |

衍生狀態唔另外存：播放針位置 =（`playing` 而且 `overlay ≠ mv` 而且 `viewAlbumId` = 播緊嘅碟）；碟轉唔轉、掣停唔停用都由上面計出嚟。

**版面系統**（`stage/`）

| 項目 | 做法 |
| --- | --- |
| 單位 | 設計基準 1080 × 1920。舞台設 CSS 變數 `--u`（= 舞台闊 ÷ 1080），所有尺寸寫 `calc(var(--u) * N)`，N 嚟自幾何表 |
| 幾何表 | `layouts/phone.ts` 輸出一個有型別嘅常數物件：各場景嘅碟位（圓心、半徑）、唱臂軸心同角度、掣位、Wheel、歌單弧線、電視框。初版數值由 `_mockups_/r-gram/src/anim.js` 檔頭常數抄入；主頁改版 mockup 確認後換數值 |
| 裝置模式 | `LayoutMode = 'phone' ｜ 'duoCover' ｜ 'duoOpenPortrait' ｜ 'duoOpenLandscape' ｜ 'square' ｜ 'desktop'`；`config/layout.ts` 用 media query 範圍判斷（Duo / HomeView 範圍沿用 903-player `apps/player/src/config/layout.ts`） |
| 未匹配裝置 | 退去 `phone`：舞台保持 9:16、按高度縮放、置中 |
| 手機橫版 | 橫向而且高度 ≤ 手機短邊上限 → 顯示 `RotateNotice`，舞台唔 render |
| 加裝置 | 加一份 `layouts/<mode>.ts` +（需要時）一個排版元件；現有模式嘅表同 CSS 唔改；用截圖比對工具證明現有裝置零改變（同 903-player `e2e:visual`） |

**繪圖方式**

| 元件 | 技術 | 備注 |
| --- | --- | --- |
| 旗幟 | `<canvas>` 2D，移植 mockup 嘅布料網格 | DPR 上限 2；網格密度係常數，真機唔夠 30fps 就降；reduced-motion 畫一格靜止 |
| CD | `<div>` + 圓形裁切嘅 `<img>` + SVG 銀邊 / 碟芯 | 轉動用 CSS animation（`animation-play-state` 控制），獨立合成層 |
| 唱臂 | inline SVG，CSS `rotate` | 時長用 scene token |
| 金屬掣 / 旋鈕 | SVG gradient（共用 `<defs>`） | 光圈用 CSS；感應範圍用透明 padding 擴到 ≥ 44pt |
| Wheel | SVG 錶盤 + pointer 拖動（慣性 + 吸附） | `role="listbox"`；方向鍵可操作 |
| 歌單 | DOM 行，CSS transform 沿弧線排 | 拖動 / 滾輪捲動 + 吸附；`role="listbox"` |
| 電視 | SVG 機身；`<video>` 用 `clip-path: path()` 裁成弧面螢幕；掃描線用 CSS 疊層 | 獨立 chunk，㩒 MV 掣先載入 |
| 模糊層 | 唱片機層 `filter: blur()` | 唔用 mockup 嘅 `blurBackdrop()` |
| 歌詞 | DOM 列表 | 獨立 chunk |

### 組件圖：`apps/api`

```
src/
├── index.ts / app.ts     Hono app、route 掛載、錯誤格式
├── config.ts             named constants（cookie 名、TTL、cache 秒數、R2 key layout、大細上限）
├── env.ts                bindings 型別（DB、CATALOG、MEDIA、vars）
├── auth/                 google.ts、oauthState.ts、session.ts、middleware.ts、routes.ts
├── albums/               routes.ts、store.ts、validate.ts
├── tracks/               routes.ts、store.ts、validate.ts
├── media/                scan.ts（R2 list → matchMediaFiles）、routes.ts
├── lyrics/               routes.ts、store.ts（D1 + R2 寫入）
├── assets/               routes.ts、imageHeader.ts（magic bytes）、imageName.ts（hash 檔名）
├── publish/              buildDocument.ts、diff.ts、warnings.ts、publish.ts、routes.ts
├── catalog/              serve.ts（catalog.json / img / lyrics，ETag、CORS）
└── lib/                  crypto.ts、http.ts（If-Match、錯誤回應）
```

### 數據流

**A. 管理端改內容 → 發佈 → 播放端**

```
管理員改專輯 / 歌 / 歌詞 ─► PATCH /api/... ─► D1（草稿）
管理員上載封面 ─► 瀏覽器裁切 + 轉 WebP + 抽主色 ─► PUT /api/assets ─► R2 img/<hash>.webp
管理員儲存歌詞 ─► PUT /api/tracks/:id/lyrics ─► 驗 LRC ─► D1 存原文 + R2 lyrics/<hash>.json
管理員㩒發佈 ─► GET /api/changes（摘要 + 警告）─► POST /api/publish
        └─► D1 讀已上架專輯 / 歌 ─► 砌 document ─► validator ─► R2 catalog.json + D1 publishes
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
GET /api/albums/:id/scan ─► R2 MEDIA.list({ prefix: '<folder>/' }) ─► matchMediaFiles()
 ─► 回預覽（已配對 / 配對唔到 / 冇檔 / 衝突），唔寫 D1
POST /api/albums/:id/scan/apply ─► 寫入非手動指定嘅配對（手動指定嘅唔郁）
```

---

## API 設計

**通則**

| 項目 | 規則 |
| --- | --- |
| 路徑 | 管理 API：`/api/*`（同 admin SPA 同一次部署，唔分版本，同 903-player）；公開內容：`/catalog/v1/*`（有版本，播放端舊版仍然讀到） |
| 認證 | `session` = 要有效 `__Host-session` cookie；改資料嘅 method（POST / PUT / PATCH / DELETE）另外要 `Origin` = Worker 自己嘅 origin |
| 格式 | JSON（`PUT /api/assets` 例外：binary body） |
| 並發 | 改單一資源要帶 `If-Match: "<updatedAt>"`；唔啱回 409 `STALE` |
| 錯誤格式 | `{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [{ "path": "title", "reason": "required" }] } }` |
| 通用錯誤 | 400 `VALIDATION_ERROR`｜401 `UNAUTHORIZED`｜403 `FORBIDDEN_ORIGIN`｜404 `NOT_FOUND`｜409 `STALE` / `CONFLICT`｜413 `TOO_LARGE`｜415 `UNSUPPORTED_TYPE`｜500 `INTERNAL` |

### Endpoint 一覽

| 編號 | Method + Path | 認證 | 用途 |
| --- | --- | --- | --- |
| API-001 | `GET /auth/google/start?next=<同站 path>` | None | 開始 Google login（PKCE、state cookie） |
| API-002 | `GET /auth/google/callback` | None | 換 token、驗 ID token、對白名單、開 session |
| API-003 | `POST /auth/logout` | session | 刪 session |
| API-004 | `GET /api/me` | session | `{ email }` |
| API-005 | `GET /api/health` | None | `{ ok, version }` |
| API-010 | `GET /api/albums` | session | 專輯列表 + 完整度統計 |
| API-011 | `POST /api/albums` | session | 新增專輯 |
| API-012 | `GET /api/albums/:id` | session | 專輯 + 歌曲 |
| API-013 | `PATCH /api/albums/:id` | session | 改專輯欄位 |
| API-014 | `DELETE /api/albums/:id` | session | 刪專輯（連歌、歌詞） |
| API-015 | `PUT /api/albums/order` | session | 專輯排序 |
| API-020 | `POST /api/albums/:id/tracks` | session | 新增歌 |
| API-021 | `PATCH /api/tracks/:id` | session | 改歌（歌名、副題、歌號、上架、credit 四欄、參考欄、手動指定音檔 / MV key） |
| API-024 | `GET /api/tracks/sources?title=` | session | 搵其他專輯同名歌（複製 credit 用；回每首嘅 credit） |
| API-022 | `DELETE /api/tracks/:id` | session | 刪歌 |
| API-023 | `PUT /api/albums/:id/tracks/order` | session | 歌曲排序（重編歌號） |
| API-030 | `GET /api/albums/:id/scan` | session | 掃描預覽（唔寫入） |
| API-031 | `POST /api/albums/:id/scan/apply` | session | 套用掃描結果 |
| API-032 | `GET /api/media?prefix=` | session | 列 R2 資料夾 / 檔案（手動指定用） |
| API-040 | `GET /api/tracks/:id/lyrics` | session | 攞 LRC 原文 |
| API-041 | `PUT /api/tracks/:id/lyrics` | session | 儲存 LRC |
| API-042 | `DELETE /api/tracks/:id/lyrics` | session | 清除歌詞 |
| API-043 | `POST /api/albums/:id/lyrics/import` | session | 批量匯入 |
| API-044 | `GET /api/lyrics/sources?title=` | session | 搵其他專輯同名而且有歌詞嘅歌 |
| API-050 | `PUT /api/assets` | session | 上載封面圖 |
| API-060 | `GET /api/changes` | session | 未發佈嘅變更摘要 + 警告 |
| API-061 | `POST /api/publish` | session | 發佈 |
| API-062 | `GET /api/publishes` | session | 發佈記錄 |
| API-070 | `GET /catalog/v1/catalog.json` | None（CORS 限播放端） | 已發佈內容 |
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
        "folder": "apollo-18",
        "enabled": true
    }
    ```
- **Response（200）**：完整專輯物件 + 新 `updatedAt`
- **Error Cases**：
    | Status | Code | 描述 |
    | --- | --- | --- |
    | 400 | VALIDATION_ERROR | 欄位格式錯（`accent` 唔係 `#rrggbb`、`releaseDate` 唔係 `YYYY-MM-DD`、`wheelKey` 多過 2 個字、`cover` 唔喺 `assets`） |
    | 409 | STALE | `If-Match` 同現有 `updatedAt` 唔同 |

### [API-030] 掃描預覽

- **Method**：GET
- **Path**：`/api/albums/:id/scan`
- **認證**：Required
- **Response（200）**：
    ```json
    {
        "folder": "apollo-18",
        "matched": [
            { "trackId": "apollo-18-01", "no": 1, "kind": "audio", "key": "apollo-18/01 一早地下鐵.m4a", "bytes": 8123456, "change": "new" }
        ],
        "unmatchedFiles": [{ "key": "apollo-18/cover.jpg", "reason": "UNKNOWN_EXTENSION" }],
        "conflicts": [{ "no": 3, "kind": "audio", "keys": ["apollo-18/03 a.m4a", "apollo-18/03 b.mp3"] }],
        "tracksWithoutAudio": [{ "trackId": "apollo-18-15", "no": 15, "title": "認錯" }],
        "manualKept": [{ "trackId": "apollo-18-02", "kind": "audio", "key": "beaming/05 Hero.m4a" }]
    }
    ```
    `change`：`new`｜`same`｜`replace`
- **Error Cases**：
    | Status | Code | 描述 |
    | --- | --- | --- |
    | 400 | NO_FOLDER | 專輯未設 `folder` |
    | 404 | FOLDER_EMPTY | R2 入面冇呢個資料夾 |

### [API-041] 儲存歌詞

- **Method**：PUT
- **Path**：`/api/tracks/:id/lyrics`
- **認證**：Required（session + same-origin）
- **Request Body**：
    ```json
    { "lrc": "[00:12.30]一早地下鐵\n[00:16.80]…" }
    ```
- **Response（200）**：
    ```json
    { "trackId": "apollo-18-01", "lineCount": 42, "lyrics": "5d41402abc4b2a76.json", "updatedAt": "2026-11-24T16:50:00.000Z" }
    ```
- **Error Cases**：
    | Status | Code | 描述 |
    | --- | --- | --- |
    | 400 | VALIDATION_ERROR | `details` 逐行列出：`{ "line": 7, "reason": "BAD_TIMESTAMP" }`、`NO_TIMED_LINES`、`LINE_TOO_LONG`、`TOO_MANY_LINES` |
    | 413 | TOO_LARGE | 超過 `LRC_MAX_BYTES` |

### [API-050] 上載封面

- **Method**：PUT
- **Path**：`/api/assets`
- **認證**：Required（session + same-origin）
- **Request**：binary body；`Content-Type: image/webp`（管理端已經喺瀏覽器裁成正方形並轉 WebP）
- **Response（200）**：`{ "name": "9f2c1a7b3d4e5f60.webp", "bytes": 184320 }`（同內容重複上載回同一個檔名）
- **Error Cases**：
    | Status | Code | 描述 |
    | --- | --- | --- |
    | 413 | TOO_LARGE | 超過 `IMAGE_MAX_BYTES` |
    | 415 | UNSUPPORTED_TYPE | Content-Type 或者檔頭 magic bytes 唔係 WebP / JPEG / PNG |

### [API-061] 發佈

- **Method**：POST
- **Path**：`/api/publish?force=1`（`force` 選填）
- **認證**：Required（session + same-origin）
- **Response（200）**：
    ```json
    { "id": 12, "hash": "ab12…", "unchanged": false, "albumCount": 16, "trackCount": 250, "createdAt": "…" }
    ```
- **Error Cases**：
    | Status | Code | 描述 |
    | --- | --- | --- |
    | 409 | ID_REMOVED | 上次發佈有、今次冇咗嘅專輯 / 歌 id（會令用戶本機嘅收藏同續播失效）；`details` 列出 id；加 `?force=1` 先可以發佈 |
    | 422 | INVALID_DOCUMENT | 砌出嚟嘅 document 過唔到 validator（唔應該發生；保護播放端） |

### [API-070] 已發佈內容

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
                        "audio": "apollo-18/01 一早地下鐵.m4a",
                        "mv": "apollo-18/01 一早地下鐵.mp4",
                        "lyrics": "5d41402abc4b2a76.json"
                    }
                ]
            }
        ]
    }
    ```
    - 只包已上架嘅專輯同歌，按管理端次序
    - `audio` / `mv` / `lyrics` / `cover` 可以係 `null`（冇音檔嘅歌照列出，播放端顯示灰色）
    - `credits` 四個欄各自可以係 `null`；四個都冇就成個 `credits` 係 `null`。值係管理端輸入嘅原文字串（多個名用「 / 」分隔只係慣例，播放端照原文顯示，唔拆）
    - 播放端砌網址時每段路徑做 `encodeURIComponent`（檔名有中文同空格）
- **Error Cases**：
    | Status | Code | 描述 |
    | --- | --- | --- |
    | 404 | NOT_PUBLISHED | 未發佈過 |

**歌詞 JSON**（API-072，`Cache-Control: public, max-age=31536000, immutable`）：

```json
{ "lines": [{ "t": 12300, "text": "一早地下鐵" }, { "t": 16800, "text": "" }] }
```

`t` 係毫秒、已按時間排序、已套用 `[offset:]`；空白 `text` = 間奏（唔 highlight 任何一行）。

---

## 數據庫設計

D1（SQLite）。時間欄一律 ISO 8601 UTC 字串（session 過期用 epoch ms）。

### albums

| 欄位 | 類型 | 約束 | 描述 |
| --- | --- | --- | --- |
| id | TEXT | PK；`^[a-z0-9]+(-[a-z0-9]+)*$`；唔可以係保留字 `favourites` | 專輯 id，建立後不變 |
| title | TEXT | NOT NULL | 碟名 |
| wheel_key | TEXT | NOT NULL | Wheel 標記（1–2 個字） |
| release_date | TEXT | NULL | `YYYY-MM-DD` |
| year | INTEGER | NULL | 顯示用年份（單曲集可以冇） |
| type | TEXT | NOT NULL DEFAULT '' | 類型 |
| label | TEXT | NOT NULL DEFAULT '' | 唱片公司 |
| accent | TEXT | NOT NULL | 專輯色 `#rrggbb` |
| cover | TEXT | NULL，FK → assets.name | 封面（1200 × 1200） |
| thumb | TEXT | NULL，FK → assets.name | 縮圖（320 × 320；Wheel 兩旁嘅碟同管理端列表用） |
| folder | TEXT | NULL | R2 `r-gram-media` 入面嘅資料夾名（預設 = id） |
| sort_order | INTEGER | NOT NULL | Wheel 次序 |
| enabled | INTEGER | NOT NULL DEFAULT 0 | 上架 |
| created_at / updated_at | TEXT | NOT NULL | `updated_at` 兼做 `If-Match` |

### tracks

| 欄位 | 類型 | 約束 | 描述 |
| --- | --- | --- | --- |
| id | TEXT | PK；`^[a-z0-9-]+$` | 歌 id，建立後不變。Seed：`<albumId>-<兩位歌號>`；管理端新增：`<albumId>-<6 位隨機>` |
| album_id | TEXT | NOT NULL，FK → albums.id ON DELETE CASCADE | |
| no | INTEGER | NOT NULL；UNIQUE (album_id, no) | 歌號 |
| title | TEXT | NOT NULL | 歌名 |
| subtitle | TEXT | NULL | 副題 |
| audio_key | TEXT | NULL | R2 key |
| audio_manual | INTEGER | NOT NULL DEFAULT 0 | 1 = 手動指定，掃描唔蓋 |
| mv_key | TEXT | NULL | R2 key |
| mv_manual | INTEGER | NOT NULL DEFAULT 0 | |
| composer | TEXT | NULL；≤ `CREDIT_MAX_CHARS` | 作曲（原文字串，例如「Tim Lui / 6號」） |
| lyricist | TEXT | NULL | 填詞 |
| arranger | TEXT | NULL | 編曲 |
| producer | TEXT | NULL | 監製 |
| lyrics_source_url | TEXT | NULL；只收 `https://` | 參考欄：歌詞參考連結，唔入 catalog |
| note | TEXT | NULL | 參考欄：備註，唔入 catalog |
| youtube_id | TEXT | NULL | 參考欄，唔入 catalog |
| video_kind | TEXT | NULL | 參考欄（MV / Live / Audio…），唔入 catalog |
| enabled | INTEGER | NOT NULL DEFAULT 1 | |
| created_at / updated_at | TEXT | NOT NULL | |

### lyrics

| 欄位 | 類型 | 約束 | 描述 |
| --- | --- | --- | --- |
| track_id | TEXT | PK，FK → tracks.id ON DELETE CASCADE | |
| lrc | TEXT | NOT NULL | 管理員貼入嘅 LRC 原文（編輯用） |
| json_name | TEXT | NOT NULL | R2 `lyrics/<hash>.json` 檔名（發佈時直接引用） |
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

### publishes

| 欄位 | 類型 | 約束 | 描述 |
| --- | --- | --- | --- |
| id | INTEGER | PK AUTOINCREMENT | |
| created_at | TEXT | NOT NULL | |
| created_by | TEXT | NOT NULL | admin email |
| status | TEXT | NOT NULL CHECK IN ('pending','ok','failed') | 先寫 `pending` → R2 寫成功 → `ok` |
| hash | TEXT | NOT NULL | document JSON 嘅 sha256（= ETag） |
| document | TEXT | NOT NULL | 發佈嘅 catalog JSON（做 diff 同將來還原用；唔含歌詞內文，估計 < 150 KB） |
| ids | TEXT | NOT NULL | JSON：今次發佈嘅專輯 id + 歌 id（ID 守衛用） |
| album_count / track_count | INTEGER | NOT NULL | |
| summary | TEXT | NOT NULL | JSON：變更摘要 |
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
| `tracks (title)` | API-044 搵同名歌 |
| `albums (sort_order)` | 列表排序 |
| `sessions (expires_at)` | 清過期 session |
| `publishes (id DESC)` 用 PK | 攞最新一次發佈 |

### R2 key layout

| Bucket | Key | 寫入時機 |
| --- | --- | --- |
| `r-gram-catalog` | `catalog/v1/catalog.json` | 發佈 |
| `r-gram-catalog` | `catalog/v1/img/<hash>.<ext>` | 上載封面 |
| `r-gram-catalog` | `catalog/v1/lyrics/<hash>.json` | **儲存歌詞時**（唔係發佈時），發佈只寫一個 `catalog.json`，唔會一次過寫幾百個檔 |
| `r-gram-media` | `<folder>/<NN> <名>.<m4a｜mp3>`、`<folder>/<NN> <名>.<mp4｜m4v>` | 用戶自行上載 |

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
| R2 key 驗證 | 手動指定嘅 key：唔可以有 `..`、唔可以以 `/` 開頭；儲存前 `MEDIA.head(key)` 確認存在 |
| 上載 | 只收 `image/webp｜jpeg｜png`；檢查 magic bytes；大細上限 `IMAGE_MAX_BYTES`（2 MB）；檔名由 server 計 hash，唔用客戶端檔名 |
| 歌詞 | `LRC_MAX_BYTES`（64 KB）、行數同每行長度上限；播放端用文字節點 render，唔用 `innerHTML` |
| 公開路由 | `/catalog/v1/*` 只回 `PLAYER_ORIGINS` 嘅 CORS；唔設 cookie |
| Header | `/api/*`、`/auth/*`：`X-Frame-Options: DENY`、`Content-Security-Policy: frame-ancestors 'none'`、`Cache-Control: no-store`；admin 靜態檔用 `apps/admin/public/_headers` |
| Secret | `GOOGLE_CLIENT_SECRET`、`SESSION_SECRET` 用 `wrangler secret`；本機 `.dev.vars`（gitignore）；CI 嘅 Cloudflare token 只畀 deploy job（同 903-player `deploy-api.yml` 兩個 job 分隔） |
| 搜尋引擎 | 播放端：`<meta name="robots" content="noindex,nofollow">` + `robots.txt` + Vercel `X-Robots-Tag`；Worker 所有回應加 `X-Robots-Tag: noindex` |
| 媒體 | `r-gram-media` 係公開網址（Functional Spec C2 / R-1，用戶已接受）；bucket 唔開 listing；CORS 只容許 `PLAYER_ORIGINS` |

---

## 性能考量

| 項目 | 設計 |
| --- | --- |
| 預期負載 | 自用：個位數用戶；Worker / D1 / R2 用量遠低於免費額度級別，唔使做容量規劃 |
| 首次載入 | Preload 期間並行載：catalog（有 timeout，失敗用本機版本）、當前專輯封面、字體。進度 = 已完成項目 ÷ 總數 |
| Bundle | 電視、歌詞、Info、非手機版面各自 lazy chunk；主 chunk 只有 Preload + 主頁 + Wheel + 歌單 + 播放 |
| 圖片 | 每張封面兩個尺寸：`cover` 1200（揀中嘅碟）、`thumb` 320（Wheel 兩旁嘅碟）；hash 檔名 + `immutable`；Service Worker CacheFirst |
| 歌詞 | 唔放入 catalog；㩒歌詞掣或者歌開始播時先載嗰首歌嘅 JSON；CacheFirst |
| Catalog | 262 首歌、唔含歌詞，估計 < 150 KB（gzip 後更細）；`max-age=60` + ETag，返回前景時重新驗證 |
| 音檔 / MV | R2 公開網址直出，瀏覽器用 Range 邊下邊播；Service Worker **唔攔截**媒體請求；`preload="metadata"` |
| 動畫 | 只郁 `transform` / `opacity`；轉動嘅碟同唱臂用獨立合成層；模糊層只喺 overlay 開住時存在；旗幟 canvas 有 DPR 上限同可調網格密度 |
| 時間更新 | 進度圈 / 時間用 `timeupdate`（約 4 次 / 秒）；歌詞畫面開住時用 `requestAnimationFrame` 讀 `currentTime`，收埋就停 |
| D1 | 全部查詢行數以百計；專輯列表嘅完整度用一條 `GROUP BY` |
| 瓶頸 | ① 旗幟網格（Functional Spec R-5，M0 真機量度）② iOS 模糊濾鏡喺舊機嘅 fps（唔夠就改用預先模糊嘅靜態截圖）③ r2.dev 網址有速率限制（見 T2） |

---

## 部署架構

| 項目 | 設計 |
| --- | --- |
| 環境 | 本機（miniflare，唔使 Cloudflare 帳戶；`wrangler dev --local-protocol https`）＋ Production。唔設 staging（自用；發佈機制本身已經隔開草稿） |
| 播放端 | Vercel：`buildCommand = npm run build -w apps/player`、`outputDirectory = apps/player/dist`；只部署 production branch（feature / fix / claude branch 關閉，同 903-player `vercel.json`） |
| 播放端 cache | `sw.js`、`index.html`、`manifest.webmanifest`：`Cache-Control: no-cache`；`assets/*`（有 hash）：`immutable` |
| Worker | `wrangler deploy`；admin SPA 係 Worker 嘅 static assets（`[assets] directory = "../admin/dist"`、`not_found_handling = "single-page-application"`、`run_worker_first = ["/api/*", "/auth/*", "/catalog/*"]`） |
| Bindings | `DB`（D1 `r-gram`）、`CATALOG`（R2 `r-gram-catalog`）、`MEDIA`（R2 `r-gram-media`） |
| `[vars]` | `GOOGLE_CLIENT_ID`、`ADMIN_EMAILS`、`PLAYER_ORIGINS`、`WORKER_ORIGIN`、`MEDIA_BASE`（只改 `wrangler.toml`，每次 deploy 會蓋走 dashboard 改動，同 903-player） |
| 播放端 build 變數 | `VITE_CATALOG_URL`（Worker 嘅 `catalog.json` 網址） |
| CI：`ci.yml` | 非 production branch push：lint、`tsc -b`、unit、build、e2e；淨改 docs 用 job 層 `if:` 跳過（SK-025） |
| CI：`deploy-api.yml` | production branch 改到 `apps/api`、`apps/admin`、`packages/catalog` 先跑：build job（冇 secret：lint + test + build admin）→ deploy job（有 secret：apply D1 migration → `wrangler deploy`） |
| 版本 | 播放端：`apps/player/package.json` version，build time 注入（Vite `define` + `index.html` placeholder）；管理端顯示 `apps/api/package.json` version |
| Rollback | 播放端：Vercel 回上一個 deployment；Worker：`wrangler rollback`；D1 migration 只加唔減（向前修正） |
| Seed | `npm run seed -w apps/api -- --local｜--remote`：讀 `seed/discography.json` → D1（`INSERT … ON CONFLICT DO NOTHING`）；讀 `seed/credits.json` 填 credit（只填而家係 `NULL` 嘅欄，唔蓋管理端改過嘅值）；下載 `coverUrl` → R2 `img/`（已有封面嘅專輯跳過）；完成後印出冇 credit 嘅歌 |
| Seed credit 配對 | 純函數 `matchCredits(discography, credits)`（有 unit test）：① 專輯 id + 歌號 + 歌名完全一樣 → 直接用；② 否則搵任何專輯同名而且有 credit 嘅行 → 用嗰行；③ 都冇 → 留空。值係「—」當冇。現有資料結果：187 / 22 / 53（共 262） |

### 用戶要喺 dashboard 做嘅設定（一次性）

| # | 設定 | 備注 |
| --- | --- | --- |
| 1 | Cloudflare：開 R2 bucket `r-gram-media`，開公開存取，設 CORS（容許播放端 origin；`GET`、`HEAD`；容許 `Range` header） | CORS 係 MV 音量旋鈕（Web Audio）嘅必要條件 |
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
| T1 | 播放端寄存 | **Vercel**（同 903-player，設定可以照抄） | Cloudflare（Workers static assets）：全部喺一個平台，但要自己寫 cache header 同部署 workflow |
| T2 | 媒體公開網址 | **先用 `r2.dev`**（同 903-player 音檔一樣，唔使網域）；`MEDIA_BASE` 係設定值，之後轉自訂網域只要改設定再發佈一次 | 一開始就用自訂網域：冇速率限制、可以經 Cloudflare cache，但要你有網域 |
| T3 | Branch 模式 | **只用 `main`**（同 903-player：feature branch → PR → `main`，`main` = production） | 團隊預設嘅 `main` + `develop` |
| T4 | 資源命名 | Worker `r-gram-api`、D1 `r-gram`、R2 `r-gram-media` + `r-gram-catalog` | 你指定 |
| T5 | 媒體檔格式建議 | 音檔 AAC `.m4a`（或者 MP3）；MV H.264 + AAC `.mp4`、最高 1080p、**要 fast start**（moov atom 喺檔頭，否則要下載晒先播到） | — |
| T6 | 多碟專輯檔名 | 歌號用連續編號（同歌單一樣：第二隻碟第一首 = `16 …`），唔支援 `2-01` 呢種寫法 | 支援 `碟-歌` 格式（規則複雜啲） |

---

## 技術風險

| 風險 | 可能性 | 影響 | 應對方案 |
| --- | --- | --- | --- |
| iOS 要喺用戶手勢入面先播到聲，但設計係㩒 play 之後約 1.5 秒（落針）先出聲 | 高 | 高 | 手勢入面即刻解鎖 `<audio>`（靜音 `play()`），落針嗰刻先由頭出聲；M0 真機驗證（見實現注意事項 1） |
| iOS 背景 / 鎖屏自動播下一首失敗 | 中 | 高 | 用同一個 `<audio>` 喺 `ended` 入面換 `src` 再 `play()`；唱片播放**唔經** Web Audio（AudioContext 喺背景會被暫停）；903-player 已有同類經驗；M0 驗證 |
| MV 音量旋鈕（Web Audio gain）喺 iPhone 唔穩定，或者 CORS 設錯導致冇聲 | 中 | 中 | M0 驗證；特徵檢測：`video.volume` 可寫就直接用（電腦 / Android）；唔得先行 Web Audio；兩樣都唔得就退做靜音開關 |
| 主頁改版令 v16 幾何數值作廢 | 高（已確定會改） | 中 | 幾何資料表同元件分離；改版 = 換數值 + 主頁排版元件 |
| 旗幟 canvas 喺真機 fps 唔夠 | 中 | 中 | 可調網格密度同 DPR 上限；最後手段改 WebGL |
| `r2.dev` 速率限制影響串流 | 低（自用） | 中 | T2：轉自訂網域，只係改設定 |
| MP4 冇 fast start，MV 要等好耐先播 | 中 | 中 | T5 寫入用戶準備檔案嘅指引；掃描時讀檔頭頭幾 KB 檢查 `moov` 位置並出警告（P1） |
| Duo / HomeView 尺寸係模擬器量度值 | 中 | 低 | 用範圍判斷唔用固定值；真機有出入只改 `config/layout.ts` |
| 加裝置版面改壞現有裝置 | 中 | 高 | 截圖比對工具（M6 之前建立），每個版面 PR 必跑 |
| Lubalin Graph 只喺有裝嘅機出現，其他機係 Rokkitt，字闊唔同 | 高 | 低 | 版面以 Rokkitt 嘅字闊做準；兩隻字都要喺 e2e 截圖驗 |
| 檔名有中文 / 空格 / 特殊符號導致網址錯 | 中 | 中 | 逐段 `encodeURIComponent`；`matchMediaFiles` 同砌網址都有 unit test 覆蓋真實檔名 |
| 刪除 / 改 id 令用戶本機收藏失效 | 低 | 中 | id 不可改；發佈有 ID 守衛（409 `ID_REMOVED`） |

---

## 實現注意事項

1. **iOS 播放解鎖**：`audioEngine.prime(src)` 一定要喺 click / pointerup handler 入面同步叫：設 `src`、`muted = true`、`play()`。落針時 `currentTime = 0`、`muted = false`。唔可以用 `volume`（iPhone 唯讀）。MV 嘅 `<video>` 同樣處理。呢個係 M0 第一個要驗證嘅嘢，結果會決定 `audioEngine` 介面。
2. **唱片播放唔經 Web Audio**：只有 MV 嘅 `<video>` 先接 `GainNode`。`<video>` 要 `crossorigin="anonymous"` + `playsinline`；`AudioContext` 喺 MV 掣嘅手勢入面 `resume()`。
3. **一個 `<audio>` element 用到尾**：換歌只換 `src`，唔好重新建立 element（iOS 解鎖狀態跟 element）。
4. **Media Session**：每次換歌更新 `metadata`（歌名、碟名、封面 `thumb` + `cover`）；註冊 `play`、`pause`、`previoustrack`、`nexttrack`、`seekto`。
5. **播放隊列係純函數**（`playback/queue.ts`）：輸入（歌曲列表、當前歌、模式、隨機數來源）→ 輸出下一首。隨機數來源由外面注入，test 先可以固定結果。Shuffle 用 Fisher–Yates，一輪之內唔重覆；只計有 `audio` 嘅歌。
6. **Favourites 係虛擬專輯**：`favouritesAlbum(catalog, favourites)` 砌出一個同真專輯同型別嘅物件（id = 保留字 `favourites`），Wheel、歌單、隊列全部當普通專輯用，唔使特別分支。catalog 入面搵唔到嘅收藏歌保留喺本機，但唔顯示。
7. **LRC parser 只有一份**（`packages/catalog/lrc`）：管理端即時驗證、API 儲存驗證、轉 JSON 都用佢。時間戳格式 `[mm:ss]`、`[mm:ss.x]`、`[mm:ss.xx]`、`[mm:ss.xxx]`；一行多個時間戳要拆開；輸出按 `t` 排序。
8. **歌詞當前行**：對 `lines[].t` 做 binary search；`activeLine(lines, ms)` 係純函數。
9. **掃描配對規則**（`packages/catalog/scan`）：檔名（唔計資料夾）開頭嘅 1–3 位數字 = 歌號；副檔名分類：`m4a`、`mp3` → audio；`mp4`、`m4v` → mv；其他 → `UNKNOWN_EXTENSION`。同一個歌號同一類有多過一個檔 → `conflicts`，唔自動揀。比對唔分大細楷。
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
| FR-117–FR-119 credit 欄位、複製、歌詞參考連結 | API-021、API-024、`tracks` credit 欄 + 參考欄 |
| FR-018、FR-027–FR-029 裝置 | `config/layout.ts`、`stage/layouts/*`、`rotate-notice` |
| FR-101 Login | API-001–004、`auth/*`、`sessions` |
| FR-102–FR-104 專輯 / 封面 / 歌 | API-010–023、API-050、`albums`、`tracks`、`assets` |
| FR-105 掃描 | API-030–032、`packages/catalog/scan` |
| FR-106、FR-110、FR-111 歌詞 | API-040–044、`lyrics`、`packages/catalog/lrc` |
| FR-107、FR-113 發佈 | API-060–062、`publishes` |
| FR-108 初始匯入 | `apps/api/scripts/seed.mjs`、`matchCredits()` |
| FR-109 公開讀取 | API-070–072 |

---

## CR-002 對技術設計嘅影響

Backend、API、資料庫、部署**全部唔受影響**。受影響嘅只有 `apps/player`。本節取代上文同佢有出入嘅地方。

| 範疇 | v1.0 | v1.1 |
| --- | --- | --- |
| 場景狀態機 | `scene`：`preload → home ⇄ wheel → list → home`；`overlay`：`mv`｜`lyrics`｜`info` | `scene`：`preload → home ⇄ discChange`、`home ⇄ list`；`overlay`：`mv`｜`booklet`。冇 `lyrics`、`info` |
| 播放狀態 | `idle`｜`loading`｜`playing`｜`paused`｜`error` | 不變。新增衍生值：唱片夾顯示（冇 icon／play／pause + 進度圈／play + 進度圈）由 `scene` + 播放狀態計出嚟 |
| 幾何資料表 | 初版數值由 v16 `anim.js` 抄入 | 初版數值由 `_mockups_/home-turntable/src/template.html` 嘅常數抄入（`DISC`、`PLATTER`、`ARM`、`BUTTONS`、`KNOB`、`SCALE`、`DIAL`、`ORBIT`、`LIST`、`ARC`、`CREDITS`、`TV`）。唱臂、旗幟、金屬質感、電視外觀仍然參考 v16 |
| 旋鈕位置 | — | 唔寫死：`KNOB.x = round(platterLeftAt(KNOB.y) / 2)`，其他裝置版面轉盤位置唔同都啱 |
| 刻度同字母盤 | Wheel 錶盤（SVG） | `positions = 已上架專輯數 + 1`；角度 = `from + pos × step`；刻度同字母共用同一個函數 |
| 元件 | `wheel/`、`lyrics/`、`info-panel/` | 刪走；改為 `knob/`（旋鈕 + 刻度 + ♥）、`dial-ring/`（字母盤）、`booklet/`（曲詞編監 + 弧線歌詞）、`spindle/`（固定唱片夾）、`platter/` |
| 碟 | 碟芯連唱片夾係碟嘅一部分 | 碟係空心環（封面用 evenodd clip 挖走碟孔）；唱片夾係獨立元件，DOM 次序緊接喺而家隻碟後面（之後嘅碟蓋過佢） |
| 弧線排列 | `drawList()` 邏輯重用 | 歌單同歌書共用一個純函數 `arcRows(centre, radius, stepDeg, focusIndex)`，輸出每行位置同淡出值 |
| 文字長度 | — | `fitText()`：量度文字闊度（canvas `measureText`），按 D22／D23 縮字、「…」或者跑馬燈；純函數部分（決定用邊個策略）有 unit test |
| Favourites 碟面 | — | App 內建靜態圖（唔經管理端）：由用戶提供嘅 logo 生成嘅透明 PNG／SVG；正式用要高清檔 |
| Catalog | 專輯有 `type`、`label`、`releaseDate` | 播放端唔再用 `type`、`label`、`releaseDate`（只用 `year`）；欄位照留喺 catalog，方便之後用，唔影響 API |
| 淨空規則 | — | `stage/layouts/*.test.ts`：對每份幾何表驗 Functional Spec CR-002 嘅淨空規則（掣同 CD ≥ 16、控件同轉盤 ≥ 40、細掣同旋鈕 ≥ 40、螺絲周圍 120、旋鈕左右空白相差 ≤ 2、感應範圍 ≥ 44pt 唔重疊）。加裝置版面時同一組測試照跑 |
| 動畫 | scene token | 新增：轉碟 0.5s（字母盤、其他碟滑入、唱臂同細掣淡出）、指針轉動 0.5s；全部用現有 `--motion-scene-*`；preview 嘅做法（只改 `transform`／`opacity`，靠 CSS transition）可以照用 |
| 字母盤過場（FR-038） | — | 底盤：`scale` 由 0.42（內圈貼旋鈕邊）去 1，0.5s，打開用回彈曲線；字母：每個獨立 `transform` + `opacity`，0.26s，用 `transition-delay` 做順時針逐個出（打開每格 14ms、收返每格 8ms，由最尾一格先收）。延遲由格數計，唔寫死 17 |
| MV 電視過場（FR-038） | 升起 + CRT 開熄（v16） | CSS keyframes：`tvRise` 0.8s（回彈）→ `crtOn` 0.45s；`crtOff` 0.28s → `tvDrop` 0.45s；天線 `scale` 彈出／縮返；背後模糊層疊喺清晰層上面做 `opacity` 淡入淡出（唔對 `filter: blur` 做動畫，慳 GPU）。熄機期間（約 0.78s）鎖住電視掣，完咗先轉場景狀態。時長全部入 `config/motion.ts` |
| 減少動態效果 | `prefersReducedMotion` | 上面兩組過場喺 `prefers-reduced-motion: reduce` 下時長 = 0，狀態即時切換 |
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
| FR-036 超長文字 | `utils/fitText.ts` |
| FR-037 介面語言同 i18n | `apps/player/src/i18n/`、`apps/admin/src/i18n/`、兩邊嘅 `writtenChinese.test.ts`、寫死文字測試 |
| FR-038 過場動畫 | `components/dial-ring`、`components/tv`、`config/motion.ts`、`utils/motion.ts` |
| FR-017 Info | 刪 |

## 修訂記錄

| 版本 | 日期 | 改動 |
| --- | --- | --- |
| v1.0 | 2026-11-24 16:50 | 初稿 |
| v1.1 | 2026-11-24 23:18 | 跟 Functional Spec v1.3（CR-002）更新：加「CR-002 對技術設計嘅影響」一節。只影響 `apps/player`；Backend、API、資料庫、部署不變 |
| v1.1（補） | 2026-11-24 23:52 | 跟 CR-002 補充：i18n（播放端加 `src/i18n/`、兩邊書面語測試、寫死文字測試、`lang`）；字母盤同 MV 電視過場嘅做法。管理端語言檔改名 `zh-Hant.ts` |
