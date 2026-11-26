# Technical Spec：R Gram（播放端 PWA + 內容管理 Backend）

**版本**：v1.9
**日期**：2026-11-26 16:30（v1.8：2026-11-26 11:40；v1.7：2026-11-26 10:30；v1.6：2026-11-25 21:10；v1.5：2026-11-25 19:36；v1.4：2026-11-25 16:40；v1.3：2026-11-25 12:40；v1.2：2026-11-25 08:06；v1.1 Approved：2026-11-25 00:07；v1.1 補二：00:01；v1.1 補一：2026-11-24 23:52；v1.0：2026-11-24 16:50；v1.1 初稿：23:18）
**作者**：Architect Agent（v1.2–v1.9：Project Manager Agent 跟 CR-003 至 CR-009 同步；標明「由 T-xxx 定案」嘅技術細節留畀嗰個任務）
**關聯 Functional Spec**：v1.11（v1.11 = CR-009：版本掣、手機打橫轉返、弧線歌單同旋鈕頭尾相接、播完最後一首、app icon 細尺寸（播放端設計稿第 20 版）；v1.10 = CR-008：揀碟同歌單欄（播放端設計稿第 19 版）、旋鈕、弧線歌單、更新、logo；v1.9 = CR-007：媒體 bucket 係唯一資料來源、`info.txt`、管理端 = 同步 + 文字框；v1.8 = CR-006：掃描係主要資料來源、初始資料只入專輯、歌號跟檔名、只有年份；v1.7 = CR-005 補充：播放端設計稿第 18 版確認；包括 CR-001 歌曲 credit、CR-002 播放端介面定稿、CR-003 管理端儲存即生效同歌曲文字框、CR-004 掃描範圍、媒體 bucket、資料夾命名、字體、內容資料、CR-005 兩張封面、封面放大、掃描以音檔做錨、左上長歌名、播緊時揀碟、字重）`2026-11-24_16-13_functional-spec_r-gram.md`
**狀態**：**v1.9**（CR-009）。跟 Functional Spec v1.11 更新（見「CR-009 對技術設計嘅影響」）：版本掣（`useUpdateStatus`／`applyNow` 經 context 入 `TopGroup`，喺弧線歌單暗層下面；拎走 `update-prompt`、`data-trap-stop`）；手機打橫轉返（`quarterTurn`、舞台轉 ±90°、`fitStage` 對調闊高、安全區轉、`toStagePoint`；`useDragScroll` 要改、`useKnobTurn` 唔使改；拎走 `rotate-notice` 同 `Stage covered`）；弧線歌單圈（`ring = N + 1`、`loopWindow`、接駁位、圈上吸附、頭尾相接鍵盤、`LIST_FLOAT` 摺返行原地淡入）；旋鈕唔夾、`stackOffset`、碟疊次序；播完最後一首（`ended` → 3 秒 → `idle`）；favicon 16／32／48、maskable 192。對照 code 改正：「手機橫版」係舞台照 render 再蓋住（唔係「唔 render」）；`pwa/` 有七個檔。今次冇改 code。**以下係 v1.8（CR-008）嘅狀態**（入面實現注意事項 12 嘅提示部分已由 CR-009 取代）：跟 Functional Spec v1.10 更新（見「CR-008 對技術設計嘅影響」）：播放端揀碟嘅顯示規則（`showsColumn`、`trackChosen`、細掣、唱臂、細唱片機；場景 × 載入／拎住 × 字母盤表）；拎走 `playHeldTrack`、`startHeld`、歌單欄行嘅 focus 同 D57 例外；反轉「拎住嘅碟唔開弧線歌單」同「字母盤開住㩒碟面入歌單」；唱片夾 `playFirst`；`heldTracks.bottomIdle` 取代 `bottomHeld`；歌單欄飄落同飄落弧線嘅 motion token；淨空規則改寫；更新規則（取代實現注意事項 12）。另外「實作對齊」：`breakAt()`（B-070）、旋鈕 `slider`（B-077 ②）、S-173／S-174／S-176（B-080）、API-017／018／019／040／041 嘅回應、錯誤碼同操作數（B-081 ④）。只影響 `apps/player`（T-108）；Backend 只係文件回寫。今次冇改 code。**以下係 v1.7（CR-007）嘅狀態**：跟 Functional Spec v1.9 更新（見「CR-007 對技術設計嘅影響」）：媒體 bucket 係唯一來源，D1 係索引；專輯由資料夾名（`parseAlbumFolder()`）同 `info.txt`（`parseAlbumInfo()`）；曲目由 `info.txt`，冇音檔 = 灰色；`albums` 刪 `label`、`wheel_key`、`sort_order`，加 `info_etag`、`checks`，`folder` NOT NULL UNIQUE；`tracks` 刪 `subtitle`、手動指定、參考欄，加 `text_key`；內容檔刪 `label`、`subtitle`；全 bucket 同步（API-033、034、035）、封面結果（API-017）、寫返 bucket（API-018、019、040、041）；取消 API-011、013、014、015、020、021、022、024、030、031、032、043；初始資料 seed 拎走；已完成 code 嘅保留／改寫／拎走清單連任務 T-103–T-106。標 🅰️ 嘅對應 Functional Spec D66–D81 嘅 PM 建議，照建議做。今次冇改 code。**以下係 v1.6（CR-006）嘅狀態**（入面掃描、seed、歌號 API 嘅設計已由 CR-007 取代）：跟 Functional Spec v1.8 更新（見「CR-006 對技術設計嘅影響」）：掃描建立歌曲（API-030 加 `newTracks`、`audioMissing`；API-031 加 `create`、`clearAudio`）；歌號 = 檔名歌號、可以跳號，刪歌唔重編，API-023 取消，API-020 要 `no`、API-021 可以改 `no`；歌 id 建立時 `<albumId>-<NN>`、之後不變；`albums.release_date`、`albums.type` 刪走，`year` 直接輸入（API-011、API-013、內容檔）；seed（T-027）只入專輯；`.mp3`、手動指定音檔、`cover2.png` 定案；字體檔 `_fonts/lubalin-graph-book.otf`。列出已完成 code 要改嘅檔（新任務 T-101、T-102；T-025、T-027 改範圍）。標 🅰️ 嘅對應 Functional Spec D60–D62、D64、D65 同 D63 細項：PM 建議，照建議做。今次冇改 code。**以下係 v1.5（CR-005 補充：播放端設計稿第 18 版用戶 2026-11-25 已確認，source commit `4e739cd`）嘅狀態**：加「補充：播放端設計稿第 18 版確認嘅技術設計」：載入嘅碟（播放 store `albumId`）同顯示嘅碟（`viewAlbumId`）分開、衍生狀態 `holding`（拎住另一隻碟）、細唱片機元件、拎住嘅碟嘅歌單欄（欄內捲動）、版面數字入 `stage/layouts/phone.ts`、motion token `chromeFadeMs`、細唱片機出現時碟名闊度收窄；D51、22 格嘅數值定案。只影響 `apps/player`；Backend、API、資料庫、內容檔唔受影響。今次冇改 code。**以下係 v1.4（CR-005）嘅狀態**（入面「第 18 版數值等用戶確認」已由 v1.5 回答）：跟用戶 2026-11-25 嘅 8 項決定（已確認）更新：類別短名同次序確認；封面細過 1200 由管理端放大（Worker 規則不變）；掃描以音檔做錨；第二張封面（`albums.cover2`／`thumb2`／`cover2_source_etag`、內容檔可選欄、API-013、掃描）；播放端每次開 app 隨機揀封面；左上歌名兩行；播緊時揀碟淡出淡入；字重唔模擬粗體（見「CR-005 對技術設計嘅影響」）。對應播放端設計稿第 18 版（commit `ae30893`）嘅數值**等用戶確認**；Functional Spec D44、D49、D54 兩個例外、D55 `cover2.png` 仍然待確認。**以下係 v1.3（CR-004）嘅狀態**（D43、D47、D48 已由 CR-005 回答）：跟用戶 2026-11-25 嘅 5 項決定（已確認）更新：掃描連封面來源同歌曲文字檔、媒體 bucket `rb-discography`、資料夾名 `<類別>-<NN>-<id>`、字體來源、內容資料 21 個發行／291 首歌；並回寫專輯、歌曲、封面 API 開發時定落嚟嘅細節（見「CR-004 對技術設計嘅影響」）。對應 Functional Spec D43（短名串法）、D44（`type` 欄）、D47、D48、D49 嘅部分**待用戶確認**；標「T-xxx 定案」嘅係技術做法。**以下係 v1.2（CR-003）嘅狀態，仍然有效**：跟用戶 2026-11-25 嘅 14 項決定（已確認）更新。對應 Functional Spec D30–D39 嘅設計：**用戶 2026-11-25 已確認 D30、D31、D32、D34、D36–D39**（「嗰 8 條跟建議」；D31 由已確認嘅決定 8 加 D32、D37 完全決定）；D33（儲存欄位）係技術決定，唔使用戶確認；D35（統計項目）等管理端設計稿第 2 版確認。**播放端設計稿第 17 版用戶 2026-11-25 已確認**（包埋第 16 版嘅內容；對應嘅技術設計見「播放端設計稿第 17 版嘅技術設計」）。管理端設計稿第 2 版同 Implementation Plan A-7、A-8 仍然等用戶確認，靠佢哋嘅任務唔開工。v1.1 用戶 2026-11-25 已確認。之後改動要行 Change Request

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
| D1 | ~~內容嘅唯一來源（SSoT）~~ ⚠️ CR-007：由媒體 bucket 砌出嚟嘅索引（加封面處理結果、歌詞 JSON 名、檢查結果）；session；catalog 生成狀態（CR-003：冇草稿、冇發佈記錄） |
| R2 `r-gram-catalog` | 而家生效嘅 `catalog.json`、封面圖、歌詞 JSON；private，只經 Worker 出 |
| R2 `rb-discography`（⚠️ CR-004；之前叫 `r-gram-media`） | 媒體 bucket：每張專輯一個資料夾（`<類別>-<NN>-<id>`），放音檔、MV 檔、封面來源（`cover.jpg｜png`）同歌曲文字檔（`NN 名.txt`）；可選 `_fonts/`。公開網址直接串流；Worker 只 list / head / get（掃描時讀文字檔），**唔寫**。⚠️ CR-007：**唯一資料來源**；每個資料夾加 `info.txt`；Worker 只寫 `info.txt` 同 `NN 名.txt`（管理端文字框），永遠唔刪 |

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
├── components/     flag/ metal/（SvgDefs、Screws、車床紋）platter/ disc/ spindle/ tonearm/ metal-button/ icons/ knob/ dial-ring/ tracklist/ info-block/ booklet/ tv/ rotate-notice/（⚠️ CR-009：拎走，D96）
│                   mini-turntable/ held-tracks/（CR-005 第 18 版：細唱片機、拎住嘅碟嘅歌單欄；T-048、T-049）
│                   （CR-002 + CR-003：場景零件全部係 React SVG 元件；wheel/、lyrics/、info-panel/ 已刪）
├── playback/       audioEngine.ts、queue.ts（純函數）、playModes.ts、mediaSession.ts、resume.ts
├── mv/             videoEngine.ts、volumeGain.ts（Web Audio）
├── favourites/     store.ts、favouritesAlbum.ts（由收藏砌出虛擬專輯）
├── lyrics/         loader.ts、activeLine.ts；第 17 版：歌詞斷行同長行策略嘅純函數（`wrapLine`、`fitLyricLine`；檔名由 T-082 定案）
├── pwa/            updateManager.ts（⚠️ CR-009 對照 code：仲有 registerUpdates.ts、reloadGuard.ts、updateChecks.ts、useUpdates.ts、manifest.ts、catalogCaching.ts）
├── styles/         tokens.css、global.css；CR-004：fonts.css（`@font-face`：local Lubalin Graph → bucket 字體 URL → 內建 Rokkitt；T-044）
├── i18n/           zh-Hant.ts（語言檔）、t.ts、locale.ts、writtenChinese.test.ts（CR-002：FR-037）
└── utils/          motion.ts（prefersReducedMotion）、format.ts
```

**場景狀態機**（`stageReducer.ts`）

| 狀態 | 值 |
| --- | --- |
| `scene` | `preload` → `home` ⇄ `discChange`；`home` ⇄ `list`；~~`discChange` → `list`（Functional Spec D27：轉碟中㩒碟面直接入歌單）~~ ⚠️ CR-008（D84）：字母盤開住時㩒碟面唔做嘢，`discChange → list` 拎走（T-108）。⚠️ CR-002 / CR-003 同步 T-032 嘅實作；之前寫 `home ⇄ wheel → list → home` |
| `overlay` | `null`｜`mv`｜`booklet`（只喺 `scene = home` 有；兩個互斥）。暫停 / 繼續係播放 store 嘅事，唔改 `overlay`：歌書開住時暫停，歌書留住（⚠️ CR-003 決定 5） |
| `viewAlbumId` | 畫面顯示緊嘅碟（可以同播緊嘅碟唔同，Functional Spec D13）。⚠️ CR-005 第 18 版：= 旋鈕指住／手上拎住嘅碟（「顯示嘅碟」）；「載入嘅碟」係播放 store 嘅 `albumId`；兩個唔同就係 `holding`（見「補充：播放端設計稿第 18 版確認嘅技術設計」） |
| `previousAlbumId` | 去 Favourites 碟之前嗰隻真專輯：再㩒 ♥ 返去（⚠️ CR-003 同步：T-032 已做） |
| `selectedTrackId` | 歌單揀中 / 左上顯示嘅歌 |
| 播放狀態（獨立 store） | `idle`｜`loading`｜`playing`｜`paused`｜`error` + `queue`、`currentTrackId`、`positionSec`、`durationSec` |

衍生狀態唔另外存：唱臂姿勢、碟轉唔轉、掣停唔停用都由上面計出嚟。

**唱臂姿勢**（⚠️ CR-003 決定 11 取代「播放針位置 = `playing` 而且 `overlay ≠ mv` 而且 `viewAlbumId` = 播緊嘅碟」）：

| 姿勢 | 條件 |
| --- | --- |
| `playing`（落針 99°，小燈著） | 播放狀態 `playing`，`overlay ≠ mv`，`viewAlbumId` = 播緊嘅碟 |
| `lifted`（升針：角度唔變，成支臂放大少少、落影移遠；設計稿第 17 版 `ARM_LIFT`，由第 16 版起） | 播放狀態 `paused` 而且係用戶㩒唱片夾暫停，`overlay ≠ mv`，`viewAlbumId` = 停低嗰隻碟 |
| `parked`（泊位 176°） | 其餘：未揀歌、`overlay = mv`、MV 熄咗之後未再播。Functional Spec D36（已確認）：重開 app 回復上次嘅歌、播完最後一首、載入失敗、~~睇緊另一隻碟~~（⚠️ CR-005 D52：揀碟期間唱臂成支淡出；第 18 版確認：拎住另一隻碟時大唱片機冇唱臂，細唱片機嘅唱臂用同一張表、以載入嘅碟計，見「補充：播放端設計稿第 18 版確認嘅技術設計」） |

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
- 開場跟「開始播」走，唔係跟畫面切換走：轉碟期間唱臂本身淡出（⚠️ CR-005 D52：播緊時一樣，碟停轉）；睇完另一隻碟返去播緊嗰隻碟，`pose` 會由 `parked` 變 `playing`，但唔應該再行一次開場（建議做法，由 T-038 定案）。⚠️ CR-005 第 18 版：返去載入嘅碟係「淡出期間即時到位 → 淡入」（設計稿 `swapAlbum`、`data-arm-instant`），唔行開場；拎住嘅碟㩒一行播先行完整開場。
- 出聲時間照實現注意事項 1：② 完嗰刻出聲；`audioEngine` 介面由 T-011 定案。

**版面系統**（`stage/`）

| 項目 | 做法 |
| --- | --- |
| 單位 | 設計基準 1080 × 1920。舞台設 CSS 變數 `--u`（= 舞台闊 ÷ 1080），所有尺寸寫 `calc(var(--u) * N)`，N 嚟自幾何表 |
| 幾何表 | `layouts/phone.ts` 輸出一個有型別嘅常數物件：各場景嘅碟位（圓心、半徑）、唱臂軸心同角度、掣位、Wheel、歌單弧線、電視框。初版數值由 `_mockups_/r-gram/src/anim.js` 檔頭常數抄入；主頁改版 mockup 確認後換數值 |
| 裝置模式 | `LayoutMode = 'phone' ｜ 'duoCover' ｜ 'duoOpenPortrait' ｜ 'duoOpenLandscape' ｜ 'square' ｜ 'desktop'`；`config/layout.ts` 用 media query 範圍判斷（Duo / HomeView 範圍沿用 903-player `apps/player/src/config/layout.ts`） |
| 未匹配裝置 | 退去 `phone`：舞台保持 9:16、按高度縮放、置中 |
| 手機橫版 | ~~橫向而且高度 ≤ 手機短邊上限 → 顯示 `RotateNotice`，舞台唔 render~~（T-039 實際：舞台照 render、`inert` + `aria-hidden`，上面蓋 `RotateNotice`）。⚠️ **CR-009（D96）**：唔再出「請打直」；同一個條件下將舞台反方向轉 90 度（闊高對調、安全區同手勢跟住轉），見「CR-009 對技術設計嘅影響 → 手機打橫轉返」 |
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
| 轉碟旋鈕 + 字母盤（CR-002 取代 Wheel） | SVG；pointer 拖動旋鈕（吸附去最近一格）。⚠️ CR-008（D91）：㩒住 `dialHoldMs`（180）或者郁過 `turnThresholdPx`（6）先開字母盤，輕點唔做嘢 | ~~`role="listbox"`~~ ⚠️ CR-008 實作對齊（B-077 ②）：旋鈕 = `role="slider"` + `aria-valuenow`（同實現注意事項 14；`components/knob/Knob.tsx`）；方向鍵可操作；角度由 `scaleAngle()` 計（CR-003：弧固定、專輯平均分佈）。第 17 版：邊格出字母、邊格出細點由純函數 `dialShowsLetter()` 決定（Functional Spec D28）；出細點嘅格嘅無障礙名稱唔變（⚠️ CR-008：唔係 listbox option，見上） |
| 歌單 | SVG `<text>` 行，用 `arcRows()` 沿弧線排（以碟心做原點；T-037 定案）。⚠️ CR-005 第 18 版：只用喺冇歌載入時揀中嘅碟同載入嘅碟。⚠️ CR-008：拎住嘅碟都用（D84）；由歌單欄開時歌名飄落（`LIST_FLOAT`） | 拖動 / 滾輪捲動 + 吸附；`role="listbox"`。⚠️ CR-008（D92，T-037 已做）：行唔㩒得；唱片夾或者 Enter／Space 播框入面嗰首 |
| 拎住嘅碟嘅歌單欄（CR-005 第 18 版） | SVG `<text>` 行，直身靠左一欄；欄內捲動用 SVG `mask`（頂底淡出）+ 位置條；底下一層舞台底色漸變（T-049 定案）。⚠️ CR-008：幾時出見 `showsColumn`（冇歌載入都出）；逐行飄落（`PANEL_FLOAT`） | 拖動 / 滾輪 / 鍵盤捲動，拖過唔當㩒；~~每行係一粒掣~~ ⚠️ CR-008（D82）：行唔係掣，冇 focus |
| 細唱片機（CR-005 第 18 版） | 重用轉盤、碟、唱片夾、唱臂元件，外層 `scale(MINI.r / PLATTER.r)`（T-048 定案） | 成組係一粒掣；碟用自己嘅轉動 class（播緊就轉，同大唱片機嘅停轉分開） |
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

> ⚠️ **CR-007**：API-011、013、014、015、020、021、022、024、030、031、032、043 取消；API-040、041 改為讀寫媒體 bucket；新增 API-017、018、019、033、034、035。以「CR-007 對技術設計嘅影響 → API 一覽嘅變化」為準；下表照舊留做記錄。

| 編號 | Method + Path | 認證 | 用途 |
| --- | --- | --- | --- |
| API-001 | `GET /auth/google/start?next=<同站 path>` | None | 開始 Google login（PKCE、state cookie） |
| API-002 | `GET /auth/google/callback` | None | 換 token、驗 ID token、對白名單、開 session |
| API-003 | `POST /auth/logout` | None（要 same-origin） | 刪 session（⚠️ CR-003 同步 T-021 嘅實作；之前寫 session） |
| API-004 | `GET /api/me` | session | `{ email }` |
| API-005 | `GET /api/health` | None | `{ ok, version }` |
| API-010 | `GET /api/albums` | session | 專輯列表 + 每張專輯嘅完整度 + 全站統計（CR-003：FR-114；項目 D35，等管理端設計稿第 2 版確認）+ catalog 生成狀態 |
| API-011 | `POST /api/albums` | session | 新增專輯（⚠️ CR-004：要 `category`；`categoryNo` 冇畀 = 嗰個類別最大序號 + 1；`folder` 冇畀 = 用預期資料夾名）。⚠️ CR-006：冇 `releaseDate`、`type`；`year` 可選 |
| API-012 | `GET /api/albums/:id` | session | 專輯 + 歌曲 |
| API-013 | `PATCH /api/albums/:id` | session | 改專輯欄位（⚠️ CR-004：加 `category`、`categoryNo`、`coverSourceEtag`；⚠️ CR-006：`year` 直接改，刪 `releaseDate`、`type`） |
| API-014 | `DELETE /api/albums/:id` | session | 刪專輯（連歌、歌詞）；冇 `?force=1` 回 409 `ID_REMOVED`（⚠️ CR-003：ID 守衛搬嚟呢度） |
| API-015 | `PUT /api/albums/order` | session | 專輯排序 |
| API-020 | `POST /api/albums/:id/tracks` | session | ⚠️ CR-006：body `{ no?, text }`，`no` 冇畀 = 最大歌號 + 1；id = `<albumId>-<NN>`（撞咗用 6 位隨機）。之前：新增歌：body 係歌曲文字 `{ text }`（同 API-041）；加喺最尾，歌號 = 次序（⚠️ CR-003） |
| API-021 | `PATCH /api/tracks/:id` | session | 改歌嘅其他欄位：參考欄（歌詞參考連結、備註）、手動指定音檔 / MV key；⚠️ CR-006：加 `no`（1 至 999，同碟唔重覆）。⚠️ CR-003：冇上架；歌名、副題、credit 改經 API-041（D37 已確認）；歌號經 API-023 |
| API-024 | `GET /api/tracks/sources?title=` | session | 搵其他專輯同名歌（「由同名歌帶入」用；回每首嘅歌曲文字：credit + 歌詞）。⚠️ CR-003：API-044 併入呢個；P1，D34 已確認 |
| API-022 | `DELETE /api/tracks/:id` | session | 刪歌；冇 `?force=1` 回 409 `ID_REMOVED`（⚠️ CR-003） |
| ~~API-023~~ | ~~`PUT /api/albums/:id/tracks/order`~~ | — | ⚠️ CR-006 取消：歌號跟檔名、可以跳號，冇拖動排序（Functional Spec D60）；改歌號經 API-021 |
| API-030 | `GET /api/albums/:id/scan` | session | 掃描預覽（唔寫入）。⚠️ CR-004：連封面來源同歌曲文字檔。⚠️ CR-006：加 `newTracks`（將會新增歌曲）、`audioMissing`（音檔已不在資料夾） |
| API-031 | `POST /api/albums/:id/scan/apply` | session | 套用掃描結果。⚠️ CR-004：body 列出確認咗嘅項目（媒體配對、歌曲文字檔）；封面由管理端經 API-050 + API-013 套用。⚠️ CR-006：加 `create`（建立歌曲）、`clearAudio`（清走消失咗嘅音檔連結） |
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
        "year": 2008,
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
    - ⚠️ CR-004：`category`（`album`｜`ep`｜`best`｜`live`｜`ost`｜`single`）、`categoryNo`（整數 ≥ 1，同類別入面唔可以重覆）、`coverSourceEtag`（由掃描套用封面時先帶；`null` = 清走）。⚠️ CR-005（D55）：加 `cover2`、`thumb2`、`cover2SourceEtag`（同第一張一樣嘅規則；`cover2`／`thumb2` 一齊有或者一齊冇；`cover` 係 `null` 時 `cover2` 一定要 `null`，否則 400 `COVER2_WITHOUT_COVER`，名由 T-100 定案）。**揀邊個位就係呢度**：API-050 只按內容存檔，唔分第一、第二張。`folder`：`null` = 用預期資料夾名 `<category>-<NN>-<id>`（之前 `null` = 用專輯 id）；字串 = 手動改綁
    - ~~`year` 唔可以直接改（跟 `releaseDate`）~~ ⚠️ CR-006（Functional Spec D63）：`year` 直接改：`null` 或者 `YEAR_MIN`（1900）至 `YEAR_MAX`（2100）嘅整數，否則 `INVALID_YEAR`；`releaseDate`、`type` 唔再收（`NOT_EDITABLE`；D44 定案：類別嘅中文名喺管理端語言檔）。改 `title` 唔會重計 `wheelKey`；`accent` 存細楷
- **Response（200）**：完整專輯物件 + 新 `updatedAt`（⚠️ CR-003：冇 `enabled` 欄；儲存成功之後自動生成 catalog，回應帶 `catalog.ok`）。⚠️ CR-004：專輯物件加 `category`、`categoryNo`、`coverSourceEtag`、`expectedFolder`（計出嚟，唔可以改）
- **Error Cases**：
    | Status | Code | 描述 |
    | --- | --- | --- |
    | 400 | VALIDATION_ERROR | 欄位格式錯（`accent` 唔係 `#rrggbb`、~~`releaseDate` 唔係 `YYYY-MM-DD`~~ `year` 唔係 1900 至 2100 嘅整數（CR-006）、`wheelKey` 多過 2 個字、`cover` 唔喺 `assets`）；冇帶 `If-Match`；未知或者唔可以改嘅欄位（`NOT_EDITABLE`）。⚠️ CR-004：`category` 唔係六個短名之一、`categoryNo` 唔係正整數或者同類別入面已有人用（建議 `ORDINAL_TAKEN`）、`folder` 有 `..` 或者 `_` 開頭（`INVALID_FOLDER`） |
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
- **Request**：binary body；`Content-Type: image/webp`（管理端已經喺瀏覽器裁成正方形並轉 WebP）。⚠️ CR-004 回寫（T-024）：`image/jpeg`、`image/png` 都收；宣稱嘅類型一定要同檔案內容（檔頭）一致；圖一定係正方形，邊長係 1200（大封面）或者 320（縮圖），每個尺寸各上載一次。~~大封面嘅尺寸規則 Functional Spec D48 建議放寬為 640 至 1200~~ ⚠️ CR-005（D50）：尺寸規則**不變**；來源圖細過 1200 由管理端放大。呢個 endpoint 唔分第一、第二張封面（位喺 API-013 揀）
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
                "year": 2008,
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
    - ⚠️ CR-004：專輯加 `category`（六個短名之一）同 `categoryNo`（正整數）；播放端唔顯示，validator 要驗（review W-028：兩個都必填）。
    - ⚠️ CR-006：專輯冇 `releaseDate`、`type`（Functional Spec D63、D44）；`year` 係 `null` 或者正整數，同其他欄冇關係。`tracks` 按 `no` 由細到大，`no` 可以跳號（D60；validator 只驗正整數同唔重覆，本身已經係咁）
    - ⚠️ CR-005（D55）：專輯加**可選**嘅 `cover2`、`thumb2`（asset 名或者冇）；冇呢兩個欄嘅舊 document 照樣有效。`cover2` 有就一定有 `thumb2`、亦一定有 `cover`。冇第二張專輯色（`accent` 跟第一張）。`version` 仍然係 1（未部署過，冇舊播放端要兼容）
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

> ⚠️ **CR-007**：`albums` 刪 `label`、`wheel_key`、`sort_order`，加 `info_etag`、`checks`，`folder` 改 NOT NULL UNIQUE；`tracks` 刪 `subtitle`、`audio_manual`、`mv_manual`、`lyrics_source_url`、`note`、`youtube_id`、`video_kind`，加 `text_key`。以「CR-007 對技術設計嘅影響 → 資料模型」為準；下面兩張表照舊留做記錄。
>
> ⚠️ **CR-003**：`albums.enabled`、`tracks.enabled` 刪走；`publishes` 換做 `catalog_state`；`lyrics` 改欄。已經寫好嘅 `apps/api/migrations/0001_init.sql` 同 `test/schema.test.ts` 要跟住改（Implementation Plan T-096）；D1 未部署過，冇資料要搬。

### albums

| 欄位 | 類型 | 約束 | 描述 |
| --- | --- | --- | --- |
| id | TEXT | PK；`^[a-z0-9]+(-[a-z0-9]+)*$`；唔可以係保留字 `favourites` | 專輯 id，建立後不變 |
| title | TEXT | NOT NULL | 碟名 |
| wheel_key | TEXT | NOT NULL | Wheel 標記（1–2 個字） |
| ~~release_date~~ | — | — | ⚠️ CR-006 刪除（Functional Spec D63：只要年份） |
| year | INTEGER | NULL | 年份（可選）。⚠️ CR-006：直接輸入（API 驗 1900 至 2100），唔再跟發行日期計 |
| ~~type~~ | — | — | ⚠️ CR-006 刪除（Functional Spec D44 定案：由 `category` 帶出中文名，喺各 app 語言檔） |
| category | TEXT | NOT NULL；CHECK IN ('album','ep','best','live','ost','single') | ⚠️ CR-004 新增：發行類別短名（錄音室專輯、迷你專輯、精選、現場專輯、電影原聲、單曲）。串法待用戶確認（D43） |
| category_no | INTEGER | NOT NULL；CHECK (category_no >= 1) | ⚠️ CR-004 新增：喺嗰個類別入面嘅序號。同類別唔可以重覆（API 層驗證） |
| label | TEXT | NOT NULL DEFAULT '' | 唱片公司 |
| accent | TEXT | NOT NULL | 專輯色 `#rrggbb` |
| cover | TEXT | NULL，FK → assets.name | 封面（1200 × 1200；~~⚠️ CR-004：D48 建議放寬為 640 至 1200 嘅正方形~~ ⚠️ CR-005 D50：規則不變，細圖由管理端放大）。第一張封面，專輯色由佢抽 |
| cover_source_etag | TEXT | NULL | ⚠️ CR-004 新增：上次由掃描套用嘅封面來源（媒體 bucket 嘅 `cover.jpg｜png`）嘅 R2 ETag；NULL = 未套用過。人手上載封面唔改呢個欄 |
| thumb | TEXT | NULL，FK → assets.name | 縮圖（320 × 320；Wheel 兩旁嘅碟同管理端列表用） |
| cover2 | TEXT | NULL，FK → assets.name；CHECK (cover2 IS NULL OR cover IS NOT NULL) | ⚠️ CR-005 新增（D55）：第二張封面（1200 × 1200）。冇第一張唔可以有第二張 |
| thumb2 | TEXT | NULL，FK → assets.name | ⚠️ CR-005 新增：第二張封面嘅縮圖（320 × 320）。同 `cover2` 一齊有或者一齊冇（API 層驗證） |
| cover2_source_etag | TEXT | NULL | ⚠️ CR-005 新增：上次由掃描套用嘅第二張封面來源（`cover2.jpg`）嘅 R2 ETag；規則同 `cover_source_etag` |
| folder | TEXT | NULL | 媒體 bucket `rb-discography` 入面嘅資料夾名，一層。⚠️ CR-004：NULL = 用預期資料夾名 `<category>-<NN>-<id>`（之前 NULL = 用 id）；非 NULL = 手動改綁。唔可以有 `/` `\` `?` `#` `%` `..`，唔可以 `_` 開頭 |
| sort_order | INTEGER | NOT NULL | Wheel 次序 |
| ~~enabled~~ | — | — | ⚠️ CR-003 刪除（冇上下架） |
| created_at / updated_at | TEXT | NOT NULL | `updated_at` 兼做 `If-Match` |

### tracks

| 欄位 | 類型 | 約束 | 描述 |
| --- | --- | --- | --- |
| id | TEXT | PK；`^[a-z0-9-]+$` | 歌 id，建立後不變。~~Seed：`<albumId>-<兩位歌號>`；管理端新增：`<albumId>-<6 位隨機>`~~ ⚠️ CR-006（D61）：掃描同管理端建立時一律 `<albumId>-<兩位歌號>`（`trackIdFor()`），已經有人用先用 `<albumId>-<6 位隨機>`；改歌號唔改 id |
| album_id | TEXT | NOT NULL，FK → albums.id ON DELETE CASCADE | |
| no | INTEGER | NOT NULL；UNIQUE (album_id, no) | ⚠️ CR-006（D60）：歌號 = 檔名開頭嘅歌號，1 至 999，可以跳號；刪歌唔重編；經 API-021 改。之前：歌號（⚠️ CR-003：跟歌曲行次序由 1 連續編，API-023 重編；管理端唔可以直接改） |
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
| `rb-discography` | `<folder>/cover.<jpg｜png>`（封面來源）、`<folder>/cover2.<jpg｜png>`（第二張，CR-005／CR-006）、`<folder>/<NN> <名>.txt`（歌曲文字） | ⚠️ CR-004：用戶自行上載；Worker 只讀（掃描）。⚠️ CR-007：`.txt` 亦會由管理端文字框寫（API-041） |
| `rb-discography` | `<folder>/info.txt`（⚠️ CR-007：碟名、年份、曲目） | 用戶自行上載，或者管理端 `info.txt` 文字框寫（API-019） |
| `rb-discography` | `_fonts/<檔名>`（可選：slab 字體檔；⚠️ CR-006：實際係 `_fonts/lubalin-graph-book.otf`） | ⚠️ CR-004：用戶自行上載；播放端直接載入，Worker 唔理 |

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
| R2 key 驗證 | ⚠️ CR-007：冇手動指定；寫入 key 見「CR-007 → 安全設計」。之前：手動指定嘅 key：唔可以有 `..`、唔可以以 `/` 開頭；儲存前 `MEDIA.head(key)` 確認存在。⚠️ CR-004：專輯 `folder` 用同一條 `..` 規則，另外唔可以 `_` 開頭；API-031 嘅 key 一定要喺嗰張專輯嘅資料夾入面 |
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
| 播放端 build 變數 | `VITE_CATALOG_URL`（Worker 嘅 `catalog.json` 網址）；⚠️ CR-004（T-044 已定案）：`VITE_FONT_URL`（可選：媒體 bucket 嘅 slab 字體檔網址，一定要係 https；只有一個網址，冇另外嘅粗體檔設定） |
| CI：`ci.yml` | 非 production branch push：lint、`tsc -b`、unit、build、e2e；淨改 docs 用 job 層 `if:` 跳過（SK-025） |
| CI：`deploy-api.yml` | production branch 改到 `apps/api`、`apps/admin`、`packages/catalog` 先跑：build job（冇 secret：lint + test + build admin）→ deploy job（有 secret：apply D1 migration → `wrangler deploy`） |
| 版本 | 播放端：`apps/player/package.json` version，build time 注入（Vite `define` + `index.html` placeholder）；管理端顯示 `apps/api/package.json` version |
| Rollback | 播放端：Vercel 回上一個 deployment；Worker：`wrangler rollback`；D1 migration 只加唔減（向前修正） |
| Seed | ⚠️ **CR-007：取消**（Functional Spec D79）：冇 seed；部署之後喺管理端同步一次，專輯由資料夾建立。下面只留做記錄。 `npm run seed -w apps/api -- --local｜--remote`：讀 `seed/discography.json` → D1（`INSERT … ON CONFLICT DO NOTHING`）；讀 `seed/credits.json` 填 credit（只填而家係 `NULL` 嘅欄，唔蓋管理端改過嘅值）；下載 `coverUrl` → R2 `img/`（已有封面嘅專輯跳過）；完成後印出冇 credit 嘅歌。⚠️ CR-004：寫入 `category`、`category_no`（`folder` 留 NULL = 用預期資料夾名）；資料係 21 個發行、291 首歌（T-097 重新生成之後）；封面照 ~~Functional Spec D48（待確認）~~ ⚠️ CR-005 D50：置中裁正方形，細過 1200 就放大到 1200，再出 320 縮圖（script 自己做），完成後列出放大咗同冇封面嘅專輯；初始資料冇第二張封面。⚠️ CR-003：冇上架欄，seed 完全部專輯同歌即刻入 catalog；seed 之後要生成一次 catalog（做法由 T-027 定案，見 API-070 `NOT_READY`） |
| Seed credit 配對 | 純函數 `matchCredits(discography, credits)`（有 unit test）：① 專輯 id + 歌號 + 歌名完全一樣 → 直接用；② 否則搵任何專輯同名而且有 credit 嘅行 → 用嗰行；③ 都冇 → 留空。值係「—」當冇。~~現有資料結果：187 / 22 / 53（共 262）~~ ⚠️ CR-004：呢組係舊資料嘅結果，作廢。⚠️ CR-005 補（T-097 結果，review S-122）：246 / 0 / 45（共 291；credit 檔 21 段、252 行） |

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
12. **PWA 更新**（`pwa/updateManager.ts`，同 903-player）：啟動、`visibilitychange`、定時叫 `registration.update()`；新 SW 喺 waiting 等；~~播放狀態係 `idle` / `paused` 先 `SKIP_WAITING` → `controllerchange` → reload 一次（`sessionStorage` 防 loop）~~。⚠️ **CR-008（Functional Spec D93，取代 D14）**：只喺開 app（Preload 期間）自動 `SKIP_WAITING` → reload 一次（防 loop）；用緊 app 永遠唔會自己換，出提示等聽眾㩒「立即更新」。見「CR-008 對技術設計嘅影響 → 更新」。⚠️ **CR-009（D95）**：提示換做版本掣（右上版本號，喺暗層下面），㩒 = `applyNow()`；見「CR-009 對技術設計嘅影響 → 版本掣」。
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
| FR-018、FR-027–FR-029 裝置 | `config/layout.ts`、`stage/layouts/*`、~~`rotate-notice`~~（⚠️ CR-009：手機打橫轉返，`stage/rotation.ts`、`usePhoneLandscape`） |
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
| Catalog | 專輯有 `type`、`label`、`releaseDate` | 播放端唔再用 `type`、`label`、`releaseDate`（只用 `year`）；欄位照留喺 catalog，方便之後用，唔影響 API。⚠️ CR-006：`type`、`releaseDate` 由 catalog 刪走（Functional Spec D44、D63）；`label` 照留 |
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
| 專輯資料夾 | `albums.folder`：一層，NULL = 用專輯 id | NULL = 用**預期資料夾名** `<category>-<NN>-<id>`（由類別、序號、id 即時計，唔另外存）；非 NULL = 手動改綁。純函數 `expectedFolder()` 放 `packages/catalog`，API、seed、管理端共用。資料夾名唔可以有 `..`（同手動指定 key 嘅規則睇齊）；`_` 開頭保留 | 決定 3 已確認（D43）；短名串法 ⚠️ CR-005 已確認 |
| 專輯資料模型 | — | `albums` 加 `category`（六個短名之一）、`category_no`（類別內序號）、`cover_source_etag`（上次套用嘅封面來源）。`tracks` 加 `text_source_etag`（上次套用嘅文字檔） | 決定 5 已確認（D44）；兩個 `*_source_etag` 係技術做法（D41） |
| 內容檔 schema | 專輯有 `type`（自由文字） | `albums[]` 加 `category`、`categoryNo`；`type` 照留。播放端唔顯示呢兩個欄，validator 要收 | 決定 5 已確認；`type` 點處理待用戶確認（D44） |
| 掃描 | list → `matchMediaFiles()`：音檔、MV | 加兩類：封面來源（`cover.jpg｜png`）同歌曲文字檔（`NN 名.txt`）。預覽（API-030）列出封面、歌曲文字、媒體配對、衝突、未配對；套用（API-031）只做管理員確認咗嘅項目 | 決定 1 已確認（D40） |
| 封面由掃描套用 | — | Worker 只報告有冇來源同 ETag 有冇變。管理端頁面由媒體 bucket 公開網址攞原圖（跨 origin，要 bucket CORS 容許管理端 origin）→ 裁切 → 1200 同 320 → WebP → 抽專輯色 → 現有 API-050 × 2 → PATCH 專輯（連 `coverSourceEtag`） | 決定 1 已確認；Worker 冇圖片編解碼（T-024 已確立） |
| 歌曲文字由掃描套用 | — | Worker 讀 `.txt`（大細上限同 API-041）→ `parseSongText()`；套用行同 API-041 一樣嘅儲存路徑（逐行錯誤、`LYRICS_REMOVED` 要 `force`、寫歌詞 JSON、生成 catalog），並記低 `text_source_etag` | 決定 1 已確認 |
| 字體 | Rokkitt + Noto Sans HK 隨 app 提供；Lubalin Graph 只用 `local()`（實際未載入任何字體檔，backlog B-054） | slab：`local()` Lubalin Graph → 媒體 bucket 字體 URL（build 時可選設定）→ 內建 Rokkitt。字體載入後重新量字。商業字體檔唔入 repo | 決定 4 已確認（D45）；路徑同設定名係建議，T-044 定案 |
| 內容資料 | 17 張專輯、262 首歌；credit 配對 187 / 22 / 53 | 21 個發行、291 首歌、六個類別；credit 檔 21 個發行、252 行。seed 由 `_design_/tools/` 重新生成（T-097）；新嘅 credit 配對數字（⚠️ CR-005 補，T-097 結果）：246 / 0 / 45，本文件寫 187 / 22 / 53 嘅地方作廢 | 決定 5 已確認（D46） |
| 轉盤 | 18 格，每格都出字母 | 22 格（21 + ♥）：`dialLetterEvery(22)` = ⌈21 ÷ 9⌉ = 3，由第一日起行「碟多」規則。規則同 code 設計不變（「播放端設計稿第 17 版嘅技術設計」） | 決定 5 嘅後果；規則第 17 版已確認 |
| 初始次序 | seed `order` = 發行日期次序 | seed `order` 照用戶嘅歌單檔：先類別、後序號 | ⚠️ CR-005：用戶已確認（D47）；T-097 已經咁生成 |
| 封面尺寸 | 1200 × 1200 同 320 × 320（T-024 已實作：只收呢兩個尺寸） | ~~建議：大封面放寬為正方形、邊長 640 至 1200~~ ⚠️ CR-005（D50 取代 D48）：規則不變（1200 同 320）；細圖由管理端放大到 1200；seed 用同一條規則 | 用戶已確認（決定 3）；T-099 改範圍（見「CR-005」） |
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
| 歌號冇對應嘅歌 | 未配對：`NO_SUCH_TRACK` | `.txt` 嘅情況見 Functional Spec D49（待確認：建議歌號接住歌單就可以新增）。⚠️ CR-005：錨改為音檔（D54）。⚠️ CR-006：有音檔嘅歌號 → `newTracks`（建立歌曲）；`NO_SUCH_TRACK` 只剩「冇音檔亦冇歌」嘅 `.txt`／MV，而嗰啲已經係 `skipped`（`NO_AUDIO`），所以實際唔會再出 |
| ⚠️ CR-005：`cover2.jpg`、⚠️ CR-006：`cover2.png`（D55 定案） | 第二張封面來源 | 規則同 `cover.jpg`；冇第一張就入「已略過」（`NO_FIRST_COVER`） |
| ⚠️ CR-005：歌號喺資料夾冇音檔嘅 `.txt`、`.mp4`／`.m4v` | 已略過：`NO_AUDIO`（新一類 `skipped`） | D54：資料庫有嗰首歌都一樣；例外（`.mp3`、手動指定音檔）⚠️ CR-006 定案 |
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
| `type` | ~~未確認 D44 之前：照舊係可以改嘅自由文字；seed 填類別嘅中文名。確認之後：API 唔再收 `type`，寫入時由 `category` 帶出~~ ⚠️ CR-006（D44 定案）：`type` 欄由 D1、API、內容檔刪走；中文名只喺管理端語言檔（T-101） |
| Migration | D1 未部署過（Implementation Plan U-3 未做）：照 T-096 嘅做法直接改 `0001_init.sql`，唔加 `0002` |

### 字體（T-044）

| 項目 | 設計 |
| --- | --- |
| 內建 | Rokkitt（`@fontsource` 系列，woff2；用可變字重或者設計用到嘅幾個字重，T-044 定），由 `apps/player` 自己嘅 bundle 出 |
| 次序 | ① `local()`：`ITC Lubalin Graph Std Book`、`LubalinGraphStd-Book`、`ITC Lubalin Graph Std`（設計稿 `fonts.css` 用嘅三個名）→ ② `url(<VITE_FONT_URL>)`（build 時有設定先出呢一項）→ ③ 內建 Rokkitt。做法（一個 `@font-face` 嘅 `src` 清單，定係幾個 family 順序排入 `--font-slab`）由 T-044 定案；要求：Rokkitt 用真字重；~~Book 單一字重遇到粗體由瀏覽器模擬，除非另外提供粗體檔~~ ⚠️ CR-005（Functional Spec D53，用戶確認）：Book 單一字重**照 Book 粗幼顯示，唔模擬粗體**。**T-044 實際做法**（就係咁，唔使改）：一個 `@font-face` 嘅 `src` 清單，兩個 family（`RB Slab`、`RB Slab Light`）都宣告 `font-weight: 100 900`（同設計稿 `fonts.css` 一樣），所以瀏覽器唔會模擬粗體（review W-026 關閉） |
| 設定 | 播放端 build 變數（T-044 定案）：`VITE_FONT_URL`（可選；例如 `<MEDIA_BASE>_fonts/slab-book.woff2`，`.otf` 都得；一定要係 https，其他值會被忽略並喺 build 時警告）。冇設定 = 完全唔向 bucket 發請求。冇另外嘅粗體檔設定 |
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
| API-013 改專輯 | ~~`year` 唔可以直接改，跟 `releaseDate` 計~~（⚠️ CR-006：`year` 直接改，冇 `releaseDate`）；改碟名唔會重計 `wheelKey`；`accent` 存細楷；空 body 只更新 `updatedAt`；文字欄上限 200 個字（`TITLE_MAX_CHARS`），`wheelKey` 最多 2 個字，唔收換行、控制字元同隱形格式字元 | T-022 review #1、#3、#7、#9；re-review |
| API-014 刪專輯 | 冇 `?force=1`：409 `ID_REMOVED`，`details` = `[{ type, id }]`（專輯同佢啲歌）。有：200 `{ deleted: { albumId, trackIds } }`；冇其他歌用嘅歌詞檔一齊刪 | T-022 review #5；commit `6ef24f9`（B-048） |
| API-015、~~API-023~~ 排序（⚠️ CR-006：API-023 取消） | body `{ ids }`；格式錯 → 400（`INVALID_LIST`）；`ids` 同現有嗰批唔一樣（期間有人加減過）→ 409 `CONFLICT`；成功回 `{ ids }`。歌曲排序唔更新 `updatedAt` | T-022 review #6；T-023 review S-069、#8 |
| API-020 新增歌 | 201，形狀同 API-041 嘅 200 一樣。歌 id = `<albumId>-<6 位隨機>`（撞咗重試，最多 3 次）。⚠️ CR-006：改為 `<albumId>-<NN>`，撞咗先用隨機（T-102） | T-023 review #7、S-069 |
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
| FR-041 字體 | `apps/player/src/styles/fonts.css`、`tokens.css`、`utils/textMeasure.ts`、`VITE_FONT_URL`、Preload 進度、PWA cache |
| FR-105、FR-103（改） | 同 FR-123；API-050（尺寸規則 D48 待確認） |
| FR-108（改） | `_design_/tools/`、`apps/api/seed/*.json`、`apps/api/scripts/seed.mjs`、`matchCredits()` |
| FR-035（22 格） | `dialLetterEvery()`、`dialShowsLetter()`（設計不變） |
| 非功能需求「介面文字」（Backend 錯誤訊息） | `apps/api/src/i18n/zh-Hant.ts`、`test/writtenChinese.test.ts`、`test/messageParams.test.ts` |

## CR-005 對技術設計嘅影響

對應 Functional Spec v1.6 §CR-005（用戶 2026-11-25 嘅 8 項決定，已確認）。本節取代上文同佢有出入嘅地方；受影響嘅表已喺原位改（標 ⚠️ CR-005）。**今次冇改 code**：跟進任務見下面「已完成嘅 code 受 CR-005 影響」。播放端設計稿第 18 版（commit `ae30893`）嘅數值**等用戶確認**。

| 範疇 | v1.3 | v1.4 | 狀態 |
| --- | --- | --- | --- |
| 類別短名、初始次序 | 待確認（D43、D47） | `RELEASE_CATEGORIES` 同 seed `order` 照 T-097 已做嘅，唔使改 | 已確認（決定 1、2） |
| 封面尺寸 | 建議放寬 Worker 規則（D48） | Worker 規則不變（1200² 同 320²）；細圖喺管理端放大；seed 一樣放大 | 已確認（D50）；T-099 改範圍 |
| 掃描 | 每類檔各自按歌號配對 | 音檔做錨：冇音檔嘅歌號，`.txt`、MV 入 `skipped`（`NO_AUDIO`）；加 `cover2.jpg` | 已確認（D54、D55）；兩個例外同 `cover2.png`：⚠️ CR-006 定案 |
| 第二張封面 | — | `albums.cover2`、`thumb2`、`cover2_source_etag`；內容檔可選 `cover2`、`thumb2`；API-013 三個欄 | 已確認（D55）；T-100 |
| 播放端封面 | 用 `album.cover`／`thumb` | 開 app 時每張專輯隨機揀一張，開住期間唔變，唔記低 | 已確認（D56）；T-046 |
| 左上歌名 | `fitText()`：縮字 → 「…」 | 縮字 → 兩行 → 第二行尾「…」 | 已確認（D51）；數值 ✅ 第 18 版已確認（`SONG_FIT`）；T-047 |
| 播緊時揀碟 | 唱臂、細掣淡出（CR-002）；碟照轉 | 揀碟期間唱臂同三粒細掣淡出、碟停轉、聲照播；返播緊嗰隻碟鬆手淡入返。⚠️ 第 18 版確認改寫：連左上歌名嗰部分淡出；拎住另一隻碟（`holding`）：細唱片機 + 歌單欄 | 已確認（D52，第 18 版改寫）；T-036、T-048、T-049 |
| 字重 | spec 寫「Book 遇到粗體由瀏覽器模擬」 | 唔模擬粗體（同 T-044 code 一致） | 已確認（D53）；唔使改 code |

### 封面尺寸（D50）

| 項目 | 設計 |
| --- | --- |
| Worker（API-050） | 不變：只收 1200 × 1200 同 320 × 320 嘅正方形 |
| 管理端 | 現有封面處理（裁切 → 兩個尺寸 → WebP → `dominantColor()`）入面，canvas 一律畫出 1200 同 320：來源細過 1200 就係放大（`imageSmoothingQuality = 'high'`）。來源邊長 < 1200 時顯示提示（語言檔），唔擋儲存。第一、第二張封面、人手上載同掃描套用都行同一個函數（T-052） |
| Seed（T-027） | Node 入面用同一條規則：置中裁正方形 → 細過 1200 放大 → 出 1200 同 320（圖片處理依賴要過 `npm audit`、唔用 GPL）→ 列出放大咗同冇封面嘅專輯 |
| T-099 | 放寬規則唔做。淨返 backlog B-052 ①：PATCH 專輯時驗 `cover`／`cover2` 係 1200、`thumb`／`thumb2` 係 320（`assets` 加 `width` 欄，或者驗證時讀檔頭量；T-099 定案），防止大封面同縮圖調亂 |

### 掃描以音檔做錨（D54；T-025）

| 項目 | 設計 |
| --- | --- |
| 次序 | 分類（「掃描嘅設計」表）→ 搵出資料夾入面有音檔嘅歌號集合 → `.txt`、MV 只配對集合入面嘅歌號；其餘入 `skipped` |
| 預覽回應（API-030） | 加 `skipped: [{ key, no, kind: 'text'｜'mv'｜'cover2', reason: 'NO_AUDIO'｜'NO_FIRST_COVER' }]`；`songTexts` 同 `matched`（MV）只會有有音檔嘅歌號 |
| 套用（API-031） | Worker 再驗一次：body 入面嘅 `.txt`／MV 歌號而家冇音檔 → 嗰項回 `NO_AUDIO`，唔套用 |
| 例外（⚠️ CR-006 定案） | `.mp3` 算音檔（同 D9）；歌曲已經 `audio_manual = 1` 就當有音檔 |
| D49 | ⚠️ CR-006：D49 由 D60 取代：音檔集合入面未有歌嘅歌號全部入 `newTracks`（可以跳號），見「CR-006 對技術設計嘅影響」 |

### 第二張封面（D55；T-100、T-025、T-052、T-053）

| 項目 | 設計 |
| --- | --- |
| D1 | `albums` 加 `cover2`、`thumb2`（FK → `assets.name`）、`cover2_source_etag`；CHECK `cover2 IS NULL OR cover IS NOT NULL`。未部署過：直接改 `0001_init.sql`（同 T-098 做法） |
| `packages/catalog` | `CatalogAlbum` 加可選 `cover2?: string ｜ null`、`thumb2?: string ｜ null`；validator：冇呢兩個欄照收（舊 document）；有就要成對，而且要有 `cover`。`version` 仍然係 1 |
| API | API-013 收 `cover2`、`thumb2`、`cover2SourceEtag`；API-010、API-012、API-013 回應帶埋三個欄；`buildDocument` 出 `cover2`、`thumb2`。移除第一張而第二張仲喺度 → 400（管理端先移除第二張，或者同一個 PATCH 兩張一齊清） |
| API-050 | 不變：按內容 hash 存檔，唔分第一、第二張；「邊個位」由 API-013 嘅欄位決定 |
| 掃描（API-030／031） | 預覽加 `cover2`（形狀同 `cover`；`change` 同 `albums.cover2_source_etag` 比）；`cover.jpg` 同 `cover2.jpg` 都由管理端套用（API-050 × 2 → API-013） |
| 專輯色 | 只由第一張抽；套用第二張嘅 PATCH 唔帶 `accent` |
| 管理端 | 專輯頁封面位多一格（T-052）；掃描結果多一項（T-053） |

### 播放端隨機封面（D56；T-046、T-034、T-036）

| 項目 | 設計 |
| --- | --- |
| 純函數 | `pickCoverVariants(albums, random) → Map<albumId, 0 ｜ 1>`（`apps/player/src/catalog/`）：冇 `cover2` = 0；有 = `random() < 0.5 ? 0 : 1`。`random` 注入（測試用固定值）。`albumArt(album, variant) → { cover, thumb }` selector |
| 幾時揀 | 第一次攞到 catalog（Preload，T-034）時揀一次，放喺記憶體（app 層 state 或者 context），**唔寫 localStorage**。之後 catalog 更新：已揀嘅專輯保留；新出現第二張封面嘅專輯當 0（下次開 app 先揀） |
| 用嘅地方 | `homeView.ts` 嘅 `coverUrl`（T-035 已完成，T-046 跟進）、轉盤滑入嘅碟（T-036，用 `thumb`）、Preload 預載當前專輯封面（T-034）、Media Session artwork（T-062） |
| 離線 cache | 封面已經係 CacheFirst runtime cache；載入一張專輯嘅封面之後，喺 idle 時順手 `fetch` 另一張（大封面同縮圖），令兩張都入 cache。只限睇過嘅專輯，唔一次過攞晒 |
| 測試 | 純函數 unit test（冇第二張、兩個 variant、catalog 更新保留）；`homeView` 測試用注入嘅 variant |

### 左上歌名兩行（D51；T-047）

| 項目 | 設計 |
| --- | --- |
| 策略 | `fitText()`（歌名）由「縮字 → 『…』」改為「縮字（44 → 32）→ ~~`wrapLine()`~~ `breakAt()` 兩行 → 第二行尾『…』」。~~斷行規則用歌書嘅 `wrapLine()`，加「英文字同括號入面唔斷」（設計稿第 18 版）；共用函數改動要連歌書測試一齊跑~~ ⚠️ CR-008 實作對齊（B-070、S-132）：T-047 用嘅係 `utils/breakAt.ts` 嘅 `breakAt()`（照設計稿第 18 版 `breakAt()`）：英文字母、數字、半形括號同標點連住嘅一串唔喺中間斷；中文字之間同空格前後都斷得；唔係「先揀空格」。同歌書嘅 `wrapLine()` 唔共用 |
| 幾何（第 18 版，✅ 已確認；`SONG_FIT`） | 第一行上移 22（`lift`）、行距 38（`pitch`）、「第 nn 首」行唔郁；第二行右邊界 x ≤ 470（`secondRight`，唱臂泊位）。數值入 `layouts/phone.ts`，元件只讀表；`clearance.test.ts` 加兩行時嘅淨空 |
| 元件 | `info-block/SongLines.tsx`：兩行時心形跟最後一行；`key` 唔好再用字級（backlog B-056 ④） |

### 播緊時揀碟（D52；T-036、T-038）

| 項目 | 設計 |
| --- | --- |
| 衍生狀態 | `chromeHidden = scene === 'discChange'`：唱臂同三粒細掣 `opacity` 0、唔接受 pointer、唔入 Tab 次序。碟轉唔轉：`spinning = pose === 'playing' && scene !== 'discChange'`（揀碟期間全部碟停喺原位，`animation-play-state: paused`）。⚠️ 第 18 版確認：`chromeHidden` 加 `|| holding`，而且連左上歌名嗰部分一齊隱藏；`spinning` 加 `&& !holding`（見下面「補充」） |
| 返播緊嗰隻碟鬆手 | `discChange → home` 而且 `viewAlbumId` = 播緊嘅碟：淡入；`pose` 直接係 `playing`／`lifted`，**唔行開場**（「唱針開場」嗰段已有嘅建議） |
| ~~喺另一隻碟鬆手（第 18 版，等確認）~~ | ~~返 `home`：細掣淡入、唱臂 `parked`、左上唔顯示歌名；㩒唱片夾 = 打開歌單~~。⚠️ **第 18 版確認改寫**：喺另一隻碟鬆手 = 繼續 `holding`（細唱片機、歌單欄；冇轉盤、唱臂、細掣），見下面「補充」 |
| 時長 | 新 scene token `chromeFadeMs`（CSS `--motion-scene-chrome-fade`）= 設計稿 `SWAP_FADE_MS`（同字母盤淡出一樣），入 `config/motion.ts` 同 `tokens.css`，連鎖數值嘅測試；減少動態效果 = 0 |
| 聲音 | 播放 store 唔受場景影響（照舊） |

### 字重（D53）

`fonts.css` 唔使改；Functional Spec D45、本文件「字體」嗰行嘅字眼已改。用戶已上載字體檔去媒體 bucket。⚠️ CR-006：檔案係 `_fonts/lubalin-graph-book.otf`，`VITE_FONT_URL` = `<MEDIA_BASE>_fonts/lubalin-graph-book.otf`（U-16 完成；設定位置見「CR-006 對技術設計嘅影響 → 字體檔網址」）。

### 已完成嘅 code 受 CR-005 影響（跟進任務；今次冇改 code）

| 檔案 | 而家 | 要改 | 任務 |
| --- | --- | --- | --- |
| `apps/api/migrations/0001_init.sql`、`test/schema.test.ts` | `albums` 一張封面 | 加 `cover2`、`thumb2`、`cover2_source_etag` 同 CHECK | T-100 |
| `apps/api/src/albums/fieldRules.ts`、`validate.ts`、`rows.ts`、`store.ts`、`overview.ts`；`src/i18n/zh-Hant.ts`；相關測試同 fixtures | 冇第二張封面欄 | 三個新欄嘅驗證同讀寫；成對、要有第一張 | T-100 |
| `packages/catalog/src/schema/types.ts`、`parseCatalogDocument.ts`（連測試） | 冇 `cover2`、`thumb2` | 可選欄；舊 document 照收 | T-100 |
| `apps/api/src/catalog/buildDocument.ts`、`snapshot.ts`、fixtures；`apps/player/src/catalog/testing/catalogFixtures.ts` | 冇新欄 | 跟 schema 加 | T-100 |
| `apps/api/src/assets/*`、`config.ts` | 尺寸規則（1200／320） | 規則不變；PATCH 時驗位同尺寸（B-052 ①） | T-099 |
| `packages/catalog/src/scan/matchMediaFiles.ts` | 未做 CR-004 部分 | 連音檔做錨、`cover2`、`skipped` | T-025 |
| `apps/player/src/app/homeView.ts`（連測試） | `coverUrl` 用 `album.cover` | 用揀中嗰張 | T-046 |
| `apps/player/src/utils/fitText.ts`、`components/info-block/SongLines.tsx`、`stage/layouts/phone.ts`、`clearance.test.ts` | 縮字之後截短 | 兩行 | T-047（第 18 版已確認，可以開工） |
| `apps/player/src/config/motion.ts`、`styles/tokens.css` | 冇淡出 token | 加 `chromeFadeMs` | T-036 |

上面部分檔案屬於已凍結嘅 QA 鏈（`api-albums`、`api-assets`、`api-auth`（schema）、`catalog-core`、`player-catalog`、`player-home`）：改完按 validation gate 重驗有改動嘅部分。

### Functional Spec 對照（CR-005 新增／改動）

| Functional 需求 | 技術落點 |
| --- | --- |
| FR-125 第二張封面 | `albums.cover2`／`thumb2`／`cover2_source_etag`、API-013、內容檔可選欄、掃描 `cover2`、管理端專輯頁 |
| FR-042 隨機封面 | `pickCoverVariants()`、`albumArt()`、Preload、`homeView`、轉盤、Media Session、背景攞另一張入 cache |
| FR-123、FR-105（改） | 音檔做錨、`skipped`（`NO_AUDIO`、`NO_FIRST_COVER`） |
| FR-103、FR-108（改） | 管理端同 seed 放大到 1200；API-050 不變 |
| FR-036（改） | `fitText()` 兩行策略、~~`wrapLine()`~~ `breakAt()`（CR-008 實作對齊）、`layouts/phone.ts` |
| US-003、FR-038（改） | `chromeHidden`、`spinning`、`chromeFadeMs` |
| FR-041（改） | 字眼；code 不變 |

### 補充：播放端設計稿第 18 版確認嘅技術設計（T-036、T-047、T-048、T-049、T-038、T-040）

> ⚠️ **CR-008（第 19 版）**：本節入面嘅歌單欄（幾時出、欄底 `bottomHeld`、行係掣、`aria-disabled`）、`openList` 嘅 `holding` 守衛、`playHeldTrack`、`returnToLoaded` 嘅「淡出期間換碟」、淨空 ② ④ 同 D57 例外、motion「歌單欄內容冇過場」已被取代（原位標 ⚠️），以「CR-008 對技術設計嘅影響」為準。

對應 Functional Spec v1.7 §CR-005「補充：播放端設計稿第 18 版確認」（用戶 2026-11-25 確認；source commit `4e739cd`）。數值以設計稿常數為準：`SCALE`、`DIAL_KEYS`、`SONG_FIT`、`MINI`、`TRACKLIST`、`SWAP_FADE_MS`；下面只寫常數名同做法。**今次冇改 code**；只影響 `apps/player`。標「T-xxx 定案」嘅細節留畀嗰個任務。

**狀態：載入嘅碟同顯示嘅碟**

| 名 | 來源 | 意思 |
| --- | --- | --- |
| 載入嘅碟 | 播放 store 嘅 `albumId`（`app/playbackState.ts` 已有；T-038 嘅真播放 store 保留呢個欄） | 唱片機入面嗰隻碟（播緊或者暫停）；`idle` = `null`。Favourites 碟播緊時係 `favourites`（隊列屬 Favourites 碟） |
| 顯示嘅碟 | `stageReducer` 嘅 `viewAlbumId`（已有） | 旋鈕指住／手上拎住嘅碟；左上碟名同年份跟佢 |
| `holding`（衍生，唔另外存） | `loaded !== null && viewAlbumId !== loaded && (scene === 'home' ｜｜ scene === 'discChange')` | 拎住另一隻碟（旋鈕開住指住，或者已經鬆手）。純函數，連 unit test（建議放 `app/homeView.ts` 或者新 `app/holding.ts`，T-048 定案） |

| 衍生顯示 | 規則 |
| --- | --- |
| 大唱片機嘅轉盤 | `!holding` 先顯示（`opacity` 用 `chromeFadeMs` 過場） |
| `chromeHidden`（唱臂、三粒細掣、左上**歌名嗰部分**：音量條、歌名、心形、「第 nn 首」同時間） | `loaded !== null && (scene === 'discChange' ｜｜ holding)`；冇歌載入時照 CR-002（字母盤開住時淡出唱臂同細掣）。隱藏時 `opacity` 0、`pointer-events: none`、唔入 Tab 次序 |
| 大唱片機嘅碟轉唔轉 | `pose === 'playing' && scene !== 'discChange' && !holding` |
| 細唱片機 | `holding` 先顯示；碟：播放 store `playing` 就轉（用自己嘅 class，唔受上一行影響）；唱臂姿勢用同一張「唱臂姿勢」表，以**載入嘅碟**代替 `viewAlbumId` 計（Functional Spec D58 ①） |
| 歌單欄 | ~~`holding` 先顯示；欄底 = `scene === 'discChange' ? TRACKLIST.bottomOpen : TRACKLIST.bottomHeld`；行只喺 `scene === 'home'` 先㩒得（旋鈕開住時 `aria-disabled`）~~ ⚠️ CR-008：`showsColumn`；欄底 `bottomOpen`／`bottomIdle`；行唔係掣 |
| 碟名闊度上限 | `holding` 時收窄到細唱片機左邊（設計稿 `MINI.x - MINI.r - 20`；入幾何表做有名常數，例如 `albumTitle.rightWhenHeld`）；其餘照 T-035 嘅上限。同一個 fit 函數，只換闊度 |
| 半透明層 | `holding` 先顯示；喺碟上面、字母盤同旋鈕下面 |

**動作**

| 動作 | 做法 |
| --- | --- |
| 擰旋鈕（`openDiscChange`、`selectAlbum`，已有） | 唔使改 reducer：`viewAlbumId` 跟旋鈕，`holding` 自動成立／解除 |
| 鬆手（`closeDiscChange`，已有） | 返 `home`；`viewAlbumId` 唔變。如果 `viewAlbumId` = 載入嘅碟：淡入、唔行開場；否則繼續 `holding` |
| `openList`（㩒碟面／唱片夾） | ~~`holding` 時唔做嘢（冇轉盤、冇唱片夾；歌單已經喺碟名下面）~~。要 reducer 知道載入嘅碟：action 帶 `loadedAlbumId`，或者由 `useHome` 擋（T-048 定案）；連測試。⚠️ CR-008：**反轉**：`holding` 時照開（拎住嘅碟嘅弧線歌單）；`discChange` 唔開；唱片夾唔再開歌單（`playFirst`） |
| 㩒細唱片機（新 action，建議 `returnToLoaded`） | `viewAlbumId = 載入嘅碟`、`scene = home`（字母盤開住都收埋）。顯示層：~~淡出期間換碟~~、唱臂即時到位，之後淡入（設計稿 `swapAlbum`，CSS 用一個「即時」記號關掉唱臂 transition），唔行開場。⚠️ CR-008 實作對齊（S-176）：實作係即刻換碟（`useSwapInstant`），唔係淡出期間換；QA 接受 |
| ~~㩒歌單欄一行（新 action，建議 `playHeldTrack`）~~ ⚠️ CR-008：**拎走**（D82）；由唱片夾 `playFirst` 同弧線歌單取代 | 只喺 `scene === 'home' && holding`：stage `selectedTrackId = trackId`；播放 store `start { albumId: viewAlbumId, trackId }`（已有嘅 action：舊歌停、換隊列）。`albumId` 變咗之後 `holding` 自動解除 → 轉盤淡入、細唱片機淡出 → 唱臂由 `parked` 行完整開場（`tonearmMs` + `needleDropMs`）。未有音檔嘅行唔發 action。真正出聲由 T-038（`audioEngine`）接 |
| ♥（`toggleFavourites`） | `holding` 時等同轉去 ♥ 嗰格（Functional Spec D58 ④）；`previousAlbumId` 嘅處理由 T-048 定案（建議：記低拎住之前嘅顯示嘅碟） |
| 播放 store 變化（自動下一首、播完、載入失敗） | 唔改 stage；細唱片機嘅歌名同唱臂跟住播放 store（D58 ①②） |
| 續播（T-062） | 只記載入嘅碟同歌；`holding` 唔記低，重開 app 返載入嘅碟（D58 ③） |

**版面數字（`stage/layouts/phone.ts`）**：全部由設計稿常數抄入，元件只讀表；`layouts/types.ts` 加對應型別。

| 表 | 來源常數 | 用喺 |
| --- | --- | --- |
| `songFit` | `SONG_FIT` | 左上歌名兩行（T-047） |
| `miniTurntable` | `MINI`（圓心、半徑、字同轉盤之間嘅距離、感應範圍加闊、兩行字級）；縮放 = `MINI.r / PLATTER.r` | 細唱片機（T-048） |
| `albumTitle.rightWhenHeld` | `MINI.x - MINI.r - 20`（20 要變有名常數） | 碟名 fit（T-048） |
| `heldTracks` | `TRACKLIST`（欄位置、`bottomOpen`／`bottomHeld`（⚠️ CR-008：`bottomHeld` → `bottomIdle` 1290）、字級、行距、歌號比例同闊度、淡出高度、位置條闊度同 x、半透明層嘅 `scrimOpacity`／`scrimEnd`）；位置條最短長度（設計稿寫死 60）同拖動門檻（設計稿 6 px）要變有名常數 | 歌單欄（T-049） |
| 22 格 | `SCALE`（`positions` 由專輯數生成，唔寫死 22）、`DIAL_KEYS`（字母嚟自內容檔 `wheelKey`） | 轉盤（T-036；E2E 用 22 格嘅 fixture） |

**淨空規則測試（`clearance.test.ts`）加**：① 歌單欄欄底（`bottomOpen`）唔入字母盤外圈；欄底（`bottomHeld`）唔入刻度弧同旋鈕；② 歌單欄右邊唔入細唱片機嘅感應範圍；③ 細唱片機嘅感應範圍唔同版本號、碟名（收窄之後）、♥ 重疊；④ 感應範圍 ≥ 44pt 嘅檢查加一個**明文例外清單**，只得「歌單欄嘅行」（Functional Spec D57；行高 = `heldTracks.pitch`，約 24pt），其餘控件照守。⚠️ **CR-008**：① 嘅 `bottomHeld` 改為 `bottomIdle`（唔入三粒細掣）；② 唔再適用（行唔係控件；review S-173）；④ 例外清單拎走（D57 作廢）；見「CR-008 對技術設計嘅影響 → 淨空規則」。

**元件**（每個 `.tsx` 檔 ≤ 150 行、函數 ≤ 50 行；拆細）

| 元件／模組 | 內容 |
| --- | --- |
| `components/mini-turntable/MiniTurntable.tsx` | 重用 `Platter`、`Disc`（封面用 T-046 揀中嗰張）、唱片夾、`Tonearm`（姿勢以載入嘅碟計）；兩行字（`t()`：「播放中」／「已暫停」、歌名）；成組 `role="button"`、`aria-label`「返回播放中的唱片」、透明感應範圍 |
| `components/held-tracks/`（`HeldTrackList.tsx`、`HeldTrackRow.tsx`、`HeldScrim.tsx`、`ScrollBar.tsx`） | 一欄行；歌號專輯色、歌名黑字；灰色行 `aria-disabled`（⚠️ 實作對齊 S-174：灰色行係唔 focus 得嘅普通列表項；CR-008 之後全部行都係普通列表項）；長歌名用現有量字函數加「…」（同 T-037 弧線歌單共用一個「一行截短」函數）；頂底淡出用 SVG `mask` + `linearGradient`（id 用 `useId()` 或者 `defIds`）；位置條喺**左邊**；半透明層 = 舞台底色 `linearGradient`（左 `scrimOpacity` → 右 0）做 `mask` |
| `components/held-tracks/columnLayout.ts`（純函數，連 unit test） | 由行數、欄高、行距計：可捲距離、某行嘅 y、頂／底淡出開唔開、位置條長度同位置；捲動值夾喺 0 至可捲距離 |
| 捲動 | pointer 拖動（過咗門檻先當拖，拖過唔當㩒）、滾輪、鍵盤（焦點喺行時上下鍵、Page Up／Down）；欄 `touch-action: none`；換碟時捲動歸零 |
| 圖層次序（`StageSvg`） | 照設計稿 `scene()`：底色 → 螺絲 → 轉盤 → 碟 → 半透明層（連螺絲再畫一次）→ 字母盤 → 旋鈕 → ♥ → 唱臂 → 細唱片機 → 三粒細掣 → 歌單欄 → 左上資訊 |
| i18n（`src/i18n/zh-Hant.ts`） | 加「播放中」「已暫停」「返回播放中的唱片」、行嘅 `aria-label`（例如「播放：{歌名}」；⚠️ CR-008：拎走，加「已播完」）；空欄重用「尚未有歌曲」「尚未收藏歌曲」。鍵名由 T-048／T-049 定；書面語測試照跑 |

**Motion token**

| Token | 數值來源 | 用喺 |
| --- | --- | --- |
| `MOTION.scene.chromeFadeMs`（CSS `--motion-scene-chrome-fade`；新） | 設計稿 `SWAP_FADE_MS`（同 CSS 嘅 `opacity` 過場一樣） | 唱臂、三粒細掣、左上歌名嗰部分淡出淡入；大轉盤、細唱片機、半透明層出現／消失。屬 scene token（Functional Spec D1 豁免 300ms） |
| 現有 `tonearmMs`、`needleDropMs` | 不變 | 拎住嘅碟㩒一行之後嘅完整開場 |
| 歌單欄內容 | 冇過場（設計稿即時換）。⚠️ CR-008：逐行飄落（`PANEL_FLOAT`）、停定先出、鬆手縮短；見「CR-008 對技術設計嘅影響 → Motion token」 | 換碟時欄內容即時換 |
| 減少動態效果 | 全部 0；唱臂即時到位 | `utils/motion.ts`（`prefersReducedMotion`） |

`motion.test.ts`、`tokens.node.test.ts` 鎖住新 token 嘅數值。元件唔寫死毫秒。

**測試同 E2E**

| 層 | 內容 |
| --- | --- |
| Unit | `holding` 同各衍生顯示（冇歌載入、播緊、暫停、旋鈕開住／鬆手、指返載入嘅碟）；`returnToLoaded`、`playHeldTrack`、`openList` 嘅守衛；`columnLayout`；細唱片機嘅唱臂姿勢以載入嘅碟計 |
| 元件 | 細唱片機（兩個字、`aria-label`、㩒）；歌單欄（灰色行唔㩒得、旋鈕開住唔㩒得、拖動唔當㩒、長歌名「…」、空碟） |
| 淨空 | 上面四條 |
| E2E 截圖（T-040） | 對 `VIEWS` 入面標「第 18 版」嘅格：「歌名較長（縮字）」「歌名好長（斷兩行）」「歌名好長 + 唱臂喺泊位」「播緊時揀碟」「播緊時揀碟：轉到另一隻碟」「播緊時，手上拎住另一隻碟」「長歌單（30 首）」，連 22 格嘅轉盤；流程：播緊 → 擰去另一隻碟 → 鬆手 → 㩒一行（新歌開場）／㩒細唱片機（返去，聲冇停）；減少動態效果再行一次 |

**已完成嘅 code 受影響（今次冇改 code）**

| 檔案 | 要改 | 任務 |
| --- | --- | --- |
| `app/stageReducer.ts`（連測試） | 加 `returnToLoaded`、`playHeldTrack`；`openList` 嘅 `holding` 守衛 | T-048、T-049 |
| `app/homeView.ts`、`app/HomeScene.tsx`、`app/useHome.ts`（連測試） | `holding`、`chromeHidden` 連歌名嗰部分、碟名闊度、細唱片機同歌單欄嘅接入 | T-036、T-048、T-049 |
| `components/info-block/*` | 歌名嗰部分可以獨立淡出（碟名同年份留低） | T-036 |
| `stage/layouts/phone.ts`、`types.ts`、`clearance.test.ts` | `songFit`、`miniTurntable`、`albumTitle.rightWhenHeld`、`heldTracks`；例外清單 | T-047、T-048、T-049 |
| `config/motion.ts`、`styles/tokens.css`（連測試） | `chromeFadeMs` | T-036 |
| `i18n/zh-Hant.ts` | 新字串 | T-048、T-049 |

上面部分檔案屬已凍結嘅 QA 鏈 `player-home`、`player-core`、`player-foundation`：改完按 validation gate 重驗有改動嘅部分；新元件（`mini-turntable/`、`held-tracks/`）建議入 `player-home` 鏈（主 session 定）。

| Functional 需求 | 技術落點 |
| --- | --- |
| FR-043 拎住另一隻碟、細唱片機 | `holding`、`chromeHidden`、`MiniTurntable`、`returnToLoaded`、`miniTurntable` 幾何、`albumTitle.rightWhenHeld`、`chromeFadeMs` |
| FR-044 歌單欄 | `HeldTrackList`、`columnLayout`、`heldTracks` 幾何、`playHeldTrack`、淨空例外 |
| D52（改寫）、D13、D36 ④ | 上面兩行；唱臂姿勢表以載入嘅碟計細唱片機 |
| D51（定案） | `songFit`（T-047） |
| D57 | `clearance.test.ts` 例外清單 |
| D58（🅰️） | 細唱片機唱臂同歌名跟播放 store；`holding` 唔入續播 |

## CR-006 對技術設計嘅影響

對應 Functional Spec v1.8 §CR-006（用戶 2026-11-25 對 U-16、U-17 嘅答案，已確認）。本節取代上文同佢有出入嘅地方；受影響嘅表已喺原位改（標 ⚠️ CR-006）。「狀態」欄標 🅰️ 嘅對應 Functional Spec D60–D62、D64、D65 同 D63 細項：PM 建議，照建議做（全部未部署過，之後要改只係改 code，冇資料要搬）。**今次冇改 code**：跟進任務見「已完成嘅 code 要改嘅地方」。

| 範疇 | v1.5 | v1.6 | 狀態 |
| --- | --- | --- | --- |
| 內容來源 | seed 入齊專輯、歌、credit、封面；掃描補檔案同文字 | 掃描係主要來源：seed 只入專輯；歌由掃描建立（API-030 `newTracks`、API-031 `create`）；管理端修改。D41（ETag）不變 | 已確認（D59） |
| 歌號 | 跟次序由 1 連續；刪歌、排序都重編（`COMPACT_SQL`） | 歌號 = 檔名歌號，1 至 999，可以跳號；刪歌唔重編；API-023 取消；API-020 收 `no`；API-021 改 `no` | 🅰️ D60 |
| 歌 id | seed `<albumId>-<NN>`；管理端 `<albumId>-<6 位隨機>` | 建立時一律 `trackIdFor(albumId, no)` = `<albumId>-<NN>`，撞咗先用隨機；之後不變；掃描按 `no` 配對 | 🅰️ D61 |
| 音檔消失 | 冇處理 | API-030 `audioMissing`；API-031 `clearAudio` 只清 `audio_key`（同 `mv_key`），唔刪歌 | 🅰️ D62 |
| 專輯日期 | `release_date` + `year`（跟日期計） | 只有 `year`（可選，直接輸入）；`release_date` 刪走（D1、API、內容檔、seed 型別） | 已確認（D63）；刪欄係 🅰️ |
| 專輯類型 | `type` 自由文字 | `type` 刪走（D1、API、內容檔）；中文名喺管理端語言檔 | 已確認（D44） |
| Seed（T-027） | 專輯 + 歌 + credit + 下載封面（Node 圖片處理） | 只入專輯；唔使圖片處理依賴 | 已確認（D59） |
| 參考資料 | — | `discography.json` 歌單、`credits.json`：測試同之後可能嘅預填 | 🅰️ D64 |
| 掃描例外 | `.mp3`、手動指定音檔、`cover2.png` 照建議先做 | 定案（同建議一樣，code 唔使因為確認而改） | 已確認 |
| 字體檔 | 檔名未知 | `_fonts/lubalin-graph-book.otf` | 已確認（U-16） |

### 掃描建立歌曲（T-025；API-030、API-031；Functional Spec D59–D62、D65、FR-126）

**分類次序**（喺「掃描以音檔做錨」嘅次序上加）：

| 步驟 | 做法 |
| --- | --- |
| 1 | 分類（「掃描嘅設計」表）；音檔歌號集合 = 資料夾入面 `.m4a`／`.mp3` 嘅歌號 ∪ 資料庫入面 `audio_manual = 1` 嘅歌嘅歌號 |
| 2 | 音檔歌號入面，資料庫**未有**嗰個 `no` 嘅 → `newTracks` |
| 3 | 資料庫有嘅歌：照舊做媒體配對（`matched`，`change`：`new`／`replace`／`same`）同歌曲文字（`songTexts`） |
| 4 | 資料庫有嘅歌，`audio_manual = 0`、`audio_key` 唔係 NULL，而嗰個 key 唔喺今次列到嘅檔入面：同歌號有另一個音檔 → `matched`（`replace`，即係改咗名）；冇 → `audioMissing` |
| 5 | 冇音檔嘅歌號嘅 `.txt`、MV → `skipped`（`NO_AUDIO`，不變） |

**預覽回應（API-030）加兩個欄**（形狀係建議，T-025 定案）：

```json
{
    "newTracks": [
        {
            "no": 5, "trackId": "komorebi-05",
            "audio": { "key": "album-11-komorebi/05 太平門.m4a", "bytes": 7340032 },
            "mv": null,
            "title": "太平門", "titleSource": "text",
            "text": { "key": "album-11-komorebi/05 太平門.txt", "etag": "\"77aa…\"", "lineCount": 38, "synced": false, "errors": [] }
        },
        {
            "no": 7, "trackId": "komorebi-07",
            "audio": { "key": "album-11-komorebi/07 我永遠記得.m4a", "bytes": 6815744 },
            "mv": null, "title": "我永遠記得", "titleSource": "fileName", "text": null
        }
    ],
    "audioMissing": [{ "trackId": "komorebi-09", "no": 9, "title": "一杯", "key": "album-11-komorebi/09 一杯.m4a", "mvKey": null }],
    "manualMissing": [{ "trackId": "zoeng-ngaa-03", "kind": "audio", "key": "album-02-beaming/05 Hero.m4a" }]
}
```

- `trackId`：預覽時用 `trackIdFor(albumId, no)` 計出嚟顯示；已經有人用就係 `null`（套用時先生成隨機 id）
- `titleSource`：`text`（同歌號 `.txt` 有效）｜`fileName`（冇 `.txt`，或者 `.txt` 有錯）。由檔名攞歌名：去咗資料夾、副檔名、開頭歌號同跟住嘅空格／`.`／`-`／`_`；剩低係空就用去咗副檔名嘅成個檔名。歌名過唔到歌曲文字嘅歌名規則（例如超長）就截到 `TITLE_MAX_CHARS`
- `text.errors` 唔係空 = 歌照建立，文字唔套用
- `manualMissing`：手動指定嘅 key `MEDIA.head()` 唔到（只係提示，唔可以喺掃描清走）。數量少（只限呢張碟手動指定嘅歌），唔會撞操作上限
- `tracksWithoutAudio`（舊欄）：而家只會係人手新增而未指定音檔嘅歌，或者 `audioMissing` 套用咗之後嘅灰色行

**套用（API-031）body 加兩個欄**：

```json
{
    "create": [{ "no": 5, "audioKey": "album-11-komorebi/05 太平門.m4a", "mvKey": null, "text": { "key": "album-11-komorebi/05 太平門.txt", "etag": "\"77aa…\"" } }],
    "clearAudio": [{ "trackId": "komorebi-09", "audioKey": "album-11-komorebi/09 一杯.m4a" }]
}
```

| 項目 | Worker 做法 |
| --- | --- |
| `create` | 逐項：再 list／head 確認音檔仲喺度、`no` 仲未有歌（有 → `NUMBER_TAKEN`，唔建立）；有 `text` 就重新讀檔、比 ETag（唔同 → `STALE`）、`parseSongText()`（有錯 → 歌照建立，文字唔套用，回 `details`）；id = `trackIdFor(albumId, no)`，`INSERT` 撞 PK 就用 `newTrackId()`（最多 3 次，同 API-020）；一個 batch 寫 `tracks`（`no`、`title`、`subtitle`、credit、`audio_key`、`mv_key`、`text_source_etag`）同（有歌詞就）`lyrics` + R2 歌詞檔（同 API-041 同一個 store 函數）。冇 `.txt` 嘅歌名用檔名（同預覽一樣嘅函數） |
| `clearAudio` | 只喺 `audio_key` 仲係 body 嗰個值、而且 `audio_manual = 0` 時清 `audio_key`（同 `mv_key` 如果 MV 都唔喺度）；唔郁其他欄、唔刪歌；值唔同 → `STALE` |
| 回應 | 照舊逐項回結果：`create: [{ no, ok, trackId?, code?, details? }]`、`clearAudio: [{ trackId, ok, code? }]`；最後生成一次 catalog |
| 操作上限 | 第一次掃描一張碟差唔多每首都要讀 `.txt`（原聲大碟 41 首）：照「掃描嘅設計 → 限制同風險」分批；`create` 一次最多 `SCAN_APPLY_MAX_ITEMS` 項（常數，T-025 照 Cloudflare 上限定），管理端分批送 |

**`packages/catalog/scan`**：`matchMediaFiles()`（或者新函數 `planScan()`）回埋 `newTracks`、`audioMissing` 嘅分類結果（純函數，輸入 = 檔案清單 + 現有歌 `{ id, no, audioKey, audioManual, mvKey }`）；`titleFromFileName()` 純函數連測試；`trackIdFor()` 由 `seed/` 搬去共用位（例如 `schema/ids.ts`），`seed` 照用。

### 歌號同歌 id（T-102；Functional Spec D60、D61）

| 項目 | 設計 |
| --- | --- |
| 範圍 | `no` 1 至 999（`TRACK_NO_MAX`），同一張碟唔重覆（UNIQUE index 已有）；可以跳號 |
| 刪歌（API-022） | 只 `DELETE`；刪走 `COMPACT_SQL` 同「轉負數再重編」嘅兩句 |
| 排序（API-023） | 取消：route、`writeTrackOrder()`、`order` 驗證同測試刪走；管理端歌曲表按 `no` 排 |
| 新增（API-020） | body `{ no?, text }`：`no` 冇畀 = `MAX(no) + 1`（冇歌 = 1）；有畀就驗範圍同唔重覆（撞咗 409 `CONFLICT`，`details` `[{ path: 'no', reason: 'NUMBER_TAKEN' }]`）。id = `trackIdFor(albumId, no)`，撞 PK 先用 `newTrackId()` |
| 改歌號（API-021） | 加 `no`；同一句 `UPDATE … WHERE updated_at = ?`；撞 UNIQUE → 409 `CONFLICT`（`NUMBER_TAKEN`）；唔改 id |
| 次序 | API-012、catalog、播放端都按 `no`（`ORDER BY t."no", t.id` 已經係咁）；播放端顯示 `track.no`（已經係咁）。T-037、T-049 嘅歌單顯示 `track.no`，唔好用位置（Favourites 碟例外：收藏次序） |
| D1 | 可以加 `CHECK ("no" BETWEEN 1 AND 999)`（之前因為重編要用負數，加唔到）；直接改 `0001_init.sql`（未部署） |

### 只有年份、冇「類型」（T-101；Functional Spec D63、D44）

| 層 | 改動 |
| --- | --- |
| D1 | `albums` 刪 `release_date`、`type`；`year` 留（NULL = 冇年份）。直接改 `0001_init.sql` |
| `packages/catalog` | `CatalogAlbum` 刪 `releaseDate`、`type`；validator 刪日期檢查，`year` = `null` 或者正整數（已有）；`SeedAlbum` 刪 `releaseDate`、`type`；`seedToCatalog()` 跟住改；新增 `YEAR_MIN`／`YEAR_MAX` 常數（API 同 validator 共用） |
| 專輯 API | `FIELD_RULES`：刪 `releaseDate`、`type`，加 `year: nullable(yearRule)`（`INVALID_YEAR`）；`COLUMN_OF`、`ALBUM_COLUMNS`、`toAlbum()` 跟住改；`yearOf()` 同「有 `releaseDate` 就連 `year` 一齊改」嘅 SET 邏輯刪走；API-011 `INSERT` 改欄；語言檔加 `INVALID_YEAR`、刪 `INVALID_DATE`（專輯部分） |
| Catalog 生成 | `buildDocument()`：`year: album.year`（唔再睇 `release_date`）；刪 `releaseDate`、`type`；`snapshot.ts` 嘅 SELECT 跟住改 |
| Seed 生成（`_design_/tools/parse_discography.py`） | `year` = 日期頭四位（`YYYY`、`YYYY-MM`、`YYYY-MM-DD` 都得；開頭唔係四位數字 = `null`）：「終於好天氣」= 2016（review S-119）。輸出刪 `releaseDate`、`type`（原文仍然喺 `sourceMeta`）；`test_seed_tools.py` 跟住改；重新生成 `discography.json`（歌單部分唔變） |
| 播放端 | `InfoBlock` 本身已經係「冇年份唔出字、橫線照畫」，唔使改；只改 fixtures（`catalog/testing/catalogFixtures.ts`）同 `seedCatalog` 測試 |
| 管理端（T-052） | 「年份」數字欄；「類型」欄冇咗，顯示類別中文名（管理端語言檔） |

### 初始資料只入專輯（T-027；Functional Spec D59、D64）

| 項目 | 設計 |
| --- | --- |
| 輸入 | `apps/api/seed/discography.json` 嘅 `albums[]`（唔讀 `tracks`、唔讀 `credits.json`、唔用 `coverUrl`） |
| 寫入 | `INSERT … ON CONFLICT (id) DO NOTHING`：`id`、`title`、`wheel_key`、`category`、`category_no`、`year`、`label`（🅰️ D59 細項）、`accent` = 中性灰（同 API-011 嘅預設）、`sort_order` = `order`、`folder` NULL、封面欄 NULL；已經有嘅 id 唔郁（唔蓋走管理端改過嘅）。同類別序號撞咗（管理端改過）就跳過嗰張，報告出嚟 |
| 之後 | 生成一次 catalog（`updated_by = 'seed'`）；報告：新增幾多張、跳過幾多張 |
| 唔做 | 歌、credit、封面下載同放大（D50 嘅 seed 部分作廢）：唔使 Node 圖片處理依賴 |
| 寫法 | `apps/api/scripts/seed.mjs`（或者 Worker 測試用得到嘅函數 + 薄 CLI），本機 `wrangler d1 execute` 同 production 一樣；砌 SQL 嘅純函數有 unit test |

**參考資料**（D64）：`discography.json` 嘅歌單同 `credits.json` 照舊由 script 生成、照舊入 repo；用喺 `packages/catalog` 嘅 seed 測試（`matchCredits()`、`seedToCatalog()`）、播放端嘅假 catalog（開發、E2E）。之後點預填（例如由參考資料生成 `.txt`），用戶話「做法有機會唔同」，今次唔設計。

### 字體檔網址（U-16）

| 項目 | 值／位置 |
| --- | --- |
| 檔案 | `rb-discography` 嘅 `_fonts/lubalin-graph-book.otf` |
| `VITE_FONT_URL` | `<MEDIA_BASE>_fonts/lubalin-graph-book.otf`；`MEDIA_BASE` 喺 `apps/api/wrangler.toml`（`[vars]`，而家係 bucket 嘅 `r2.dev` 公開網址） |
| 喺邊度設 | 本機：`apps/player/.env.local`（抄 `.env.example`，已 gitignore）；正式版：Vercel project 嘅 Environment Variables（T-041，U-7 開咗 project 之後）。改完要重新 build |
| CORS | bucket 要對播放端 origin 回 `Access-Control-Allow-Origin`（U-1），否則跌返 Rokkitt |
| 檔案格式 | `.otf` 得（T-044 收 https 網址，唔睇副檔名）；之後轉 `.woff2` 會細啲，唔係必要 |

### 已完成嘅 code 要改嘅地方（跟進任務；今次冇改 code）

| 任務（已完成） | 檔案 | 而家 | 要改 | 跟進任務 |
| --- | --- | --- | --- | --- |
| T-020、T-096、T-098、T-100（schema） | `apps/api/migrations/0001_init.sql`、`test/schema.test.ts`、`test/applyMigrations.ts` | `albums.release_date`、`albums.type`；`tracks.no` 冇範圍 CHECK | 刪兩個欄；（可選）`no` 1 至 999 CHECK | T-101（專輯欄）、T-102（`no`） |
| T-022、T-098、T-100（專輯 API） | `apps/api/src/albums/fieldRules.ts`、`rows.ts`、`store.ts`、`validate.ts`、`overview.ts`、`errors.ts`；`src/i18n/zh-Hant.ts`；`test/albumFieldRules.test.ts`、`albumsCreate.test.ts`、`albumsUpdate.test.ts`、`albumsList.test.ts`、`albumsEdges.test.ts`、`albumFixtures.ts` | `releaseDate`、`type` 可改；`year` 跟日期 | 刪兩個欄；`year` 直接改（`INVALID_YEAR`） | T-101 |
| T-023（歌曲 API） | `apps/api/src/tracks/store.ts`（`COMPACT_SQL`、`deleteTrack`、`writeTrackOrder`、`INSERT … MAX("no") + 1`）、`albumTrackRoutes.ts`（API-020、API-023 route）、`routes.ts`、`ids.ts`、`fieldRules.ts`、`validate.ts`、`errors.ts`；`src/i18n/zh-Hant.ts`；`test/tracksCreate.test.ts`、`tracksDeleteOrder.test.ts`、`tracksPatch.test.ts`、`sessionGuard.test.ts`（API-023 嗰行）、`trackFixtures.ts` | 歌號連續、刪歌重編、拖動排序；新歌 id 隨機 | 照「歌號同歌 id」 | T-102 |
| T-026、T-098、T-100（catalog 生成） | `apps/api/src/catalog/buildDocument.ts`、`snapshot.ts`；`test/catalogRebuild.test.ts`、`catalogFixtures.ts` | 出 `releaseDate`、`type`；`year` 跟日期 | 照「只有年份」 | T-101 |
| T-002、T-098、T-100（`packages/catalog`） | `src/schema/types.ts`、`parseCatalogDocument.ts`（連測試）、`src/seed/types.ts`、`seedToCatalog.ts`、`matchCredits.test.ts`、`seed/trackId.ts`、`src/index.ts` | 有 `releaseDate`、`type`；`trackIdFor` 喺 `seed/` | 刪兩個欄；`YEAR_MIN`／`YEAR_MAX`；`trackIdFor` 搬共用（T-102） | T-101、T-102 |
| T-097（seed 生成） | `_design_/tools/parse_discography.py`、`test_seed_tools.py`、`apps/api/seed/discography.json` | `YYYY-MM` → `year` null；輸出 `releaseDate`、`type` | 年份由頭四位；刪兩個輸出欄；重新生成 | T-101 |
| T-031、T-035（播放端 fixtures） | `apps/player/src/catalog/testing/catalogFixtures.ts`（連用佢嘅測試） | 有 `releaseDate`、`type` | 刪兩個欄（`InfoBlock` 唔使改） | T-101 |
| T-024（封面） | — | — | 唔受影響（`cover2.png` 只係掃描分類，屬 T-025） | — |
| T-021（認證） | — | — | 唔受影響 | — |
| T-044（字體） | `apps/player/.env.example` | `VITE_FONT_URL=` 空 | code 唔使改；值喺本機 `.env.local` 同 Vercel 設（唔入 repo，因為 `MEDIA_BASE` 係部署設定） | 用戶／T-041 |
| 未開始 | `packages/catalog/src/scan/*`、（新）`apps/api/src/media/*` | — | 照「掃描建立歌曲」 | T-025 |
| 未開始 | （新）`apps/api/scripts/seed.mjs` | — | 照「初始資料只入專輯」 | T-027 |

上面部分檔案屬已凍結嘅 QA 鏈（`api-albums`、`api-tracks`、`api-catalog`、`api-auth`（schema）、`catalog-core`、`seed-tools`、`player-catalog`）：改完按 validation gate 只重驗有改動嘅部分。

### Functional Spec 對照（CR-006 新增／改動）

| Functional 需求 | 技術落點 |
| --- | --- |
| FR-126 掃描建立歌曲 | API-030 `newTracks`、API-031 `create`、`titleFromFileName()`、`trackIdFor()`、API-041 嘅 store 函數 |
| FR-123、FR-105（改） | `audioMissing`、`manualMissing`、API-031 `clearAudio`；`.mp3`、`audio_manual`、`cover2.png` 定案 |
| FR-104、D60、D61 | `tracks.no` 跳號、API-020 `no`、API-021 `no`、API-023 取消、`COMPACT_SQL` 刪走、`trackIdFor()` |
| FR-108、US-109、D59 | `apps/api/scripts/seed.mjs`：只入專輯 |
| FR-124、D44、D63 | `albums.year` 直接輸入；刪 `release_date`、`type`；內容檔、validator、`parse_discography.py` |
| FR-041（字體檔） | `VITE_FONT_URL` 嘅值同設定位置 |

## CR-007 對技術設計嘅影響

對應 Functional Spec v1.9 §CR-007（用戶 2026-11-26 嘅指示，已確認）。本節取代上文同佢有出入嘅地方；受影響嘅表已喺原位加 ⚠️ CR-007。「狀態」欄標 🅰️ 嘅對應 Functional Spec D66–D81 嘅 PM 建議，照建議做（全部未部署過，冇資料要搬）。管理端畫面以管理端設計稿第 4 版（commit `8fb28a7`，等用戶確認）為準。**今次冇改 code**：跟進任務見「已完成嘅 code：保留、改寫、拎走」同 Implementation Plan v1.6（T-103–T-106、T-055）。介面叫「掃描」；本文件叫呢個過程做**同步**（sync）。

| 範疇 | v1.6 | v1.7 | 狀態 |
| --- | --- | --- | --- |
| 內容來源 | D1 係唯一來源；bucket 嘅 `cover.jpg`、`.txt` 係匯入來源（D41，ETag 保護管理端改過嘅內容） | **媒體 bucket 係唯一來源**；D1 係索引（由 bucket 砌，加封面處理結果、歌詞 JSON 名、檢查結果）；ETag 只用嚟跳過冇改過嘅檔 | 已確認（D66） |
| 專輯 | API 新增、改、刪、排序；初始資料 `seed/albums.sql` | 由資料夾名同 `info.txt` 建立同更新；冇寫入 API（除咗封面結果）；冇 seed | 已確認（D67、D69）；🅰️ 細節 |
| 曲目 | 有音檔嘅歌號由掃描建立；API 新增、改歌號、刪 | `info.txt` 嘅曲目；冇音檔 = `audio_key` NULL（灰色）；冇寫入 API | 已確認（D70）；🅰️ 細節 |
| 歌曲文字 | API-041 寫 D1；掃描逐項套用 | 寫返 bucket 嘅 `.txt`，再同步嗰張碟 | 已確認（D72、D75） |
| 掃描 | 一張碟：預覽（API-030）→ 逐項揀 → 套用（API-031） | 全 bucket 同步：新增、更新自動（API-033、API-034）；移除列出、剔選、確認（API-035） | 已確認（D73）；🅰️ 細節 |
| 封面 | 人手上載或者掃描套用（API-050 + API-013） | 同步時由管理端頁面處理，經 API-050 + 新 API-017；冇人手上載 | 🅰️（D74） |
| 內容檔 | 專輯有 `label`；歌有 `subtitle` | 兩個欄刪走；`wheelKey` 生成時由碟名計；次序固定 | 已確認（D69、D71、D78） |
| Worker 對媒體 bucket | 只 list / head / get | 加 put：只寫 `info.txt` 同 `NN ….txt`；永遠唔 delete | 已確認（D75） |

### 資料模型（直接改 `0001_init.sql`，未部署過）

**albums**

| 欄位 | 變化 | 描述 |
| --- | --- | --- |
| id | 不變 | 由資料夾名讀（`parseAlbumFolder()`）；建立後不變 |
| folder | **改**：`TEXT NOT NULL UNIQUE` | 實際嘅資料夾名（之前 NULL = 預期名 + 手動改綁） |
| category、category_no | 不變（來源改） | 由資料夾名讀；同類別同序號唔再要唔重覆（只出檢查結果） |
| title | 不變（來源改） | `info.txt` 嘅 `唱片名稱`；冇就 = id |
| year | 不變（來源改） | `info.txt` 嘅年份；冇 = NULL |
| accent | 不變（來源改） | 第一張封面抽出嘅色；冇封面 = 中性灰（`DEFAULT_ACCENT`，同 API-011 之前嘅預設） |
| cover、thumb、cover2、thumb2、cover_source_etag、cover2_source_etag | 不變 | 只由 API-017 寫（同步嘅封面結果）；`*_source_etag` = 處理過嘅來源檔版本 |
| `info_etag` | **新** `TEXT` | 上次讀到嘅 `info.txt` 嘅 R2 `httpEtag`；NULL = 資料夾冇 `info.txt` |
| `checks` | **新** `TEXT NOT NULL DEFAULT '[]'` | 最近一次同步呢個資料夾嘅檢查結果（JSON array：`{ level, code, key?, line?, no?, params }`；最多 `CHECKS_MAX` 條，100） |
| label、wheel_key、sort_order | **刪** | 唱片公司刪走；字母盤標記同次序由計（`wheelKeyFor()`、`albumOrder()`）；`albums_sort_order` index 刪 |

**tracks**

| 欄位 | 變化 | 描述 |
| --- | --- | --- |
| id、album_id、no、title | 不變 | id 建立時 `trackIdFor(albumId, no)`，撞咗用隨機（D61）；`no` 由 `info.txt`；`title` 由 `info.txt`（冇 `info.txt` 先用 `.txt` 第一行或者檔名） |
| audio_key、mv_key | 不變 | NULL = 冇（灰色／冇 MV） |
| composer、lyricist、arranger、producer | 不變 | 由 `.txt` |
| text_source_etag | 不變（意思改） | 上次匯入嘅 `.txt` 版本 |
| `text_key` | **新** `TEXT` | 嗰首歌嘅 `.txt` key（文字框讀寫用）；NULL = 冇 |
| subtitle、audio_manual、mv_manual、lyrics_source_url、note、youtube_id、video_kind | **刪** | D71 |

`lyrics`、`assets`、`catalog_state`、`sessions` 不變。**冇「待確認移除」嘅表**：每次同步重新計，確認時 Worker 再對一次（見 API-035）。`tracks_title` index 刪（API-024 取消）。

**內容檔（API-070，`version` 仍然係 1，未部署過）**：專輯刪 `label`；歌刪 `subtitle`；`wheelKey` = `wheelKeyFor(title)`（生成時計）；`albums[]` 次序 = `albumOrder()`：`RELEASE_CATEGORIES` 次序 → `categoryNo` → `id`；`tracks[]` 按 `no`。冇音檔嘅歌照列（`audio: null`），佢嘅 `mv`、`lyrics`、`credits` 一定係 `null`（D54）。

### `packages/catalog`：新增同改

| 模組 | 內容 |
| --- | --- |
| `album-info/`（新） | `parseAlbumInfo(text) → { title, year, tracks: [{ no, title, line }], checks }`（格式：Functional Spec D68；寬鬆：只出檢查結果，唔 throw、唔擋）；`formatAlbumInfo({ title, year, tracks })`（冇 `info.txt` 時文字框嘅範本；`parseAlbumInfo(formatAlbumInfo(x))` round-trip）；常數 `INFO_TEXT_MAX_BYTES`（16 KiB）、`INFO_TEXT_MAX_LINES`（1000）、標籤同別名表 |
| `schema/releaseCategory.ts` | 加 `parseAlbumFolder(name) → { category, categoryNo, id } ｜ undefined`（`expectedFolder()` 嘅反方向：`^(album｜ep｜best｜live｜ost｜single)-(\d{2,3})-([a-z0-9]+(?:-[a-z0-9]+)*)$`，`categoryNo` ≥ 1，id 過 `isAlbumId()`）；`albumOrder(a, b)` |
| `sync/`（新；由 `scan/` 改） | 純函數 `planFolderSync(input) → { album, upserts, pendingRemovals, coverJobs, textReads, checks }`：輸入 = 資料夾嘅檔案清單、已解析嘅 `info.txt`（或者冇）、D1 而家嘅狀態；`titleKey()`（比較歌名：NFKC → 細楷 → 去空格 → 彎引號變直）；重用 `classifyFile()`、`groupFiles()`、`titleFromFileName()`、`trackIdFor()`。`classifyFile()` 加 `info.txt`（唔分大細楷）一類 |
| `song-text/` | `parseSongText()` 保留；`副題` 標籤照認，但結果唔再用，出 hint `SUBTITLE_IGNORED`（同 `LABEL_AFTER_BLANK_LINE` 一樣唔擋）；`formatSongText()` 唔再出 `副題：` 行；`SongText` 型別刪 `subtitle` |
| `schema/` | `CatalogAlbum` 刪 `label`；`CatalogTrack` 刪 `subtitle`；validator 跟住改 |
| `seed/` | `seedToCatalog()`、`matchCredits()` 保留（測試同播放端假 catalog）；`planAlbumSeed()` 刪 |
| `wheel/` | `wheelKeyFor()` 不變：第一個 Unicode 字母或者數字（`\p{L}\p{N}`），之前嘅空格同符號跳過；英文轉大楷；冇 = `?`。21 張碟算出嚟同 seed 嘅標記一樣 |

### 同步嘅設計（T-105；API-033、API-034、API-035）

**一個資料夾嘅計劃**（`planFolderSync()`，次序）：

| 步驟 | 做法 |
| --- | --- |
| 1 | 分類資料夾第一層嘅檔（`classifyFile()`，加 `info.txt`） |
| 2 | 曲目表：有 `info.txt`（而且讀得到）= 佢嘅曲目；冇 = 音檔歌號（後備，檢查結果 `NO_INFO`） |
| 3 | 每首曲目：音檔 = 同歌號啱啱好一個 `.m4a｜.mp3`（多過一個 = `AUDIO_CONFLICT`，用返而家連住而仲喺度嗰個，否則冇）；冇音檔 = 灰色，同歌號嘅 `.txt`、MV 唔用（提示 `NO_AUDIO`）；有音檔 = 同歌號嘅 MV、`.txt` |
| 4 | 對 D1：新歌號 → `upserts`（新歌）；有嘅歌號 → 只更新有變嘅欄（歌名、音檔、MV、`.txt`）；`.txt` 嘅 ETag 同 `text_source_etag` 唔同先放入 `textReads` |
| 5 | 移除：D1 有而曲目表冇嘅歌、音檔／MV／`.txt` 冇咗嘅連結、封面來源冇咗 → `pendingRemovals`（**唔改 D1**） |
| 6 | 封面：`cover`／`cover2` 來源嘅 ETag 同 `*_source_etag` 唔同 → `coverJobs`（`cover2` 冇第一張 = `NO_FIRST_COVER`） |
| 7 | 檢查結果（Functional Spec D77）：歌號唔喺 `info.txt` 嘅音檔、冇曲目嘅 `.txt`／MV、歌名唔吻合（`titleKey()` 唔同）、衝突、`info.txt` 嘅檢查 |

**API**

| 編號 | Method + Path | 做乜 |
| --- | --- | --- |
| API-033 | `GET /api/sync` | bucket 第一層（`listLevel('')`，最多 `SCAN_LIST_PAGES_MAX` 頁）+ D1 專輯：回 `folders`（每個：名、id、類別、序號、`status`：`new`｜`known`）、`invalid`（名唔啱格式；`_` 開頭唔列）、`duplicateIds`、`missingAlbums`（D1 有、資料夾冇：專輯移除候選）、`truncated`。唔寫嘢 |
| API-034 | `POST /api/sync/folders/:folder?from=<no>` | 同步一個資料夾：list → 讀 `info.txt`（ETag 同 `info_etag` 唔同先讀）→ `planFolderSync()` → 讀 `textReads`（`from` 起，最多 `SCAN_TEXT_READS_MAX` 個；超過回 `more: true`、`nextFrom`）→ 一個 D1 batch 寫專輯同新增／更新嘅歌（歌曲文字用 `saveSongText()` 同一套欄位、歌詞 JSON 用 `putLyrics()`）→ 寫 `albums.checks` → 回 `{ album, added, updated, unchanged, checks, pendingRemovals, coverJobs, more, nextFrom }`。冇呢個專輯就建立；名唔啱格式或者 id 重複 → 400／409，唔寫。寫咗 D1 就經現有 `afterWrite` 生成 catalog（hash 冇變唔寫 R2）；冇改就唔生成 |
| API-035 | `POST /api/sync/removals` | body `{ items: [{ kind, albumId, trackId?, key?, slot? }] }`（`kind`：`album`｜`track`｜`audio`｜`mv`｜`text`｜`cover`），最多 `SYNC_REMOVALS_MAX`（50）項。逐項再對一次（list／head：檔仲喺度 = `STILL_PRESENT`，唔刪）→ 刪專輯（連歌、歌詞，清冇人用嘅歌詞檔，backlog B-048）／刪歌／清連結（清音檔 = 連 MV、文字、歌詞一齊清，D54）／清封面（第一張冇咗連第二張都清；專輯色返中性灰）→ 逐項回結果 → 生成 catalog。**永遠唔刪 bucket 嘅檔** |
| API-017 | `PUT /api/albums/:id/cover` | 同步嘅封面結果：body `{ slot: 'cover'｜'cover2', cover, thumb, sourceKey, sourceEtag, accent? }`。檢查：`MEDIA.head(sourceKey)` 嘅 ETag = `sourceEtag`（唔同 = 409 `STALE`）；`cover` 係 1200²、`thumb` 係 320²（`assets` 讀檔頭量或者加尺寸欄；T-099 併入；backlog B-052 ①）；`cover2` 要有第一張（backlog B-067 ②：唔會撞 D1 CHECK 變 500）；`accent` 只收喺 `slot = 'cover'`。寫入之後生成 catalog。⚠️ CR-008 回寫（B-081 ④）：加 `notSquare`、錯誤次序同碼、回應，見「CR-008 對技術設計嘅影響 → API-017／018／019／040／041 回寫」 |

**管理端（T-055）點樣行**：`GET /api/sync` → 逐個資料夾（照 API-033 嘅次序）叫 API-034（`more` 就再叫）→ 每個回應嘅 `coverJobs`：`fetch(MEDIA_BASE + key)`（要 bucket CORS 容許管理端 origin，U-1）→ 置中裁正方形 → 1200（細過就放大，D50）同 320 → WebP（`@jsquash/webp`）→ 第一張 `dominantColor()` → API-050 × 2 → API-017；失敗 = 檢查結果（`COVER_FAILED`，連原因），ETag 冇記低，下次再試 → 收集全部 `pendingRemovals` 同 API-033 嘅 `missingAlbums` → 顯示（逐項剔選，預設全剔）→ 「確認移除」→ API-035（分批）。中途閂咗頁面：做完嘅資料夾已經生效。

**每個請求嘅操作上限**（假設每個請求 1000 個 Cloudflare 服務操作；部署前對官方文件，backlog B-074 ④）：

| 請求 | 最多操作 | 估算 |
| --- | --- | --- |
| API-033 | list ≤ 5 頁 + D1 1–2 句 | < 10 |
| API-034（第一次同步原聲大碟 41 首） | list 1 + `info.txt` 1 + `.txt` ≤ 100 + 歌詞 JSON put ≤ 100 + D1 batch 1 + 生成 catalog（D1 2–3、R2 1） | 約 90（上限內約 210） |
| API-034（之後冇改） | list 1 + D1 1 | < 5 |
| API-035 | 每項 head／list 1 + D1 1 + 歌詞檔清理 ≤ 幾個；50 項 | < 300 |
| API-017 | head 1 + D1 2 + 生成 catalog | < 10 |
| API-019、API-041（⚠️ CR-008 回寫） | 讀寫 2 + 一次 API-034 | 一般約 335、最差約 845（review S-189）；QA 實測最多 318 |

成個 bucket（21 個資料夾、幾百個檔）第一次同步：1 + 21 個 API-034（大碟可能 2 個）+ 每張封面 3 個請求（API-050 × 2、API-017），約 90 個請求；之後冇改嘅同步約 22 個請求。CPU：每個請求最多解析約 100 個細文字檔（每個 ≤ 64 KiB），同現有掃描預覽一樣。

**並發**：一個管理員；兩個分頁同時同步同一個資料夾 = 兩次寫入結果一樣（按 `(album_id, no)` upsert）；`info.txt`／`.txt` 嘅寫入有版本檢查（下面）。

### 寫返媒體 bucket（T-106；API-018、API-019、API-040、API-041）

| 編號 | Method + Path | 做乜 |
| --- | --- | --- |
| API-018 | `GET /api/albums/:id/info` | ⚠️ CR-008 回寫：回應加 `problem`，見「CR-008 對技術設計嘅影響」。讀 `<folder>/info.txt`：`{ key, etag, text }`；冇檔 = `{ key, etag: null, text: formatAlbumInfo(而家 D1 嘅資料) }` |
| API-019 | `PUT /api/albums/:id/info` | body `{ text, etag }`（`etag` = 讀入時嘅值；`null` = 新檔）。檢查：大細同行數上限（413）；內容唔擋（`parseAlbumInfo()` 嘅檢查結果喺回應）→ 寫入 → 同步呢個資料夾（同 API-034 一樣）→ 回 `{ etag, album, checks, pendingRemovals, coverJobs }`。⚠️ CR-008 回寫：實際回 `{ key, etag, ...API-034 嘅回應 }`；加 409 `FOLDER_MISMATCH`、`FILE_TOO_LARGE` |
| API-040 | `GET /api/tracks/:id/text` | ⚠️ CR-008 回寫：回應 `{ trackId, key, etag, text, problem }`；409 `TEXT_CONFLICT`。**改**：讀 `text_key` 嘅檔：`{ key, etag, text }`；冇檔 = `{ key: null, etag: null, text: formatSongText({ title }) }`（歌名用 `info.txt` 嘅） |
| API-041 | `PUT /api/tracks/:id/text` | **改**：body `{ text, etag }`。嗰首歌冇音檔 → 409 `NO_AUDIO`；`parseSongText()` 有錯 → 400 逐行（乜都唔寫，同之前一樣）；會清走現有歌詞而冇 `?force=1` → 409 `LYRICS_REMOVED`（D30 保留）→ 寫入 `text_key`（冇就新 key）→ 同步呢個資料夾 → 回 `{ etag, track, checks, hints }`。⚠️ CR-008 回寫：實際回 `{ trackId, key, etag, text, track, checks, hints, sync }`（`sync.skippedBefore`）；加 409 `FOLDER_MISMATCH`、`TEXT_CONFLICT`、`FILE_TOO_LARGE`、`TRACK_NOT_LISTED`，次序見「CR-008 對技術設計嘅影響」 |

| 項目 | 規則 |
| --- | --- |
| 寫入方法 | `MEDIA.put(key, text, { onlyIf, httpMetadata: { contentType: 'text/plain; charset=utf-8' } })`。改舊檔：`onlyIf = { etagMatches: etag }`；新檔：`If-None-Match: *`（同 T-026 第一次寫 `catalog.json` 一樣；production 要驗，backlog B-060 ②）。`put` 回 `null` = 前提唔成立 → 409 `STALE`（「檔案已在其他地方更改，請重新載入。」），乜都唔寫 |
| 內容 | UTF-8、冇 BOM；換行統一做 LF；唔改用戶打嘅其他嘢 |
| 邊啲 key | 只有兩種：`<folder>/info.txt`（已有就用佢嘅 key，例如 `Info.txt`）同 `<folder>/<NN> <名>.txt`（已有就用 `text_key`；新檔 = 兩位歌號 + 空格 + `info.txt` 嘅歌名，去走 `/ \ : * ? " < > ｜ #` 同控制字元，最長 100 個字）。`folder` 一定係 D1 入面嘅專輯資料夾；Worker 唔接受管理端傳入嘅 key |
| 唔做 | 刪檔、改檔名、寫其他副檔名、寫音檔／MV／封面 |
| 之後 | 同步呢個資料夾（新增、更新自動；`pendingRemovals` 照回，要管理端確認） |
| 唔寫 D1 嘅部分 | 寫 R2 成功、同步失敗（例如 D1 出錯）：回 500，但檔已經寫咗；下次同步會補返（bucket 係唯一來源） |

### API 一覽嘅變化

| 編號 | 結果 |
| --- | --- |
| API-001–005、API-050、API-061、API-070–072 | 不變（API-070 內容檔少 `label`、`subtitle`） |
| API-010 | 改：列表次序 `albumOrder()`；每張專輯加 `checks` 數目、`wheelKey`（計出嚟）；統計 = 管理端設計稿第 4 版四個錶：歌曲已有音檔、已有歌詞、已有 MV、專輯已有封面（Functional Spec D80、D35） |
| API-012 | 改：專輯 + 歌 + `checks`；冇 `label`、`subtitle`、手動指定、參考欄 |
| API-017、API-018、API-019、API-033、API-034、API-035 | **新** |
| API-040、API-041 | **改**：讀寫 bucket |
| API-011、API-013、API-014、API-015 | **取消**（專輯由資料夾；封面經 API-017） |
| API-020、API-021、API-022、API-024 | **取消**（曲目由 `info.txt`；冇手動指定、參考欄；由同名歌帶入取消） |
| API-030、API-031、API-032 | **取消**（由同步取代；冇手動指定） |
| API-043 | **取消**（批量匯入取消） |

新錯誤碼：`STALE`（409，檔案版本）、`NO_AUDIO`（409）、`INVALID_FOLDER`（400）、`DUPLICATE_ALBUM_ID`（409）、`STILL_PRESENT`（API-035 逐項）。⚠️ CR-008 回寫（B-081 ④）：再加 409 `TEXT_CONFLICT`、`NO_FIRST_COVER`、`FOLDER_MISMATCH`、`FILE_TOO_LARGE`、`TRACK_NOT_LISTED`，`reason` `IMAGE_NOT_FOUND`、`WRONG_SIZE`。檢查結果嘅 `code`（建議，T-103／T-105 定案）：`INVALID_FOLDER_NAME`、`DUPLICATE_ALBUM_ID`、`DUPLICATE_ORDINAL`、`NO_INFO`、`INFO_BAD_ENCODING`、`INFO_TOO_LARGE`、`INFO_UNKNOWN_LINE`、`INFO_DUPLICATE_LABEL`、`INFO_DUPLICATE_NUMBER`、`INFO_BAD_YEAR`、`INFO_NO_TITLE`、`AUDIO_NOT_LISTED`、`FILE_WITHOUT_TRACK`、`NO_AUDIO`、`TITLE_MISMATCH`、`TEXT_INVALID`（連逐行）、`AUDIO_CONFLICT`／`MV_CONFLICT`／`TEXT_CONFLICT`／`COVER_CONFLICT`、`NO_FIRST_COVER`、`COVER_FAILED`、`COVER_NOT_SQUARE`、`SUBTITLE_IGNORED`。訊息全部經 `apps/api/src/i18n/zh-Hant.ts`（書面語），管理端以 `code` 砌字

### 安全設計（CR-007 補充）

| 範疇 | 設計 |
| --- | --- |
| 寫媒體 bucket | R2 binding 本身可以讀寫（`wrangler.toml` 唔使改，只改註解）；code 入面只有 API-019、API-041 兩條路徑會 `put`，key 由 server 砌（上表）；有大細上限、版本前提；冇 `delete`。測試鎖住：其他 route 冇 `MEDIA.put`／`MEDIA.delete` |
| 讀媒體 bucket | `info.txt` 同 `.txt` 先讀大細（超過唔讀）；內容只經 parser，唔執行、唔當 HTML |
| 同步嘅 folder 參數 | 一定要過 `parseAlbumFolder()`（冇 `/`、`..`、`_` 開頭） |
| 封面 | 管理端由公開 bucket 攞原圖，畫入 canvas 再輸出（唔原樣轉存）；API-017 對來源 ETag 同尺寸 |
| 權限 | 全部新 route 喺 `/api` 嘅 session + same-origin 守門之後 |

### 技術風險（CR-007）

| 風險 | 可能性 | 影響 | 應對 |
| --- | --- | --- | --- |
| 寫返 bucket 嘅 code 有錯，改壞用戶嘅 `.txt`（R2 冇版本記錄；Functional Spec R-20） | 低 | 高 | 兩條路徑、server 砌 key、`onlyIf` 版本前提、冇 delete；單元測試同 workerd 測試鎖住；建議用戶喺電腦留一份（U-13） |
| 封面喺瀏覽器處理：頁面閂咗或者 CORS 冇設好 | 中 | 低 | 檢查結果講明；ETag 唔記低，下次再試（Functional Spec R-22） |
| `If-None-Match: *` 寫新檔喺 production R2 嘅行為只喺 miniflare 驗過 | 低 | 中 | 部署後 smoke check（backlog B-060 ②、T-028） |
| 資料夾暫時唔見 → 成張專輯列入移除 | 中 | 中 | 永遠唔自動刪；逐項剔選、確認先做（Functional Spec R-21） |

### 已完成嘅 code：保留、改寫、拎走（跟進任務；今次冇改 code）

| 已完成任務 | 保留（重用） | 改寫 | 拎走 | 跟進任務 |
| --- | --- | --- | --- | --- |
| T-020、T-096、T-098、T-100、T-101、T-102（schema） | 表結構大部分、CHECK | `apps/api/migrations/0001_init.sql`、`test/schema.test.ts`、`test/applyMigrations.ts`：見「資料模型」 | `albums.label`／`wheel_key`／`sort_order`、`tracks` 七個欄 | T-104 |
| T-021（認證） | 全部 | — | — | — |
| T-022、T-098、T-100、T-101（專輯 API） | `albums/overview.ts`（統計改項目）、`rows.ts`（刪欄）、`errors.ts`（刪用唔到嘅碼） | `albums/routes.ts`（只留 GET 兩個 + API-017）、`store.ts`（讀 + 同步 upsert） | `albums/validate.ts`、`fieldRules.ts`、`order.ts`；`test/albumsCreate`、`albumsUpdate`、`albumsDelete`、`albumsOrder`、`albumsSecondCover`、`albumFieldRules`、`albumsEdges` 嘅寫入部分 | T-104（拎走）、T-105（upsert）、T-106（API-017） |
| T-023、T-102（歌曲 API） | `tracks/songText.ts`（`putLyrics`、解析 body）、`store.ts`（`saveSongText`、`findTrackText`、`isNumberTaken`、`isIdTaken`）、`insertNumbered.ts`、`ids.ts`、`lyricsCleanup.ts`、`saved.ts` | `tracks/routes.ts`（GET／PUT text 改讀寫 bucket） | `tracks/albumTrackRoutes.ts`（API-020）、PATCH／DELETE route、`fieldRules.ts`、`validate.ts` 嘅媒體同參考欄；`test/tracksCreate`、`tracksPatch`、`tracksDelete` | T-104、T-106 |
| T-024（封面） | 全部（API-050、API-071） | — | — | — |
| T-025（掃描） | `packages/catalog/src/scan/classifyFile.ts`、`scanFiles.ts`、`titleFromFileName.ts`；`apps/api/src/media/listing.ts`、`songTextFile.ts`、`applyGuard.ts`、`readConfirmedText()`；常數 `SCAN_*` | `scan/planScan.ts`、`scanTracks.ts`、`scanCovers.ts`、`scanTypes.ts` → `sync/planFolderSync`；`media/scanPreview.ts`、`scanApply.ts`、`applyCreate.ts`、`applyText.ts`、`applyMedia.ts`、`applyContext.ts`、`preview.ts`、`state.ts`、`store.ts`、`errors.ts`、`routes.ts` → 同步 route | `media/applyShape.ts`（逐項揀嘅 body）、`mediaRoutes.ts`（API-032）、手動指定相關；`songTextChange.ts`（冇用就刪）；`test/scanPreview`、`scanApply*`、`scanLimits`、`mediaList` 改寫或者刪 | T-105 |
| T-026（catalog） | `rebuild.ts`、`serve.ts`、`state.ts`、`afterWrite.ts` | `catalog/buildDocument.ts`、`snapshot.ts`（刪欄、計 `wheelKey`、次序）；`test/catalogFixtures.ts` 等 | — | T-104 |
| T-027（seed） | — | — | `apps/api/src/seed/*`、`scripts/seed.mjs`、`scripts/seed-sql.mjs`、`seed/albums.sql`、`package.json` 嘅 `seed`、`seed:sql`；`packages/catalog/src/seed/planAlbumSeed.ts`（連測試）；`test/seedAlbums.test.ts`、`albumsSql.test.ts` | T-104 |
| T-029（歌曲文字） | `parseSongText()`、`formatSongText()`、`labelHints`、限制常數 | 副題：唔再輸出、出 hint | — | T-103 |
| T-097（seed 生成） | `_design_/tools/*`、`seed/discography.json`、`credits.json`（參考同測試資料） | — | — | （可選 T-107） |
| T-002、T-098、T-100、T-101（`packages/catalog` schema） | `ids.ts`、`releaseCategory.ts`、`year.ts`、`mediaUrl.ts` | `schema/types.ts`、`parseCatalogDocument.ts`（刪 `label`、`subtitle`）；`seedToCatalog.ts` | — | T-103（新函數）、T-104（schema） |
| T-031、T-035、T-046、T-047、T-034（播放端） | 全部 code | `apps/player/src/catalog/testing/catalogFixtures.ts`、`seedCatalog` 測試（刪 `label`、`subtitle`） | — | T-104 |
| T-036（進行中） | 唔受影響（用 `wheelKey`、次序、封面，形狀不變） | — | — | — |
| `apps/api/wrangler.toml` | binding | 註解：「Worker 只 list／head」改為「只寫 `info.txt`、`NN ….txt`，唔刪」 | — | T-106 |

改到嘅已凍結 QA 鏈：`api-albums`、`api-tracks`、`api-media`（變同步）、`api-seed`（拎走）、`api-catalog`、`api-auth`（schema）、`catalog-core`、`catalog-song-text`、`player-catalog`。`.claude/CLAUDE.md` 嘅 chain 表同「指令」表（seed 兩行）要跟（backlog B-069）。已做而作廢嘅工作約 4 人日（Implementation Plan v1.6）。

### Functional Spec 對照（CR-007 新增／改動）

| Functional 需求 | 技術落點 |
| --- | --- |
| FR-127 全 bucket 同步 | API-033、API-034、`planFolderSync()`、`parseAlbumFolder()`、管理端同步畫面（T-055） |
| FR-128 `info.txt` | `parseAlbumInfo()`、`formatAlbumInfo()`、API-018、API-019、`albums.info_etag` |
| FR-129 歌曲文字框寫返 | API-040、API-041（bucket）、`tracks.text_key` |
| FR-130 檢查結果 | `albums.checks`、檢查結果碼、API-010、API-012 |
| FR-131 待確認移除 | API-033 `missingAlbums`、API-034 `pendingRemovals`、API-035 |
| FR-103、FR-125（改） | 管理端封面處理、API-050、API-017 |
| FR-102、FR-104、FR-124（改） | API-010、API-012（唯讀）、`albumOrder()`、`wheelKeyFor()` |
| FR-108、FR-110、FR-118、FR-119（取消） | seed、API-043、API-024、`lyrics_source_url` 拎走 |

## CR-008 對技術設計嘅影響

對應 Functional Spec v1.10 §CR-008（用戶 2026-11-26 逐點定案；播放端設計稿**第 19 版**，commit `ca8c52a`）。本節取代上文同佢有出入嘅地方：主要係「補充：播放端設計稿第 18 版確認嘅技術設計」入面嘅歌單欄、`playHeldTrack`、`openList` 守衛、淨空規則同 motion，「場景狀態機」嘅 `discChange → list`，同實現注意事項 12；受影響嘅表已喺原位加 ⚠️ CR-008。播放端部分只影響 `apps/player`（新任務 T-108，Implementation Plan v1.7）；Backend、API、資料庫、內容檔唔受 CR-008 影響。最後一部分「實作對齊」將 review／QA 要求嘅字眼（backlog B-070、B-077 ②、B-080 ③⑤、B-081 ④）對照 code（2026-11-26，branch `claude/charming-cannon-8yulp0`）寫返本文件。數值以設計稿常數為準：`TRACKLIST`、`PANEL_FLOAT`、`LIST_FLOAT`、`MINI`、`SWAP_FADE_MS`、`showsColumn()`。**今次冇改 code**。

### 狀態同衍生顯示

用詞（照「補充：第 18 版」）：`loaded` = 播放 store 嘅 `albumId`（`null` = 冇歌載入）；`view` = `stageReducer` 嘅 `viewAlbumId`；`holding` = `loaded !== null && view !== loaded && (scene === 'home' ｜｜ scene === 'discChange')`（已有，`app/holding.ts`）；`dialOpen` = `scene === 'discChange'`。新：**`trackChosen` = `loaded !== null && view === loaded`**（顯示緊嘅碟揀咗歌，Functional Spec「未揀歌」嘅反面）。

| 衍生（純函數，連 unit test；放 `app/holding.ts` 或者新檔，T-108 定案） | 規則 | 設計稿 |
| --- | --- | --- |
| `showsColumn` | `(dialOpen ｜｜ !trackChosen) && scene !== 'list' && overlay !== 'mv'`；`dialOpen` 時另外要等旋鈕停定（`settle`，見 motion） | `showsColumn()`、`panelHold` |
| 欄底 | `dialOpen ? heldTracks.bottomOpen : heldTracks.bottomIdle` | `panelMetrics()` |
| 三粒細掣 | `!dialOpen`（`home`）；`!trackChosen` 時歌書、MV `aria-disabled`（同冇歌嘅主頁一樣），播放模式照用 | — |
| 大唱片機嘅唱臂 | `!holding && !dialOpen`；姿勢照「唱臂姿勢」表 | — |
| 細唱片機 | `holding`（不變）；字：播放 store `ended` = 「已播完」（新）、`paused` = 「已暫停」、其餘「播放中」 | `miniTurntable()`、`loadedEnded` |
| 唱片夾圖案 | 永遠有：`playing` = pause，其餘 play | `spindle()` |

**場景 × 載入／拎住 × 字母盤**（Functional Spec §CR-008「揀碟時邊樣嘢出現」嘅技術版）

| `scene` | `loaded` | `view` | 歌單欄 | 三粒細掣 | 大唱臂 | 細唱片機 | 唱片夾 | 碟面 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `home` | `null` | 任何 | ✅ `bottomIdle` | ✅（歌書、MV 停用） | ✅ `parked` | ✗ | `playFirst(view)` | `openList`（由欄飄落） |
| `discChange` | `null` | 任何 | ✅ `bottomOpen`（停定先出） | ✗ | ✗ | ✗ | 唔做嘢 | 唔做嘢 |
| `home` | X | X | ✗（左上歌名） | ✅ | ✅ 姿勢表 | ✗ | 暫停／繼續 | `openList`（直接開） |
| `discChange` | X | X | ✅ `bottomOpen` | ✗ | ✗ | ✗ | 唔做嘢 | 唔做嘢 |
| `discChange` | X | Y | ✅ `bottomOpen` | ✗ | ✗ | ✅ | 唔做嘢 | 唔做嘢 |
| `home`（`holding`） | X | Y | ✅ `bottomIdle` | ✅（歌書、MV 停用） | ✗ | ✅ | `playFirst(view)`：Y 第一首入機（舊歌停） | `openList`（由欄飄落） |
| `list` | 任何 | 任何 | ✗ | 照舊（暗層下面，唔入 Tab 次序） | 照舊 | 照舊 | 播框入面嗰首 | — |
| `home` + `overlay = mv` | X | X | ✗ | — | `parked` | ✗ | — | — |

`playFirst(view)`：揀 `view` 第一首 `audio !== null` 嘅歌（純函數，連 Favourites 虛擬專輯）；冇 = 唔做嘢。之後同弧線歌單揀歌一樣：stage `selectedTrackId`、播放 store `start { albumId: view, trackId }`（舊歌停、換隊列），唱臂由 `parked` 行完整開場（`tonearmMs` + `needleDropMs`）；`holding` 自動解除。真正出聲由 T-038 接（同一個 `start` 路徑）。

**動作嘅變化**

| 動作 | 之前（T-037、T-048、T-049） | CR-008 |
| --- | --- | --- |
| `openList` | `home` 或者 `discChange` 先得；`holding` 時唔做嘢 | **只喺 `home`**（`discChange` 唔做嘢，Functional Spec D84；拎走 `discChange → list`）；`holding` 時**照開**（開拎住嘅碟嘅弧線歌單） |
| 唱片夾（`useSpindle…`／`useHome`） | 未揀歌 = 開歌單；`holding` 時冇作用 | 見上表：`playFirst(view)`；`discChange` 唔做嘢 |
| `playHeldTrack`（stage action）、`startHeld`（播放狀態 action） | 歌單欄㩒一行 | **拎走**（連測試）；由 `playFirst` 同弧線歌單嘅 `start` 取代 |
| `closeList`（㩒暗位） | 返 `home` | 不變；返 `home` 之後 `showsColumn` 照規則再出歌單欄 |
| `returnToLoaded` | 「淡出期間換碟」 | 即刻換碟、唱臂即時到位（`useSwapInstant`，兩格），之後淡入（見「實作對齊」S-176） |
| 旋鈕（`useKnobTurn`） | — | 已做（T-037／T-039 修正，S-152）：㩒住 `MOTION.input.dialHoldMs`（180）或者郁過 `layouts.knob.turnThresholdPx`（6）先 `openDiscChange`；輕點唔做嘢；鍵盤不變 |
| 弧線歌單嘅行 | — | 已做（W-051）：行唔㩒得；`closeList` 只由暗位；唱片夾或者 Enter／Space 播框入面嗰首 |

**拎走或者反轉嘅 code**（T-108）

| 位置 | 改動 | 原因 |
| --- | --- | --- |
| `app/stageReducer.ts`（連測試） | 刪 `playHeldTrack`；`openList` 守衛反轉（`holding` 照開、`discChange` 唔開） | D82、D84 |
| `app/playbackState.ts`（連測試） | 刪 `startHeld`；加 `ended`（或者等價嘅「播完」狀態，T-038 定案）畀細唱片機用 | D82、D88 |
| `app/useHome.ts`、`HomeScene.tsx`、`TopGroup.tsx`、`MachineChrome.tsx`、`heldTracksView.ts`、`miniView.ts`（連測試） | `onPlayHeldTrack` 拎走；唱片夾 `playFirst`；`showsColumn`、細掣、唱臂規則 | D83、D85、D86 |
| `components/held-tracks/`（`HeldTrackRow.tsx`、`rowFocus.ts`、`HeldTrackList.tsx` 等） | 行唔再係掣：拎走 `data-part="held-button"`、focus、鍵盤（`rowFocus.ts`）；欄嘅捲動（拖動、滾輪）保留；欄本身仲可唔可以 focus 嚟捲由 T-108 定（建議：可以，方向鍵捲，冇行 focus） | D82 |
| `i18n/zh-Hant.ts` | `heldTracks.play`（「播放第 {no} 首：{title}」）拎走；加「已播完」 | D82、D88 |
| `stage/layouts/phone.ts`、`types.ts` | `heldTracks.bottomHeld`（1650）→ `bottomIdle`（1290）；加飄落嘅位移 | D87 |
| `stage/layouts/clearance.test.ts` | 刪 D57 例外清單；改寫「歌單欄」幾條（見下） | D57 作廢 |

**淨空規則（取代「補充：第 18 版」嗰四條入面嘅 ② ④，連 ① 嘅欄底）**

1. 歌單欄欄底 `bottomOpen` 唔入字母盤外圈（不變）；欄底 `bottomIdle` 唔入三粒細掣嘅感應範圍（新）
2. ~~歌單欄右邊唔入細唱片機嘅感應範圍~~ 歌單欄嘅行唔係控件：同細唱片機感應範圍重疊（約 x 510–620、y 330–442，review S-173）唔算淨空問題；照設計稿圖層次序，歌單欄喺細唱片機上面（`StageSvg` 嘅次序要喺 T-108 對返設計稿：細唱片機 → 三粒細掣 → 歌單欄），細唱片機淨低嘅感應範圍仍然 ≥ 44pt
3. 細唱片機感應範圍唔同版本號、碟名、♥ 重疊（不變）；細唱片機兩行字（推上之後）唔疊住歌單欄第一行（`MINI.titleDy` 對 `TRACKLIST.top`）
4. 44pt 檢查**冇例外**（D57 作廢）
5. 泊位唱臂同歌單欄頭幾行可以重疊（唱臂唔係控件；Functional Spec D87）

**版面數字（`stage/layouts/phone.ts`）**

| 表 | 來源常數 | 改動 |
| --- | --- | --- |
| `heldTracks.bottomIdle`（取代 `bottomHeld`） | `TRACKLIST.bottomIdle`（1290） | 改 |
| `heldTracks.float`（建議名，T-108 定案） | `PANEL_FLOAT.dx`（170）、`dy`（−62） | 新 |
| `miniTurntable.label.dy`、`title.dy`、`title.left`、`title.minSize`、`title.step` | `MINI.labelDy`（−62）、`titleDy`（−14）、`titleLeft`（330）、`titleMin`（24）、`titleStep`（2） | **已做**（T-037／T-039 修正，W-045、S-193）；T-108 只核對 |
| `knob.turnThresholdPx` | 6 | **已做**（S-152） |

**Motion token（`config/motion.ts`，連 `motion.test.ts`、`tokens.node.test.ts`；名係建議，T-108 定案）**

| Token | 數值（設計稿） | 用喺 |
| --- | --- | --- |
| `scene.panelRowMs` | `PANEL_FLOAT.duration` 460 | 歌單欄每行飄落兼淡入 |
| `scene.panelStaggerMs` | `PANEL_FLOAT.stagger` 60 | 逐行遲 |
| `scene.panelSpreadMs` | `PANEL_FLOAT.spread` 560 | 成欄最多攤開幾耐（行多就壓細每行嘅遲） |
| `input.panelSettleMs` | `PANEL_FLOAT.settle` 140 | 旋鈕停定幾耐先出歌單欄（輸入規則，減少動態效果都一樣等） |
| `scene.chromeFadeMs`（已有） | `SWAP_FADE_MS` 320 | 鬆手時讓出嘅行淡出、三粒細掣淡入、唱臂淡入淡出 |
| `scene.listFloatRowMs`、`listFloatStaggerMs`、`listVeilMs`、`listFrameDelayMs`、`listFrameMs`、`listDialCloseMs` | `LIST_FLOAT`：560、80、360、280、300、200 | 由歌單欄飄落弧線（黑字變白字、暗層、框線、字母盤先收） |
| `input.dialHoldMs`（已有） | 180 | 旋鈕㩒住先開 |
| 減少動態效果 | 全部 scene token 0；`panelSettleMs` 照等 | `utils/motion.ts` |

元件唔寫死毫秒；欄嘅 CSS 時長由 token 生成（同 `chromeFadeMs` 一樣經 `tokens.css`）。

**測試同 E2E**

| 層 | 內容 |
| --- | --- |
| Unit | `showsColumn`、欄底、細掣、唱臂、細唱片機字（播放中／已暫停／已播完）喺上表每一行；`openList` 守衛（`discChange` 唔開、`holding` 照開）；`playFirst`（第一首冇音檔、全部冇音檔、Favourites）；冇 `playHeldTrack`／`startHeld` |
| 元件 | 歌單欄冇掣、冇 focus 行、拖動照捲、㩒落唔開弧線歌單；唱片夾未揀歌顯示 play；飄落有 stagger、`settle` 之前唔 render；減少動態效果即時 |
| 淨空 | 上面五條 |
| E2E 截圖（T-040） | 第 19 版 `VIEWS` 嘅格：「未揀歌嘅主頁」「播緊時，手上拎住另一隻碟」「拎住另一隻碟，播緊嗰隻碟播完咗」「拎住另一隻碟：播緊嘅歌名好長／超長」等；流程：開 app（有歌單欄）→ 㩒唱片夾（播第一首）→ 擰去另一隻碟鬆手（細掣出、冇唱臂）→ 㩒碟面（飄落弧線）→ 㩒暗位（歌單欄出返）→ 㩒唱片夾（換碟、完整開場）；減少動態效果再行一次 |

QA 鏈：`player-holding`、`player-list`、`player-home`、`player-dial`、`player-core`、`player-foundation`（改到嘅檔按 validation gate 重驗）。

### 更新（取代實現注意事項 12；Functional Spec D93）

| 情況 | 做法（`pwa/updateManager.ts`，T-039 已做） |
| --- | --- |
| 檢查 | 開 app、`visibilitychange`（返前景）、`pageshow`（bfcache）、每 30 分鐘（`UPDATE_CHECK_INTERVAL_MS`）叫 `registration.update()`；限流 60 秒（`UPDATE_CHECK_THROTTLE_MS`）；離線唔查 |
| 開 app（Preload 期間，`launching`） | 搵到 waiting 嘅 SW：即刻 `SKIP_WAITING` → `controllerchange` → reload 一次（`sessionStorage` 防 loop） |
| 用緊 app（Preload 之後） | **唔會自己換、唔會自己 reload**（播緊、暫停、閒置、返前景都一樣）；狀態 `waiting` → 出提示（`components/update-prompt`，「已有新版本」「立即更新」），有版本等緊就一直出。⚠️ **CR-009（D95）**：`waiting` → 右上版本號變成版本掣；`update-prompt` 拎走 |
| 㩒「立即更新」 | `SKIP_WAITING` → reload（聽眾自己揀，唔使防 loop；播緊嘅歌停）。⚠️ CR-009：改為㩒版本掣，同一條路（`applyNow()`） |
| 另一個分頁換咗版 | `controllerchange` 而唔係自己揀：當有新版本等緊，出提示 |
| 外觀 | ~~提示同「請打直」設計稿冇畫，等用戶睇（Functional Spec §開放問題）~~ ⚠️ CR-009：兩樣都拎走；版本掣照設計稿第 20 版 |

### 實作對齊（review、QA 要求回寫；唔係新決定）

| 來源 | 原本嘅字眼 | 跟 code 改為 | 改咗邊度 |
| --- | --- | --- | --- |
| B-070（S-132） | 「左上歌名兩行」：斷行用歌書嘅 `wrapLine()`，加「英文字同括號入面唔斷」 | `utils/breakAt.ts` 嘅 `breakAt()`（設計稿第 18 版 `breakAt()`）：英文字母、數字、半形括號同標點連住嘅一串唔喺中間斷；中文字之間同空格前後都斷得；唔係「先揀空格」。`wrapLine()` 係歌書純文字歌詞嘅斷行（T-082），唔共用 | 「左上歌名兩行」、CR-005 對照表 |
| B-077 ②（S-151） | 元件表：轉碟旋鈕 `role="listbox"` | 旋鈕 = `role="slider"` + `aria-valuenow`（`components/knob/Knob.tsx`，同實現注意事項 14）；字母盤每格唔係 option | 「繪圖方式」元件表 |
| B-080 ③（S-173） | 淨空 ②：歌單欄右邊唔入細唱片機感應範圍 | CR-008 之後行唔係控件，見上面淨空第 2 條 | 「補充：第 18 版」淨空 |
| B-080 ③（S-174） | 元件表：灰色行 `aria-disabled` | 灰色行係普通列表項，唔 focus 得（T-049 已咁做）；CR-008 之後所有行都係普通列表項 | 「補充：第 18 版」元件表 |
| B-080 ⑤（S-176） | `returnToLoaded`：淡出期間換碟、唱臂即時到位，之後淡入 | 即刻換碟（`viewAlbumId` 即時變），唱臂用 `useSwapInstant` 兩格冇過場到位，之後淡入；QA 對比設計稿互動格：快約 330 ms、冇閃冇跳 | 「補充：第 18 版」動作表 |
| B-081 ④（S-189） | API 表（下面） | 見「API-017／018／019／040／041 回寫」 | CR-007「同步嘅設計」「寫返媒體 bucket」 |

**API-017／018／019／040／041 回寫**（對照 `apps/api/src/albums/cover.ts`、`coverBody.ts`、`albums/info.ts`、`tracks/text.ts`、`media/readText.ts`、`sync/syncFolder.ts`、`config.ts`）

| 編號 | 補充 |
| --- | --- |
| API-017 | body 加 `notSquare?: boolean`（管理端置中裁切咗 → 檢查結果 `COVER_NOT_SQUARE`；同一個來源舊嘅 `COVER_NOT_SQUARE`／`COVER_FAILED` 換走，其他檢查結果照留）；未知欄位 `NOT_EDITABLE`。次序：body（太大 413、未 parse 就擋；400）→ 專輯 404 → `sourceKey` 要係呢張碟資料夾第一層、同 `slot` 同類嘅檔（400 `INVALID_VALUE`）→ 兩張圖：未上載 400 `IMAGE_NOT_FOUND`、尺寸唔啱 400 `WRONG_SIZE`（`reason`，喺 `VALIDATION_ERROR` 嘅 `details`）→ `cover2` 而冇第一張 409 `NO_FIRST_COVER` → 來源 ETag 唔同 409 `STALE` → 寫 D1（專輯讀入之後改過 409 `STALE`）→ 生成 catalog。回應 `{ album, checks }`。`COVER_FAILED`（處理失敗）而家冇 endpoint 記低（backlog B-081 ③，T-055 前定） |
| API-018 | 回應 `{ key, etag, text, problem }`；`problem` = `null`｜`TOO_LARGE`（大過上限：`text` = `null`，唔讀）｜`BAD_ENCODING`（照解碼，認唔到嘅 byte 變 U+FFFD；改好再存 = 寫返 UTF-8）。冇檔 = `{ key: <folder>/info.txt, etag: null, text: formatAlbumInfo(…) }` |
| API-019 | 次序：body `{ text, etag }`（400）→ 大細、行數上限 413 → 專輯 404 → 資料夾過 `resolveAlbumFolder()`（400／404／409；D1 嘅資料夾 id 唔係呢張碟 = 409 `FOLDER_MISMATCH`）→ 已有嘅 `info.txt` 大過上限 = 409 `FILE_TOO_LARGE`（S-181）→ 寫入（版本唔啱 409 `STALE`）→ 同步呢個資料夾。回應 `{ key, etag, ...API-034 嘅回應 }` |
| API-040 | 回應 `{ trackId, key, etag, text, problem }`（`problem` 同 API-018）；冇檔 = `{ key: null, etag: null, text: 歌名 }`；同一個歌號有幾個 `.txt` 而 D1 連住嗰個唔喺度 = 409 `TEXT_CONFLICT` |
| API-041 | 次序：body（400）→ `parseSongText()`（逐行 400；太大 413）→ 歌 404 → 資料夾（409 `FOLDER_MISMATCH`）→ 冇音檔 409 `NO_AUDIO` → 409 `TEXT_CONFLICT` → 已有嘅檔大過上限 409 `FILE_TOO_LARGE`（S-181）→ 歌號唔喺曲目表（等緊確認移除）409 `TRACK_NOT_LISTED`（S-183）→ 會清走歌詞而冇 `?force=1` 409 `LYRICS_REMOVED` → 寫入（409 `STALE`）→ 由呢首歌起同步呢個資料夾。回應 `{ trackId, key, etag, text, track, checks, hints, sync }`；`checks` 只係呢首歌嘅；`sync` = API-034 嘅回應加 `skippedBefore`（前面嘅歌今次冇同步，要再掃描；S-182） |
| API-034（補） | 回應實際係 `{ album: { id, folder, title, year, category, categoryNo, created }, added, updated, unchanged, failed, checks, pendingRemovals, coverJobs, more, nextFrom, truncated }`（上面「同步嘅設計」漏咗 `failed`、`truncated`） |

**新錯誤碼**（`apps/api/src/config.ts` 嘅 `ERROR_CODE`；訊息經 `apps/api/src/i18n/zh-Hant.ts`）：409 `TEXT_CONFLICT`、409 `NO_FIRST_COVER`、409 `FOLDER_MISMATCH`、409 `FILE_TOO_LARGE`、409 `TRACK_NOT_LISTED`；`details` 嘅 `reason`：`IMAGE_NOT_FOUND`、`WRONG_SIZE`。`FILE_TOO_LARGE`、`TRACK_NOT_LISTED` 嘅行為係主 session 代決定，**待用戶確認**（Functional Spec §CR-008「實作對齊」）。

**每個請求嘅操作上限（補 API-019、API-041；review S-189 嘅估算）**

| 請求 | 最多操作 | 估算 |
| --- | --- | --- |
| API-019、API-041 | 讀 1 + 寫 1 + 一次 API-034 嘅同步（list、`info.txt`、`.txt` 讀取、歌詞 JSON、D1、生成 catalog） | 一般約 335、最差約 845（上限假設 1000；部署前對官方文件，backlog B-074 ④）。QA（T-103–T-106）實測每個請求最多 318 |

### Functional Spec 對照（CR-008）

| Functional 需求／決定 | 技術落點 |
| --- | --- |
| D82、FR-044（改） | 歌單欄行唔係掣；`playHeldTrack`、`startHeld`、`rowFocus` 拎走；淨空冇例外 |
| D83 | `showsColumn`、`trackChosen`、`settle` |
| D84、FR-005 | `openList` 守衛（`discChange` 唔開、`holding` 照開）；`LIST_FLOAT` token |
| D85 | `playFirst(view)`、唱片夾永遠有圖案 |
| D86、FR-043 | 細掣、唱臂衍生規則 |
| D87、FR-038、FR-032 | `PANEL_FLOAT` token、`bottomIdle`、`chromeFadeMs`；淨空規則 |
| D88 | 播放 store「播完」、細唱片機「已播完」 |
| D89 | `miniTurntable` 字嘅數值（已做） |
| D90 | 歌號照用專輯色（冇改） |
| D91 | `dialHoldMs`、`turnThresholdPx`（已做） |
| D92 | 弧線歌單行唔㩒得（已做） |
| D93、FR-009 | `updateManager`（已做）；實現注意事項 12。⚠️ CR-009：版本掣（D95） |
| D94 | `src/assets/logo-full.png`、app icon（已做） |


## CR-009 對技術設計嘅影響

對應 Functional Spec v1.11 §CR-009（用戶 2026-11-26，CR-008 之後；播放端設計稿**第 20 版**，commit `a335587`）。本節取代上文同佢有出入嘅地方：「繪圖方式」嘅「手機橫版」一行、元件樹嘅 `rotate-notice/`、實現注意事項 12 同「CR-008 對技術設計嘅影響 → 更新」嘅提示部分、「Functional Spec 對照」嘅 FR-018 一行；受影響嘅表已喺原位加 ⚠️ CR-009。只影響 `apps/player`（新任務 T-109–T-112，T-038 加範圍；Implementation Plan v1.8）；Backend、API、資料庫、內容檔唔受影響。下面「而家嘅 code」對照 2026-11-26 branch `claude/charming-cannon-8yulp0`（T-108 合併之後）。數值以設計稿常數為準：`VERSION`、`UPDATE_PILL`、CSS `versionGlow`、`LIST_LOOP`、`loopWindow()`、`stackOffset()`、`STACK_LOOP`。**今次冇改 code**。

### 版本掣（D95；T-109）

**而家嘅 code**（T-039）：`pwa/` 有 `registerUpdates.ts`（接 vite-plugin-pwa、`controllerchange`）、`updateManager.ts`（狀態 `UpdateStatus = 'none' | 'waiting'`；`launching` 期間自動換；`applyNow()` 設 `chosen`，reload 唔經 `reloadGuard`）、`reloadGuard.ts`（`sessionStorage`，`RELOAD_LOOP_WINDOW_MS` 30 秒）、`updateChecks.ts`（返前景、`pageshow`、`UPDATE_CHECK_INTERVAL_MS` 30 分鐘）、`useUpdates.ts`（`UpdatePort` = `subscribe`／`getSnapshot`／`endLaunch`／`applyNow`；`useUpdateStatus()`、`useLaunchEnd()`）、`manifest.ts`、`catalogCaching.ts`。`App.tsx` 喺舞台外面 render `components/update-prompt/UpdatePrompt`（`role="status"`、「已有新版本」+「立即更新」掣，`data-trap-stop` 令弧線歌單嘅 Tab 兜圈包埋佢，S-199）。版本號係 `components/info-block/VersionText.tsx`，喺 `app/TopGroup.tsx` 入面（貼頂組），歌單開住時轉暗灰（喺暗層上面）。

| 項目 | 做法 |
| --- | --- |
| 訊號 | 照用 `pwa/`：`useUpdateStatus(port) === 'waiting'` = 出版本掣；㩒 = `port.applyNow()`（`chosen` → `SKIP_WAITING` → reload，唔經 30 秒防 loop）。`updateManager` 嘅規則唔改（Preload 期間 `publish()` 一律 `none`，所以版本掣唔會喺 Preload 出） |
| 點樣傳入舞台 | `UpdatePort` 而家只喺 `App`；版本掣喺 `HomeScene` → `TopGroup` 入面。建議：`App` 用 context（例如 `pwa/UpdateContext`）提供 `{ waiting, apply }`，`TopGroup` 讀；唔好經 `homeView`（純函數，唔應該知 SW）。T-109 定案 |
| 圖層 | 設計稿：掣畫喺唱片機嗰層，**喺暗層下面**。而家弧線歌單嘅暗層（`ArcVeil`）喺 `TopGroup` 入面（貼頂組畫喺貼底組之後）。所以版本掣要喺 `TopGroup` 入面、排喺 `ArcTrackList` 之前（仍然屬貼頂組，高身手機唔跟貼底組郁）；之後歌書（T-072）、MV（T-060）嘅暗層都要喺佢上面 |
| 蓋住（`covered`） | `listOpen ｜｜ overlay === 'booklet' ｜｜ overlay === 'mv'`（衍生純函數，連 unit test；歌書、MV 未做時只有 `listOpen`）：`pointer-events="none"`、唔 focus 得（唔入 Tab 次序）；視覺上靠暗層變暗，唔使另外轉色 |
| 外觀 | `layouts/phone.ts` 加 `updatePill`（由 `UPDATE_PILL` 抄：字級 26、`charW` 0.4、`padX` 26、高 58、右邊 1034、`midDy` −9、線寬 3、感應範圍 122）；顏色 `#f09a00` 入 `tokens.css`（例如 `--color-update`，連 `tokens.node.test.ts`）；字用 `--font-slab`（唔係 Light）；框闊 = `padX × 2 + 字數 × (size × charW + spacing)`（同設計稿 `updatePillBox()`；唔用量字，數字闊度設計稿已經估好）；感應範圍：高 122，闊 = max(框闊, 122) + (1080 − 1034)，貼住畫面右邊 |
| 閃 | CSS keyframes：opacity 1 → 0.2 → 1，ease-in-out，無限；時長 1.4 秒做 motion token（`config/motion.ts` + `tokens.css`，例如 `--motion-scene-update-blink`；連 `motion.test.ts`、`tokens.node.test.ts`）；放喺 `@media (prefers-reduced-motion: no-preference)` 入面，減少動態效果 = 常亮 |
| 元件 | `components/info-block/VersionButton.tsx`（或者 `components/update-button/`，T-109 定案）：SVG `<g role="button" tabIndex={0}>` + `aria-label`（`t('update.buttonLabel')`：「已有新版本，立即更新並重新載入」）；Enter／Space 同㩒一樣；`waiting` 時唔 render `VersionText`（同設計稿 `versionMark()`） |
| 淨空 | `clearance.test.ts` 加：感應範圍 ≥ 44pt；唔掂細唱片機感應範圍（設計稿「拎住另一隻碟時」：掣喺細唱片機上面） |
| 拎走 | `components/update-prompt/`（`UpdatePrompt.tsx`、`updatePrompt.css`、兩個測試）；`App.tsx` 嘅 `<UpdatePrompt>`；`useListFocus.ts` 嘅 `OUTSIDE_STOPS`／`data-trap-stop`（冇舞台外面嘅掣，S-199 嘅兜圈例外拎走）；語言檔 `update.available`、`update.apply`、`update.applyLabel`（換 `update.buttonLabel`）；`AppPwa.test.tsx` 改為驗版本掣。順手改 backlog B-085 ② 兩個舊註解（`i18n/zh-Hant.ts` 嘅 D14、`vite.config.ts`） |
| QA 鏈 | `player-pwa`、`player-home`（`info-block`）；亦掂到 `player-holding`（`TopGroup`）、`player-list`（`useListFocus`）、`player-foundation`（`layouts/phone.ts`、motion、tokens）：按 validation gate 重驗改咗嘅檔 |

### 手機打橫轉返（D96；T-111）

**而家嘅 code**（T-039）：`stage/deviceClass.ts` 嘅 `isPhoneLandscape({ width, height, coarsePointer })` = `coarsePointer && width > height && height ≤ PHONE_MAX_SHORT_SIDE_PX`（500）；`stage/usePhoneLandscape.ts`（聽 `resize`、`orientationchange`、`(pointer: coarse)`）；`App.tsx`：打橫時 `<Stage covered>`（舞台照 render，但 `inert` + `aria-hidden`）再蓋 `components/rotate-notice/RotateNotice`（`role="alert"`）。⚠️ 上面「繪圖方式」寫「舞台唔 render」同 code 唔一致：code 係照 render、蓋住。`manifest.ts` `orientation: 'portrait'`。`useStageFit` 用 `innerWidth`、`innerHeight` 同 `safeArea.readSafeAreaInsets()`（只讀 top、bottom）計 `fitStage()`。

| 項目 | 做法 |
| --- | --- |
| 幾時轉 | 照用 `isPhoneLandscape`（平板、Duo 打開、電腦唔轉，照舊置中）。Android 已安裝 PWA 由 manifest 鎖直，永遠唔會入呢個情況 |
| 轉邊個方向 | 🅰️ `screen.orientation.angle`（iOS 16.4 起有；舊 Safari 用 `window.orientation`）：90 → 舞台轉 −90°；270（或者 −90）→ 轉 +90°；讀唔到當 90。目標：畫面嘅頂永遠喺手機實際嘅頂。純函數 `quarterTurn(angle)`，連 unit test |
| 舞台大細 | `fitStage` 用**轉咗之後**嘅尺寸：闊 = `innerHeight`、高 = `innerWidth`（即係打橫 viewport 嘅短邊做舞台闊）；其餘縮放規則不變（`--u`、`extraUnits`） |
| Transform | 舞台容器（`.stage`）`position: fixed`，`width` = viewport 高、`height` = viewport 闊；`transform: translate(…) rotate(±90deg)`，`transform-origin` 揀到轉完啱啱填滿 viewport（例如 −90°：`translateY(100vh)`…；T-111 定案並寫 snapshot test）；`html`、`body` 照 `100dvh` + `overflow: hidden`。冇過場動畫（減少動態效果一樣） |
| 安全區 | `safeArea.ts` 加讀 `left`、`right`（`env(safe-area-inset-left/right)`）。打橫時：舞台嘅「頂」= 手機實際嘅頂 = viewport 嘅左或者右（跟 `quarterTurn`），「底」= 對面；viewport 嘅底（底部指示條）變咗舞台嘅側邊。`fitStage` 收已經轉好嘅 insets；側邊 inset 用嚟收窄可用闊度（新參數 `side`），T-111 定案 |
| Pointer | SVG 嘅 hit test 同 `getBoundingClientRect()` 由瀏覽器處理 transform，㩒掣唔使改。用 `clientX`／`clientY` 自己計嘅地方要跟住轉：① `components/scroll/useDragScroll.ts`（歌單欄、弧線歌單共用；用 `clientY` 計拖動距離）：改為用「舞台直方向」嘅座標，打橫時 = ±`clientX`；② `components/knob/useKnobTurn.ts`：角度係 `atan2(clientY − 中心, clientX − 中心)`，純旋轉 90° 之後角度差（`turnDelta`）唔變、中心由 `getBoundingClientRect()` 計都啱、6 px 門檻用 `hypot` 唔變，所以**唔使改**，但要加測試鎖住（打橫時順時針擰仍然係下一隻碟）。建議：`StageContext` 提供 `toStagePoint(clientX, clientY)`（純函數 `stage/rotation.ts`），所有手勢經佢；之後歌書（T-082）嘅捲動一樣用 |
| 滾輪 | `deltaY` 照用（電腦先有滾輪，唔會入打橫狀態） |
| 拎走 | `components/rotate-notice/`（元件、CSS、測試）；`Stage` 嘅 `covered` prop（只係為「請打直」）；`App.tsx` 嘅 `<RotateNotice>`；語言檔 `rotate.notice`；`deviceClass.ts`、`manifest.ts` 嘅註解改（C11 → D96） |
| 真機 | spike（T-010）喺真 iPhone 試：瀏覽器分頁同加咗落主畫面兩種；量系統轉嘅時間、有冇閃、狀態列位置、手勢方向（R-23） |
| QA 鏈 | `player-pwa`（`rotate-notice`、`deviceClass`、`usePhoneLandscape`、`AppPwa.test.tsx`）、`player-foundation`（`Stage`、`fitStage`、`safeArea`、`useStageFit`、`StageContext`）、`player-core`（`App.tsx`）、`player-list`（`useDragScroll` 喺 `components/scroll`）、`player-dial`（`useKnobTurn` 嘅測試） |

### 弧線歌單頭尾相接（D97；T-110）

**而家嘅 code**（T-037、T-108）：`components/arc-list/arcScroll.ts` 嘅 `clampOffset(offset, count)` 將捲動位置夾喺 0 至 N − 1；`snapIndex()` 吸附去最近一行播得嘅歌；`useArcScroll.ts` 嘅滾輪同 `active` 都經 `clampOffset`；`components/scroll/rowStep.ts`（歌單欄同弧線歌單共用）嘅方向鍵去到盡頭就停；`stage/arcRows.ts` 按 `offset` 排行（第 k 行喺 180 − k × step）。

| 項目 | 做法 |
| --- | --- |
| 圈 | 圈大細 `ring = N + 1`；第 N 格 = 接駁位。捲動位置 `offset` 可以係任何實數（唔再夾），顯示時摺返：`at = mod(round(offset) + j, ring)`（`mod` 永遠正）。純函數放 `arcScroll.ts`（`ringIndex`、`loopWindow`），連 unit test |
| 窗口 | `visible` = `layouts/phone.ts` 弧線歌單嘅 `visible`（設計稿 `LIST.visible`）。`above = min(⌊visible⌋, ⌊N/2⌋)`、`below = min(⌊visible⌋, N − above)`；畫 j = −above … below 嘅格（`above + below + 1 ≤ ring`，所以每首最多出現一次） |
| 接駁位 | 新元件（例如 `ArcSeam`）：圓點（半徑 `LIST_LOOP.dot` 9）+ 短線（長 `markW` 230、線寬 `markStroke` 5、同點相隔 `gap` 8），顏色 = 專輯色（`accent`）；不透明度 = lerp(`minOpacity` 0.45, 1, clamp(1 − abs(k) / visible))（歌名用 `depth`，淡得快啲）；`aria-hidden`、`pointer-events: none`；數值入 `layouts/phone.ts`（`list.loop`） |
| 吸附 | `snapIndex` 改用圈上距離：候選 = 播得嘅歌（唔包接駁位、灰色行）；距離 = 圈上最短距離；結果係「未摺返」嘅 offset（例如由 N − 1 拖過接駁位去 N + 1，吸附到 N + 1 = 第 0 首），等動畫唔會倒轉成個圈行返去 |
| 滾輪 | 照 `wheelSteps`；目標 = `current + steps`（唔夾），再經吸附 |
| 鍵盤 | `rowStep.ts` 加「頭尾相接」版本（弧線歌單用；歌單欄照用會停嘅版本，D97 歌單欄唔頭尾相接）：去到盡頭就由另一頭第一行播得嘅歌開始；跳過接駁位同灰色行；Home／End、Page Up／Down 照舊（Home = 第一首播得、End = 最後一首播得） |
| 得一首 | `ring = 2`：above 0、below 1（接駁位喺下面）；吸附永遠係第 0 首 |
| 冇歌 | 不變（`ArcEmpty`） |
| `active`（框入面）| `mod(round(offset), ring)`；如果啱啱係接駁位（拖動途中）就攞最近嗰首（同設計稿 `listRowOf()`）；左上歌名跟 `active` |
| `LIST_FLOAT` | `arcFloat.ts`／`useArcFloat.ts`：第一首起（未摺返、`base + j < N`）嘅行照舊由歌單欄飄落、逐行 `stagger`；摺返嘅行（`base + j < 0` 或者 `≥ N`）同接駁位：唔飄，`LIST_FLOAT.frameDelay`（280 ms）時原地淡入（同框線一齊）；`ArcColumnGhosts` 不變 |
| 歌單欄 | `columnLayout`、歌單欄捲動不變（唔頭尾相接） |
| QA 鏈 | `player-list`（`arc-list`、`scroll`、`stage/arcRows`）、`player-foundation`（`layouts/phone.ts`） |

### 旋鈕同碟疊頭尾相接（D98；T-110）

**而家嘅 code**（T-036）：`components/knob/knobTurn.ts`：`moveTurn()` 將 `turnedDeg` 夾喺頭尾各多半格之內；`turnedPosition()` 夾喺 0 至 P − 1；`keyTarget()` 方向鍵夾、Home／End 去頭尾。`components/disc-stack/DiscStack.tsx`：`entries.slice(from, to + 1)`，`offset = index − current`（直線），畫嘅次序 = 陣列次序。

| 項目 | 做法 |
| --- | --- |
| 擰 | `moveTurn()` 唔再夾 `turnedDeg`；`turnedPosition()` = `mod(startPos + round(turnedDeg / stepDeg), P)`。指針角度 = 刻度上 `position` 嘅角度，即時跳（唔做跨越成條弧嘅過場：指針嘅 CSS transition 喺頭尾跳嗰下要關，T-110 定案點做） |
| 鍵盤 | `keyTarget()`：方向鍵 `mod(current ± 1, P)`；Home = 0、End = P − 1（不變）；`aria-valuenow` 照用 position |
| 碟疊 offset | 純函數 `stackOffset(i, current, P) = mod(i − current + STACK_LOOP.before, P) − STACK_LOOP.before`（`before` = 1：前面 1 隻、後面其餘），連 unit test；P ≤ 2 時照用（結果唔重覆） |
| 窗口 | 唔再 `slice`：揀 `stackOffset` 喺 `shown.from − EDGE … shown.to + EDGE` 之內嘅碟（`layout.orbit.shown`，而家 −1 至 2）；key 照用 `albumId`，所以 ♥ ⇄ 第一隻碟換位時唔會重新 mount |
| 上下次序 | 按 `stackOffset` 由細到大畫（後畫 = 喺上面）：「下一隻」永遠喺上面；冇跨頭尾時同而家一樣 |
| 唱片夾（slot） | 照舊緊接喺而家隻碟後面畫 |
| QA 鏈 | `player-dial`（`knob`、`disc-stack`） |

### 播完最後一首（D99；T-038）

**而家嘅 code**（T-108）：`app/playbackState.ts` 已經有 `PlaybackStatus = 'idle' | 'playing' | 'paused' | 'ended'`（`ended` = 碟仲喺唱片機、唱針離開碟；觸發留畀 T-038）；細唱片機「已播完」（D88）已做；播放模式掣嘅 handler 仲係空（`app/useHome.ts`，backlog B-088 ⑧）。

| 項目 | 做法 |
| --- | --- |
| 觸發 | 隊列純函數（T-038）：冇 Repeat 而冇下一首 → 播放 store `ended`；唱臂 = 泊位（D36 ②）；唱片夾圖案 = play |
| 3 秒 | 新 motion／時間 token（例如 `config/motion.ts` 嘅 `endedReleaseMs` = 3000；唔係動畫，但同樣唔准寫死）；`ended` 之後開 timer，到咗 = 「放低隻碟」：播放 store 清走 `albumId`／歌（`idle`，冇歌載入），之後 `trackChosen` = false → `showsColumn` 出歌單欄（`PANEL_FLOAT`）、左上歌名部分淡出（`chromeFadeMs`），全部係 T-108 已有嘅衍生規則 |
| 㩒唱片夾 | `ended` 期間或者之後：`playFirst(view)`（T-108），由第一首有音檔嘅歌、由泊位行完整開場；Shuffle 開咗就由隊列規則揀第一首（🅰️ D99 ④） |
| 提早結束 timer | 🅰️ D99 ①：3 秒內擰旋鈕、㩒碟面、開 MV／歌書 = 即刻做「放低隻碟」再做嗰個操作；🅰️ ②：歌書或者 MV 開住時播完，等佢收埋先開始計 |
| 拎住時播完 | D88 不變：細唱片機留喺 `ended`；冇 timer（拎住期間顯示緊嘅碟本身已經係未揀歌）；㩒細唱片機返去 = 即刻「放低隻碟」（🅰️ ⑤） |
| 續播記錄 | 🅰️ ③：`ended` 時清走本機續播記錄（`storageKeys` 嘅 resume），重開 app = 未揀歌 |
| 減少動態效果 | 淡出、飄落即時；3 秒照等 |
| 測試 | unit：`ended` → timer → `idle`；timer 期間 `playFirst`；提早結束；拎住時冇 timer。E2E（T-040）：用假 audio 播完最後一首 → 3 秒後同「未揀歌嘅主頁」截圖一樣 |

### App icon 細尺寸（D100；T-112）

**而家嘅 code**（T-039，`beb3324`）：`public/icons/` 有 `icon-192.png`、`icon-512.png`、`icon-maskable-512.png`、`apple-touch-icon.png`；`pwa/manifest.ts` 嘅 `APP_ICONS` 同 `appManifest().icons`（192、512、maskable 512）；`iconLinks()` 出兩個 link：`rel="icon"` 用 **192**（完整版）同 `apple-touch-icon`。

| 位置 | 改為 |
| --- | --- |
| `public/icons/` | 加 `icon-16.png`、`icon-32.png`、`icon-48.png`、`icon-maskable-192.png`（由 `_mockups_/app-icon/export/d-black-disc/` 原檔抄入，唔好人手改；16／32／48 係 export 嘅簡化版 tiny／small／mid） |
| `APP_ICONS` | 加 `favicon16`、`favicon32`、`favicon48`（`image/png`）、`maskable192`（`purpose: 'maskable'`） |
| manifest `icons` | `icon-192`、`icon-512`、`icon-maskable-192`、`icon-maskable-512`（favicon 尺寸唔入 manifest） |
| `index.html`（`iconLinks()`） | `<link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16.png">`、`32x32`、`48x48` 三條；`apple-touch-icon` 180 不變；拎走用 192 做 favicon 嗰條 |
| 測試 | `manifest.node.test.ts`：每個 icon 檔存在、PNG 尺寸同 `sizes` 一樣、maskable 兩個尺寸都有；`index.html` build 出嚟有三條 favicon link |
| Precache | 新檔細（16／32／48 共約 8 KB；maskable 192 約 49 KB）；backlog B-085 ① 嘅壓縮照舊喺 T-041 之前做 |
| QA 鏈 | `player-pwa`（`public/icons`、`pwa/manifest.ts`、`index.html`、`vite.config.ts`） |

### Functional Spec 對照（CR-009）

| Functional 需求／決定 | 技術落點 |
| --- | --- |
| D95、FR-009、US-011 | 版本掣（`TopGroup`，暗層下面）；`useUpdateStatus`、`applyNow`；拎走 `update-prompt` |
| D96、FR-018、US-015、C11 | `quarterTurn`、轉舞台、`fitStage` 對調闊高、安全區轉、`toStagePoint`；拎走 `rotate-notice` |
| D97、FR-005、US-004 | `arcScroll` 圈、`loopWindow`、`ArcSeam`、圈上吸附、頭尾相接鍵盤、`LIST_FLOAT` 摺返行原地淡入 |
| D98、FR-004、US-003 | `knobTurn` 唔夾、`mod`；`stackOffset`；碟疊次序 |
| D99、FR-007、US-006、US-014 | `ended` → 3 秒 → `idle`；`playFirst` |
| D100、D94 | `APP_ICONS`、manifest、`iconLinks()` |


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
| v1.4 | 2026-11-25 16:40 | 跟 Functional Spec v1.6（**CR-005**）更新：加「CR-005 對技術設計嘅影響」一節（對照表、封面尺寸、掃描以音檔做錨、第二張封面、播放端隨機封面、左上歌名兩行、播緊時揀碟、字重、已完成 code 受影響清單連任務）。`albums` 加 `cover2`、`thumb2`、`cover2_source_etag`；API-013、API-050、API-070 嘅講法跟住改；掃描分類表加 `cover2` 同 `NO_AUDIO`；唱臂姿勢同「字體」嘅字眼改（D52、D53，review W-026 關閉）；CR-004 對照表嘅 D43、D47、D48 改為已回答；seed 同 credit 配對數字（246 / 0 / 45，review S-122）。內容檔 `category`、`categoryNo` 必填（review W-028）。今次冇改 code |
| v1.5 | 2026-11-25 19:36 | 跟 Functional Spec v1.7（**CR-005 補充：播放端設計稿第 18 版確認**，source commit `4e739cd`）更新：加「補充：播放端設計稿第 18 版確認嘅技術設計」（載入嘅碟 = 播放 store `albumId`、顯示嘅碟 = `viewAlbumId`、衍生 `holding`；`chromeHidden` 連左上歌名嗰部分、大唱片機唔轉；動作 `returnToLoaded`、`playHeldTrack`、`openList` 守衛；`layouts/phone.ts` 加 `songFit`、`miniTurntable`、`albumTitle.rightWhenHeld`、`heldTracks`；淨空規則加四條連 D57 例外清單；元件 `mini-turntable/`、`held-tracks/`、`columnLayout.ts`；`chromeFadeMs` = 設計稿 `SWAP_FADE_MS`；測試同 E2E 格；已完成 code 受影響清單）。「播緊時揀碟」入面「喺另一隻碟鬆手 = 唱臂泊位」作廢；唱臂姿勢表、組件圖、繪圖方式跟住改；D51、22 格數值定案。今次冇改 code |
| v1.6 | 2026-11-25 21:10 | 跟 Functional Spec v1.8（**CR-006**）更新：加「CR-006 對技術設計嘅影響」一節（對照表、掃描建立歌曲、歌號同歌 id、只有年份同冇「類型」、初始資料只入專輯、參考資料、字體檔網址、已完成 code 要改嘅地方連任務、Functional Spec 對照）。API-030 加 `newTracks`、`audioMissing`、`manualMissing`；API-031 加 `create`、`clearAudio`；API-020 收 `no`、id = `<albumId>-<NN>`；API-021 加 `no`；API-023 取消；API-011、API-013、API-070 刪 `releaseDate`、`type`，`year` 直接輸入（`INVALID_YEAR`）；`albums` 刪 `release_date`、`type`；`tracks.no` 可以跳號、刪歌唔重編；`tracks.id` 規則改；R2 key layout 加 `cover2.png` 同字體檔名；CR-004、CR-005 入面 D44、D49、D54 例外、`cover2.png` 嘅「待確認」改為定案。新任務 T-101（年份、刪 `type`）、T-102（歌號、歌 id）；T-025、T-027 改範圍。今次冇改 code |
| v1.7 | 2026-11-26 10:30 | 跟 Functional Spec v1.9（**CR-007**）更新：加「CR-007 對技術設計嘅影響」一節（對照表、資料模型、`packages/catalog` 新增同改、同步嘅設計（每個資料夾嘅計劃、API-033／034／035／017、管理端流程、每個請求嘅操作上限、並發）、寫返媒體 bucket（API-018／019／040／041、寫入規則）、API 一覽嘅變化、安全設計、技術風險、已完成 code 保留／改寫／拎走清單連任務、Functional Spec 對照）。架構表（媒體 bucket、D1）、Endpoint 一覽、數據庫設計、R2 key layout（`info.txt`）、Seed、安全設計「R2 key 驗證」加 ⚠️ CR-007 標記。今次冇改 code |
| v1.8 | 2026-11-26 11:40 | 跟 Functional Spec v1.10（**CR-008**；播放端設計稿第 19 版，commit `ca8c52a`）更新：加「CR-008 對技術設計嘅影響」一節：狀態同衍生顯示（`trackChosen`、`showsColumn`、欄底、細掣、唱臂、細唱片機「已播完」、唱片夾圖案）、場景 × 載入／拎住 × 字母盤表（歌單欄、細掣、唱臂、細唱片機、唱片夾、碟面）、`playFirst()`、動作嘅變化（`openList` 守衛反轉、`discChange → list` 拎走、`playHeldTrack`／`startHeld` 拎走、`returnToLoaded` 即刻換碟）、拎走或者反轉嘅 code、淨空規則（D57 例外拎走）、版面數字（`bottomIdle`、飄落位移）、motion token（`PANEL_FLOAT`、`LIST_FLOAT`、`panelSettleMs`）、測試同 E2E、更新規則（取代實現注意事項 12）、實作對齊（`breakAt()`、旋鈕 `slider`、S-173／S-174／S-176、API-017／018／019／040／041 嘅回應同錯誤碼、API-034 漏咗嘅 `failed`／`truncated`、API-019／041 操作數）、Functional Spec 對照。原位加 ⚠️ CR-008：場景狀態機、元件表（旋鈕、歌單、歌單欄）、實現注意事項 12、「左上歌名兩行」、CR-005 對照表、「補充：第 18 版」（歌單欄、`openList`、`returnToLoaded`、`playHeldTrack`、`heldTracks`、淨空、元件、motion、i18n）、CR-007 嘅 API-017／018／019／040／041、新錯誤碼、操作數表。今次冇改 code |
| v1.9 | 2026-11-26 16:30 | 跟 Functional Spec v1.11（**CR-009**；播放端設計稿第 20 版，commit `a335587`）更新：加「CR-009 對技術設計嘅影響」一節：版本掣（訊號由 `pwa/useUpdates` 經 context 入 `TopGroup`；圖層喺弧線歌單暗層下面；`covered`；`layouts/phone.ts` `updatePill`；顏色 token；閃嘅 motion token 同減少動態效果；拎走 `update-prompt`、`data-trap-stop`、三條語言檔字串）、手機打橫轉返（`quarterTurn`、舞台 transform、闊高對調、安全區加 left／right、`toStagePoint`；`useDragScroll` 要改、`useKnobTurn` 唔使改但要測試；拎走 `rotate-notice`、`Stage covered`）、弧線歌單頭尾相接（`ring`、`loopWindow`、接駁位元件、圈上吸附、`rowStep` 頭尾相接版、`LIST_FLOAT` 摺返行）、旋鈕同碟疊頭尾相接（`moveTurn` 唔夾、`turnedPosition`／`keyTarget` `mod`、`stackOffset`、窗口同次序）、播完最後一首（`ended` → 3 秒 → `idle`、`playFirst`、提早結束、續播記錄）、app icon（favicon 16／32／48、maskable 192、`iconLinks()`）、Functional Spec 對照。原位加 ⚠️ CR-009：元件樹（`rotate-notice/`、`pwa/` 實際檔案）、「繪圖方式」手機橫版（連對照 code 改正：舞台照 render 再蓋住）、實現注意事項 12、Functional Spec 對照 FR-018、「CR-008 → 更新」表同對照表。今次冇改 code |
