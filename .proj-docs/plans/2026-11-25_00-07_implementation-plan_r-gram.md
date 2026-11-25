# Implementation Plan：R Gram（播放端 PWA + 內容管理 Backend）

**版本**：v1.1
**日期**：2026-11-25 08:06（v1.0：2026-11-25 00:07）
**狀態**：v1.1（CR-003）。v1.0 用戶 2026-11-25 批准；v1.1 跟用戶同日嘅 14 項決定更新。**2026-11-25：Functional Spec D30–D39 用戶已確認**（「嗰 8 條跟建議」；D33 係技術決定，D35 等管理端設計稿第 2 版確認），U-12 完成。**2026-11-25：播放端設計稿第 17 版用戶已確認**（「用框入面斷行，第 17 版確認」；包埋第 16 版嘅內容），U-11 完成。仍然未確認：管理端設計稿第 2 版（U-8，連 D35）、本文件 A-7、A-8、spike 測試碟
**關聯 Spec**：Functional Spec v1.4（CR-001、CR-002、CR-003）；Technical Spec v1.2
**負責人**：Project Manager + Architect Agent

## Context

用戶已確認播放端全部場景（mockup 第 15 版）同兩份 spec（D22–D29 全部接受）。呢份 plan 將 spec 拆成可以逐個交付嘅任務，定出先後、依賴同要用戶做嘅事。

Functional Spec 原本嘅分期（M0–M9）係 CR-002 之前寫嘅，有三處要調整：

| 原分期 | 調整 | 原因 |
| --- | --- | --- |
| M4、M5 寫住「mockup 確認後」 | 播放端部分已解鎖 | 收藏、播放模式、歌書已喺 mockup 確認 |
| M5 有獨立歌詞畫面同 Info | 改為「歌書」：曲詞編監唔使等歌詞，提前做 | CR-002 合併咗歌詞同 Info |
| 冇 scaffold 一期 | 加 Phase A | Repo 係空嘅 |

### v1.1（CR-003）改咗乜

| 範圍 | 改動 |
| --- | --- |
| 取消 | T-054（發佈面板）、T-080（獨立歌詞 API）、T-081（獨立歌詞編輯器）：冇草稿、冇發佈、冇獨立歌詞編輯器 |
| 改 | T-022、T-023、T-026、T-027、T-028（Backend：冇上下架、歌曲文字、每次寫入之後生成 catalog）；T-035、T-036、T-038、T-039、T-040、T-072（播放端：高身手機、刻度弧、暫停）；T-050 重開（管理端設計稿第 2 版）；T-051–T-053（R Gram 視覺語言、歌曲就地展開 + 文字框）；T-082、T-083 |
| 新增 | T-029（歌曲文字 parser）、T-096（D1 schema 跟進）、T-042（播放端已完成 code 嘅跟進）、T-043（播放端設計稿第 16 版；之後加第 17 版） |
| 工作量 | 77 → 80.5 人日（淨增 3.5）。2026-11-25 設計稿第 17 版補充：80.5 → 82（+1.5，見「工作量估算」） |
| 新嘅阻塞 | ~~播放端設計稿第 16 版確認（U-11）阻 T-036、T-038、T-042、T-072~~ ✅ 2026-11-25 第 17 版已確認，播放端設計稿唔再阻任何任務；管理端設計稿第 2 版確認（U-8）阻成個 Phase E；~~D30–D39 確認（U-12）阻 T-029、T-023、T-026、T-096~~ ✅ 2026-11-25 已確認，呢四個任務同 T-022 唔再受阻 |

任務編號唔變；取消嘅任務留喺表入面標「取消」。新任務用所屬 Phase 最後一個編號之後嘅號碼；Phase C 得返 T-029 一個空位，第二個新任務用全表最後一個編號之後嘅 T-096。

### 進度（2026-11-25 11:40）

| 狀態 | 任務 |
| --- | --- |
| 完成（review 同 QA 都過咗） | T-001、T-002、T-020、T-021、T-030；T-031（review 100 / 100：`reviews/2026-11-25_08-27_review_T-031.md`；QA S1 pass：`qa/2026-11-25_08-36_qa_player-catalog.md`）；T-032、T-033（re-review 100 / 100：`reviews/2026-11-25_07-53_review_T-032_T-033_re-review.md`；QA S1 pass：`qa/2026-11-25_08-16_qa_player-core.md`）；T-029、T-096（review 95 / 100：`reviews/2026-11-25_08-59_review_T-029_T-096.md`；QA S1 pass：`qa/2026-11-25_09-09_qa_catalog-song-text_catalog-core_api-auth.md`）；T-022（review 85 → re-review 100 / 100：`reviews/2026-11-25_09-42_review_T-022_re-review.md`；QA S1 pass：`qa/2026-11-25_09-50_qa_api-albums.md`）；T-023（review 95 / 100：`reviews/2026-11-25_11-10_review_T-023.md`；QA S1 pass：`qa/2026-11-25_11-32_qa_api-tracks.md`，新鏈 `api-tracks`）；T-043（播放端設計稿第 16–17 版，用戶已確認） |
| 用戶已確認（2026-11-25，U-12） | Functional Spec D30、D31、D32、D34、D36、D37、D38、D39。D33 係技術決定，唔使確認；D35 等 U-8 |
| 用戶已確認（2026-11-25，U-11） | 播放端設計稿第 17 版（包埋第 16 版嘅內容）：純文字歌詞直身一欄（修訂 D38）、有時間標記嘅長行喺框入面斷行（修訂 D22）、唱針開場（FR-040）、碟多時嘅字母盤（D28） |
| 解除阻塞，可以開工 | Backend：T-024（T-022 已完成）、T-025（T-023 已完成）；之後 T-026（要 T-023、T-024）。播放端：T-042（U-11 完成，可以即刻開工）、T-034、T-035；之後 T-036（要 T-035、T-042）、T-037（連空狀態）、T-039、T-040。T-072 同 T-082 嘅畫面已確認，照依賴排喺 T-038 之後 |
| 已交，等用戶確認 | T-050 管理端設計稿第 2 版（commit `d60b02b`；`副題：` 行 commit `82000ed`），連 D35 |
| 仍然受阻 | T-038（等 spike T-011 同測試碟；T-010 要 U-1、U-7）；Phase E（U-8）；T-028、T-041（`main`，A-8） |

---

## 可行性評估

### 技術可行性

| 項目 | 評估 | 備注 |
| --- | --- | --- |
| 技術棧支持 | ✅ | 全部同 `dcwhung/903-player` 現用版本一樣；Backend 大部分模組可以直接移植 |
| 播放端繪圖（SVG + CSS） | ✅ | Mockup 已經用同一套做法畫晒全部場景同過場；T-033 已經將基本零件做成同一個 SVG 畫布入面嘅 React 元件（CR-003 決定 4） |
| 第三方依賴 | ⚠️ | Cloudflare（Worker、D1、R2）、Google OAuth、Vercel 都要用戶喺 dashboard 開；我喺呢個 session 試過 Cloudflare API，回「Invalid access token」，所以唔可以當我代開 |
| iOS 播放限制 | ⚠️ | 手勢解鎖、背景自動下一首、MV 音量，三樣都要真機驗證（Phase B）；結果會決定 `audioEngine` 介面 |
| 性能要求 | ⚠️ | 旗幟 canvas 同模糊濾鏡喺舊 iPhone 嘅 fps 未知（Phase B 量度；有降級方案）；單一 SVG 入面轉碟嘅 fps 要喺真機預覽量（R-005） |
| 安全要求 | ✅ | 認證、session、CORS 做法沿用 903-player；媒體公開網址係用戶已接受嘅決定（R-1） |

**總體可行性**：⚠️ 有條件可行

**條件**：① 用戶完成 dashboard 設定同上載測試媒體；② Phase B 真機結果冇推翻 `<audio>` 單一 element 嘅做法（有退路：見風險 R-001）。

### 其他維度

| 維度 | 評估 |
| --- | --- |
| 時間 | 約 82 個理想人日（見工作量；Phase A–D 即係「手機上播到歌」約 44）。播放端核心（Phase D）最大，因為要將 mockup 逐個場景變成有狀態嘅元件 |
| 資源 | 前端（SVG / CSS 動畫、PWA、iOS 媒體）、Cloudflare Worker、CI；全部喺團隊 agent 能力範圍 |
| 未知因素 | Phase B 嗰三項 iOS 行為同兩項 fps；CR-003 嘅 D30–D39 已確認（2026-11-25），淨返 D35（統計項目）等管理端設計稿第 2 版 |

---

## 階段劃分

| Phase | 名稱 | 目標 | 對應 FR | 完成標準 | 阻塞 |
| --- | --- | --- | --- | --- | --- |
| A | 基礎 | Monorepo、共用邏輯、CI | — | `npm run lint`、`npm test`、`npm run build` 全綠；`packages/catalog` 覆蓋率 ≥ 80%；用現有 `discography.json` + `credits.json` 生成嘅 fixture catalog 通過 validator | 冇（已完成） |
| B | 真機 spike（M0） | 驗證 iOS 播放、MV 音量、fps | R-5、R-6、R-8 | 一份 spike 報告：五項各有「得 / 唔得 + 採用做法」；`audioEngine` 介面定案 | 用戶：測試媒體（**用邊張碟未定**）、Vercel（U-7）、iPhone |
| C | Backend API（M1） | 登入、專輯 / 歌 CRUD、歌曲文字、封面、掃描、每次寫入之後生成 catalog、對外 catalog、seed | FR-101–106、108、109、114、117、120、121 | Worker 測試全綠；本機 seed 後 `GET /catalog/v1/catalog.json` 出到 17 張專輯、262 首歌並通過 validator；改一首歌嘅文字之後 catalog 即時跟住變 | 開發冇阻塞（D30–D34、D37 用戶 2026-11-25 已確認，U-12 完成）；部署要用戶 dashboard 設定 |
| D | 播放端核心（M2） | 手機直度：Preload、主頁、轉碟、歌單、播放、自動下一首、PWA、i18n | FR-001–011、018、025、031、032、034–040 | E2E 行通「開 app → 轉碟 → 揀歌 → 播 → 暫停 / 繼續 → 自動下一首」；淨空規則測試全綠；同 mockup 截圖比對喺容許誤差內；真機安裝得 | 設計稿：冇（第 17 版用戶 2026-11-25 已確認，U-11 完成）；B 嘅結論（只阻 T-038） |
| E | 管理端 UI | 管理介面 | FR-101–106、114、117、119、120–122 | 管理端 E2E：登入 → 改專輯 → 上載封面 → 掃描 → 改一首歌嘅文字並儲存 → catalog 已更新 | **管理端設計稿第 2 版要用戶確認（U-8）** |
| F | MV 同系統整合（M3） | MV 電視、鎖屏控制、續播 | FR-012、014、015、026、038（電視） | E2E：播歌 → MV → 熄機 → 人手續播；真機鎖屏控制得 | D |
| G | 收藏、播放模式、歌書（M4） | 心形、Favourites 碟、四個模式、歌書（曲詞編監） | FR-016、023、024、030、033（credit）、038（歌書） | 隊列純函數測試覆蓋四個模式；收藏重開 app 仍然喺度；歌書開住時暫停，歌書留住 | D（T-072 嘅畫面已確認，U-11 完成） |
| H | 歌詞（M5） | 歌書歌詞；批量匯入、由同名歌帶入、音檔對時 | FR-033（歌詞）、036、110、112、118 | 喺管理端貼入有時間標記嘅歌詞 → 儲存 → 播放端歌書跟住歌行，太長嘅行喺框入面斷行；貼入冇時間標記嘅歌詞 → 歌書一次過顯示成份歌詞（直身一欄），可以上下捲 | E（T-083）；T-082 嘅兩個歌詞版面已確認（設計稿第 17 版，U-11 完成；D22、D38 喺第 17 版修訂） |
| I | iPhone Duo（M6） | 版面 | FR-027 | 截圖比對：手機版零改變 | **P-7 mockup** |
| J | HomeView（M7） | 版面 | FR-028 | 同上 | **P-7 mockup** |
| K | 電腦（M8） | 版面 | FR-029 | 同上 | **P-7 mockup** |
| L | P2 項目（M9） | 手勢開轉碟、拖動進度、歌詞跳句、對時工具 | FR-019–021、115 | 到時再拆 | 部分要先出 mockup |

---

## 任務分解

Mockup Binding 縮寫：**HT** = `_mockups_/home-turntable/index.html`（source：`src/template.html`；**第 17 版用戶 2026-11-25 已確認**，係播放端嘅 Design Source，包埋第 15、16 版嘅內容；下表寫「HT 第 17 版」嘅係第 16、17 版加入或者改過嘅格）；**AD** = `_mockups_/admin/index.html`（source：`src/template.html`；**第 2 版等確認**）；**v16** = `_mockups_/r-gram/index.html`（motion preview，只用旗幟同金屬質感）。

「CR-003」欄：空白 = 冇變；✅ = 已完成。

### Phase A — 基礎

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 | CR-003 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-001 | Monorepo scaffold：workspaces、TypeScript、ESLint、Prettier、Vitest projects、`.gitignore`、project `CLAUDE.md`（QA chain、指令、branch 模式）；`data/` 搬去 `apps/api/seed/`；`ci.yml` | chore | DevOps + Architect | none-required | 1 | — | P0 | ✅ |
| T-002 | `packages/catalog`：catalog 型別同 validator（連 credit）、`wheelKeyFor`、`dominantColor` / `glowColor`、LRC parser、`matchMediaFiles`、`matchCredits`；由 seed 資料生成 fixture catalog | feature | Backend | none-required | 2 | T-001 | P0 | ✅（跟進：T-029） |

### Phase B — 真機 spike

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 | CR-003 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-010 | Spike 頁（用完即棄，唔入產品）：① 手勢入面靜音解鎖、1.5 秒後出聲 ② 鎖屏下同一個 `<audio>` 自動下一首 ③ Media Session ④ `<video>` 經 Web Audio 調音量（連 CORS）⑤ 旗幟 canvas 同模糊濾鏡 fps。每項畫面上顯示結果 | chore | Frontend | none-required | 1.5 | T-001、用戶 U-1、U-7 | P0 | 改：放喺 Vercel（決定 13）；測試碟未定（決定 14） |
| T-011 | Spike 報告（`.proj-docs/`）同 `audioEngine` 介面定案 | docs | Architect | none-required | 0.5 | T-010、用戶 U-2 | P0 | |

### Phase C — Backend API

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 | CR-003 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-020 | Worker scaffold：Hono、`wrangler.toml`、env 驗證、D1 migration（6 張表）、workerd 測試環境、health | chore | Backend | none-required | 1 | T-001 | P0 | ✅（schema 跟進：T-096） |
| T-021 | 認證：Google OAuth（PKCE）、email 白名單、session cookie、middleware、登出 | feature | Backend | none-required | 1 | T-020 | P0 | ✅ |
| T-022 | 專輯 API：CRUD、排序、每張專輯嘅完整度 + 全站統計（FR-114）；刪除有 ID 守衛（`?force=1`）。**冇上下架** | feature | Backend | none-required | 1 | T-020、T-002、T-096 | P0 | 改；✅ 完成（review 85 → re-review 100 / 100；QA S1 pass）。統計項目照 D35 嘅建議做咗（D35 等 U-8，有改就細改 API-010） |
| T-023 | 歌曲 API：新增（body 係歌曲文字）、刪除（ID 守衛）、排序（歌號 = 次序）、參考欄同手動指定檔案；歌曲文字讀寫（API-040、API-041：`parseSongText()` → 歌名、副題、credit、歌詞一次過寫入，連歌詞 JSON 寫 R2）。**冇上下架** | feature | Backend | none-required | 2 | T-022、T-029 | P0 | 改（1.5 → 2；吸收 T-080）；✅ 完成（review 95 / 100；QA S1 pass，新鏈 `api-tracks`） |
| T-024 | 封面：上載、驗證、兩個尺寸 WebP、hash 檔名、抽專輯色 | feature | Backend | none-required | 1 | T-022 | P0 | |
| T-025 | 掃描 R2：list / head、配對、衝突、手動指定（套用後即時生效） | feature | Backend | none-required | 1 | T-023 | P0 | |
| T-026 | Catalog 生成：`rebuildCatalog()` 做成每個成功寫入請求嘅後置步驟、`catalog_state`、生成失敗嘅狀態同重試（API-061）；對外 `/catalog/v1/*`（ETag、CORS 限播放端網域）。**冇草稿、變更摘要、警告、發佈記錄** | feature | Backend | none-required | 1 | T-023、T-024 | P0 | 改（1.5 → 1）；U-12 完成，唔再受阻 |
| T-027 | Seed script：歌單 + credit + 下載封面，可重複執行；匯入後全部專輯同歌即刻入 catalog（seed 之後生成一次） | feature | Backend | none-required | 1 | T-022–T-024、T-026 | P0 | 改 |
| T-028 | `deploy-api.yml` 同第一次部署；Worker `robots.txt`（backlog B-021）；D1 時間點還原寫入操作清單（R-011） | chore | DevOps | none-required | 0.5 | T-026、用戶 U-3–U-6、`main`（A-8） | P0 | 改 |
| T-029 | `packages/catalog` `song-text/`：`parseSongText()`、`formatSongText()`、round-trip 測試；歌詞 JSON 加 `synced` 同純文字路徑；長度上限常數（backlog B-006） | feature | Backend | none-required | 1 | T-002（D31、D32、D37 ✅ 2026-11-25 已確認） | P0 | **新**；✅ 完成（review 95 / 100；QA S1 pass） |
| T-096 | D1 schema 跟 CR-003（跟進 T-020）：刪 `albums.enabled`、`tracks.enabled`；`publishes` → `catalog_state`；`lyrics.lrc` → `source` + `synced`；改 `test/schema.test.ts`、`test/applyMigrations.ts`。未部署過，建議直接改 `0001_init.sql` | fix | Backend | none-required | 0.5 | T-020（D30、D32 ✅ 2026-11-25 已確認；`lyrics.lrc` → `source` 係技術決定 D33，唔使確認） | P0 | **新**；✅ 完成（review 95 / 100；QA S1 pass） |

### Phase D — 播放端核心（手機直度）

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 | CR-003 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-030 | 播放端 scaffold：Vite + PWA plugin；`tokens.css`、`config/motion.ts`；i18n（`zh-Hant.ts`、有型別 `t()`、書面語測試、寫死文字測試）；舞台縮放（1080 × 1920）；`layouts/phone.ts` 幾何資料表 + 淨空規則測試 | feature | Frontend | mockup: HT（常數表、量度表） | 2 | T-001 | P0 | ✅（跟進：T-042） |
| T-031 | Catalog loader：fetch、驗證、本機 fallback；selectors | feature | Frontend | none-required | 1 | T-002、T-030 | P0 | ✅（review 100 / 100；QA S1 pass） |
| T-032 | 場景狀態機 `stageReducer`（純函數）：`preload → home ⇄ discChange`、`home ⇄ list`、overlay `mv`｜`booklet`；每個轉換有「冇動畫」路徑 | feature | Frontend | none-required | 1 | T-030 | P0 | ✅（review 100 / 100；QA S1 pass） |
| T-033 | 基本元件：金屬面、螺絲、金屬掣同 icon、轉盤、空心碟、固定唱片夾（四個狀態）、唱臂 | feature | Frontend | mockup: HT「未揀歌」「播緊」 | 2.5 | T-030 | P0 | ✅（review 100 / 100；QA S1 pass；唱臂跟進：T-042） |
| T-034 | Preload：旗幟 canvas、真實載入進度、App 名 / 非官方 / 版本 | feature | Frontend | mockup: HT「Preload」+ v16（旗幟） | 1.5 | T-031 | P0 | |
| T-035 | 主頁：左上資訊、三粒細掣嘅狀態、版本號、`fitText`；高身手機：左上資訊同版本號入「貼頂」組（FR-039）；取代暫時外殼 `TurntableShell.tsx`；`Disc` 以專輯 id 做 `key`；唱片夾同歌號跟播緊嗰首（backlog B-029、B-030） | feature | Frontend | mockup: HT「未揀歌」「播緊」 | 1.5 | T-032、T-033 | P0 | 改 |
| T-036 | 轉碟：旋鈕、刻度、♥ 位置、字母盤（連過場）、其他碟滑入、指針；**刻度弧固定、專輯平均分佈**，格數跟專輯數自動生成，字母盤打開總時間固定 0.5 秒；**碟多時字母盤嘅字母規則**（`dialShowsLetter`：18 格或以下每格都出字母；再多每 N 格先出一個、最多約 9 個，其餘出細點；揀中嗰格永遠出字母；D28） | feature | Frontend | mockup: HT 第 17 版「刻度格數」+「轉碟中」兩格 + 互動格 | 2 | T-035、T-042（U-11 ✅ 已確認） | P0 | 改；第 17 版加字母規則（一個純函數 + 細點，估算不變）；設計稿唔再阻 |
| T-037 | 歌單：`arcRows`、框線、捲動手勢、灰色行、㩒暗位收返 | feature | Frontend | mockup: HT「歌單」 | 1.5 | T-035 | P0 | 加：冇歌專輯嘅空狀態「尚未有歌曲」（D39 已確認；畫面係 HT 第 17 版「歌單（專輯未有歌）」，已確認，U-11 完成，成個任務唔受阻） |
| T-038 | 播放：`audioEngine`（按 T-011 定案）、隊列純函數（先做順序）、自動下一首、落針、碟轉、進度圈、時間；**暫停 = 唱針升起、唱臂留喺碟上面，繼續即刻續播**（FR-040；播放 store 記暫停原因）；接上 T-042 嘅唱針開場：由泊位開始播先行，唱針放低嗰刻出聲，小燈同碟之後先著、先轉 | feature | Frontend | mockup: HT 第 17 版「播緊」「暫停」+ 互動格（由歌單揀歌播） | 2 | T-011、T-037、T-042（U-11 ✅、D36 ✅ 已確認） | P0 | 改；設計稿唔再阻，仲要等 T-011（spike，測試碟未定） |
| T-039 | PWA 規則：manifest、版本注入、`updateManager`、`100dvh`、`noindex`、`robots.txt`（backlog B-021）、「請打直」、無障礙檢查 | feature | Frontend | none-required（「請打直」用 `proposal:` Functional Spec US-015） | 1.5 | T-035 | P0 | 改 |
| T-040 | E2E 工具：假 catalog + 本機媒體 server；同 mockup 嘅截圖比對；加一個高身畫面（390 × 844）驗貼頂 / 貼底 | test | QA + Frontend | mockup: HT 全部靜態格 | 1.5 | T-035 | P0 | 改 |
| T-041 | `vercel.json` 同第一次正式部署（Vercel project 喺 U-7 已經開咗） | chore | DevOps | none-required | 0.5 | T-039、`main`（A-8） | P0 | 改 |
| T-042 | CR-003 跟進已完成嘅 code：`stage/geometry.ts`、`layouts/types.ts`、`layouts/phone.ts`（`scale.toDeg`、專輯平均分佈）；`geometry.test.ts`、`clearance.test.ts`（任何專輯數都過，掃 1 至 30 張）；`Tonearm` 三個姿勢：泊位、落針、升針（`armShape.ts`、`partsMarkup` snapshot）；**唱針開場**（第 17 版）：`parked → playing` 兩段（升高住轉入 650ms → 放低 160ms，小燈同碟轉延遲到放低之後）、`lifted ⇄ playing` 只係放低／升起（160ms）、減少動態效果直接到位；`config/motion.ts`、`tokens.css` 加 160ms 嘅 token（連兩個鎖數值嘅測試）；`StageSvg.tsx` 註解 | fix | Frontend | mockup: HT 第 17 版「刻度格數」「暫停」「播緊」+ 互動格（唱針開場） | 1.5 | T-030、T-033（U-11 ✅ 已確認） | P0 | **新**；第 17 版加唱針開場（1 → 1.5）；設計稿唔再阻，可以即刻開工 |
| T-043 | 播放端設計稿第 16 版：刻度弧固定（4、9、17、24、30 張示範）、暫停時唱針升起、歌書開住時暫停。補咗兩格（commit `7ecf24b`）：歌詞冇時間標記時嘅歌書（D38）、冇歌專輯嘅歌單（D39）。**第 17 版**（commit `3cfc327` 至 `9d0c9d6`，跟用戶幾輪意見）：純文字歌詞直身一欄連自動斷行同試排版、有時間標記嘅長行喺框入面斷行、唱針開場、碟多時字母盤嘅字母（加 18 張示範）→ 用戶確認 | docs | PM + Frontend | — | 0.5 + 0.5 | — | P0 | **新**：✅ 完成。用戶 2026-11-25 確認第 17 版（U-11；「用框入面斷行，第 17 版確認」） |

### Phase E — 管理端 UI

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 | CR-003 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-050 | **P-3 管理端 mockup**（`_mockups_/admin/index.html`）→ 用戶確認。第 1 版因為太似 903-player 被否決；第 2 版：鋁面板、螺絲、專輯以碟呈現、儀錶統計、每首歌一個文字框，冇發佈 / 發佈記錄 / 歌詞編輯畫面。D37 已確認：`副題：` 行已加（commit `82000ed`）；文字框下面嘅細控件（歌詞參考連結、備註、手動指定檔案）未畫，要補 | docs | PM + Frontend | proposal: Functional Spec P-3（CR-003 改寫） | 1.5 + 1.5 | — | P0 | 重開：第 2 版已交（commit `d60b02b`），**等用戶確認（U-8）** |
| T-051 | 管理端 scaffold：登入、外框（鋁面板、螺絲）、共用元件（金屬掣、儀錶、碟）、i18n；只做淺色。903-player 只移植行為，外觀按 AD 重做 | feature | Frontend | mockup: AD（確認之後） | 2.5 | T-050 確認、T-021 | P0 | 改（1.5 → 2.5） |
| T-052 | 專輯列表（碟 + 儀錶統計 + 拖動排序）、專輯資料、封面裁切、專輯色。冇上架掣、冇發佈掣 | feature | Frontend | 同上 | 2 | T-051、T-022、T-024 | P0 | 改 |
| T-053 | 歌曲表、就地展開、歌曲文字框（即時逐行檢查、未儲存提示、清走歌詞要確認）、參考欄同手動指定檔案、刪除（ID 守衛確認）、掃描面板 | feature | Frontend | 同上 | 2.5 | T-052、T-023、T-025、T-029 | P0 | 改（2 → 2.5；吸收 T-081） |
| T-054 | ~~發佈面板：變更摘要、警告、記錄~~ | — | — | — | 0 | — | — | **取消**（決定 7） |

### Phase F — MV 同系統整合

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 | CR-003 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-060 | MV 電視：機身、升起 / 開機 / 熄機 / 收埋過場、▶ ❚❚ ■、收返後唔自動續播（唱臂喺泊位）；`videoEngine`；高身手機嘅擺位 | feature | Frontend | mockup: HT「MV 電視」「MV 收返之後」 | 2.5 | T-038 | P1 | |
| T-061 | 電視旋鈕：音量（特徵檢測 → Web Audio → 靜音開關）、快轉 / 倒轉 | feature | Frontend | mockup: HT「MV 電視」 | 1.5 | T-060、T-011 | P1 | |
| T-062 | Media Session（鎖屏 / 耳機）同續播（記住碟、歌、位置） | feature | Frontend | none-required | 1 | T-038 | P1 | |

### Phase G — 收藏、播放模式、歌書

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 | CR-003 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-070 | 收藏：本機 store、心形掣、虛擬專輯 `favouritesAlbum`、♥ 入口、碟面、Favourites 歌單（連空狀態） | feature | Frontend | mockup: HT「Favourites 碟」三格 | 2 | T-038 | P1 | |
| T-071 | 播放模式：隊列四個模式、模式掣 | feature | Frontend | mockup: HT 播放模式放大圖 | 1 | T-038 | P1 | |
| T-072 | 歌書：暗層、曲詞編監、開收過場（歌詞行先留空）；**歌書開住時暫停，歌書留住**；㩒暗位收返 | feature | Frontend | mockup: HT 第 17 版「歌書（㩒 i）」+ 互動格（歌書開住時暫停） | 1 | T-038（U-11 ✅ 已確認） | P1 | 改；設計稿唔再阻 |

### Phase H — 歌詞

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 | CR-003 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-080 | ~~歌詞 API：儲存、驗證、清除、發佈時出歌詞 JSON~~ | — | — | — | 0 | — | — | **取消**（併入 T-023） |
| T-081 | ~~歌詞編輯器（即時逐行驗證、參考連結）~~ | — | — | — | 0 | — | — | **取消**（併入 T-053） |
| T-082 | 歌書歌詞，兩個版面（設計稿第 17 版）。① 有時間標記：`activeLine`、弧線行；而家嗰行太長先縮字（44 → 32），仍然放唔落就喺框入面斷行、框線跟住變高；其他行各佔一列，放唔落嘅部分喺右邊淡出；唱到下一行成組沿弧線移動（D22 第 17 版修訂：冇跑馬燈）。② 冇時間標記（D32；D38 第 17 版修訂）：成份歌詞一次過顯示嘅直身一欄，冇框線、冇 highlight；自動斷行（共用純函數 `wrapLine`：優先喺空格位斷、續行縮入一個字）；放唔晒上下捲，頂底淡出；播放／暫停唔影響位置。試排版唔做（只係設計輔助） | feature | Frontend | mockup: HT 第 17 版「歌書（㩒 i）」「歌書（歌詞冇時間標記）」+「歌詞冇時間標記：試排版」兩格（已確認） | 2.5 | T-072、T-029 | P1 | 改（1.5 → 2；第 17 版兩個歌詞版面再 → 2.5）；D32 ✅ 已確認，D22、D38 喺第 17 版修訂（✅ 2026-11-25）；設計稿唔再阻 |
| T-083 | 批量匯入 `.lrc`（只取代歌詞部分）、由同名歌帶入（曲詞編監同／或歌詞）、展開行播音檔並顯示而家時間 | feature | Frontend + Backend | mockup: AD（要補呢幾個控件） | 1.5 | T-053、T-023（D34 ✅ 已確認） | P1 | 改（2 → 1.5） |

### Phase I–K — 其他裝置

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 | CR-003 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-090、T-092、T-094 | P-7 mockup：iPhone Duo、HomeView、電腦（各一份，逐份確認） | docs | PM + Frontend | proposal: Functional Spec P-7 | 各 1 | Phase D 完成 | P1 | |
| T-091、T-093、T-095 | 各裝置幾何資料表 + 版面判斷；淨空測試照跑；截圖比對證明現有裝置零改變 | feature | Frontend | mockup: 對應嗰份（確認之後） | 各 2 | 對應 mockup、T-040 | P1 | |

Phase L（P2 項目）而家唔拆。

---

## 可以由 903-player 移植嘅檔案

| 用途 | 來源（`dcwhung/903-player`） | 用喺 |
| --- | --- | --- |
| Monorepo 設定 | 根目錄 `package.json`、`eslint.config.js`、`.prettierrc.json`、`vitest.config.ts`、`tsconfig.json` | T-001 |
| CI | `.github/workflows/ci.yml`、`deploy-api.yml`；`vercel.json` | T-001、T-028、T-041 |
| 認證 | `apps/api/src/auth/{google,oauthState,session,middleware,routes,deniedPage}.ts`、`src/lib/{crypto,env}.ts` | T-021 |
| 圖片 | `apps/api/src/assets/{webp,png,imageName,storedImage,routes}.ts` | T-024 |
| Catalog 生成同對外 | `apps/api/src/catalog/{serve,store}.ts`；`publish.ts` 只參考砌 document 嗰部分。CR-003：`warnings.ts` 同發佈記錄唔再用 | T-026 |
| Worker 測試 | `apps/api/test/{applyMigrations,helpers,fixtures}.ts`、`vitest.config.ts` | T-020 |
| 管理端元件 | `apps/admin/src/ui/`（`ImageSlot`、`CropEditor`、`SortableList`、`Toast`、`ConfirmDialog`）。CR-003：**只移植行為**，外觀按 AD 重做；`SegmentedTabs`、`SaveBar` 用唔用睇 AD | T-051–T-053 |
| i18n | `apps/admin/src/i18n/{t.ts,writtenChinese.test.ts}` | T-030、T-051 |
| PWA | `apps/player/src/pwa/updateManager.ts`、`src/config/appVersion.ts` | T-039 |

播放端場景元件冇得移植：由 `_mockups_/home-turntable/src/template.html` 嘅常數同繪圖函數改寫（`metal()`、`discArt()`、`spindle()`、`tonearm()`、`knob()`、`dialRing()`、`booklet()`、`listLayer()`、`tvSet()`）。管理端嘅鋁面板、螺絲、碟、儀錶由 `_mockups_/admin/src/template.html` 改寫。

---

## 風險登記

| 編號 | 風險 | 可能性 | 影響 | 應對 | 負責 |
| --- | --- | --- | --- | --- | --- |
| R-001 | iOS 上「㩒 play 後 1.5 秒先出聲」解鎖唔成功 | 中 | 高 | Phase B 第一項驗證；退路：落針動畫縮短到手勢容許範圍，或者即刻靜音播、落針時取消靜音 | Frontend |
| R-002 | 鎖屏下自動下一首失敗 | 中 | 高 | 同一個 `<audio>` 換 `src`；唱片唔經 Web Audio；Phase B 驗證 | Frontend |
| R-003 | iPhone MV 音量旋鈕做唔到 | 中 | 中 | 退做靜音開關（spec 已容許） | Frontend |
| R-004 | 旗幟或者模糊濾鏡 fps 唔夠 | 中 | 中 | 降網格密度、限 DPR；模糊改用預先模糊嘅靜態圖 | Frontend |
| R-005 | SVG 濾鏡（金屬紋、內陰影、落影）喺 iOS Safari 表現同 Chromium 有出入；單一 SVG 入面轉碟嘅 fps 未知（backlog B-032） | 中 | 中 | T-033 已完成：出一個真機預覽，順手量轉碟時嘅 fps；有出入就改用預先生成嘅貼圖，或者將隻碟抽出嚟做獨立一層 | Frontend |
| R-006 | 用戶 dashboard 設定未做，部署任務卡住 | 中 | 中 | 所有開發同測試都可以喺本機模擬環境完成；只有 T-010、T-028、T-041 同真機測試受阻 | 用戶 / DevOps |
| R-007 | 呢個雲端 session 只可以 push 去 `claude/charming-cannon-8yulp0`；repo 未有 `main` | 高（已存在） | 低 | 用戶已定（決定 12，A-1）：全部留喺呢條 branch，第一個可用版本由用戶開 PR 入 `main`。每個任務一組 commit，review 同 QA 照做 | Main agent |
| R-008 | 管理端設計稿第 2 版、P-7 mockup 確認需要多輪 | 中 | 中 | Phase C、D、F、G 都唔受佢哋阻；mockup 同開發並行 | PM |
| R-009 | Mockup 用 Rokkitt 量字闊，真機有 Lubalin Graph 時字闊唔同 | 高 | 低 | 版面以 Rokkitt 做準；E2E 兩隻字都影 | QA |
| R-010 | 真實媒體檔名（中文、空格、符號）令配對或者網址出錯 | 中 | 中 | `matchMediaFiles` 同砌網址嘅測試用真實檔名；用戶上載第一張碟之後即刻跑掃描 | Backend |
| R-011 | CR-003：儲存即生效而且冇版本記錄，儲存錯咗喺介面冇得還原（Functional Spec R-14） | 中 | 中 | 人手儲存、逐行驗證、清走成段歌詞同刪除要再確認（D30）；T-028 確認 D1 嘅時間點還原並寫入操作清單 | Backend / DevOps |
| R-012 | CR-003：管理端用自己嘅視覺語言，共用元件要重做（Functional Spec R-15） | 中 | 中（進度） | 行為照樣移植；T-051 已加 1 人日；金屬零件係咪同播放端共用，設計稿第 2 版確認之後定 | Frontend |
| R-013 | CR-003：T-029、T-042、T-096 會改到已凍結嘅 QA 鏈（`catalog-core`、`player-foundation`、`api-auth`）入面嘅檔 | 高（已確定） | 低 | 按 validation gate 只重驗有改動嘅部分；QA 欄已加 1 人日 | QA |
| R-014 | ~~CR-003：D30–D39 未確認，Backend 線喺 T-029、T-023、T-026 卡住；D32 會推翻已確認嘅 C4，可能唔被接受~~ **已解除（2026-11-25）**：用戶確認 D30、D31、D32、D34、D36–D39，D32 取代 C4 | — | — | 淨返 D35（統計項目）等 U-8：T-022 照建議做，設計稿第 2 版確認時有改就跟住調 API-010（細改） | PM / Backend |

---

## 依賴關係

### 內部依賴

```
T-001 ─┬─ T-002 ─┬─ T-029 ──────────┐
       │         │                  ▼
       │         ├─ T-022 ───────► T-023 → T-025 ─┐
       │         │     └ T-024 ───────────────────┴ T-026 → T-027 → T-028
       │         └─ T-031 → T-034
       ├─ T-020 ─┬─ T-096 → T-022
       │         └─ T-021 ─────────── T-051 → T-052 → T-053 → T-083
       ├─ T-030 → T-032 ─┐
       │        └ T-033 ─┴ T-035 ─┬─ T-036（要 T-042）
       │                          ├─ T-037 ─┐
       │                          ├─ T-039 → T-041
       │                          └─ T-040
       └─ T-010 → T-011 ───────────────────┴ T-038（要 T-042）─┬─ T-060 → T-061
                                                              ├─ T-062
                                                              ├─ T-070、T-071
                                                              └─ T-072 → T-082（要 T-029）
T-043（播放端設計稿第 17 版，U-11 ✅ 2026-11-25 已確認）→ T-042 → T-036、T-038；T-043 → T-072、T-082
T-050（管理端設計稿第 2 版，U-8）→ T-051
T-023、T-025、T-029 → T-053
```

可以並行嘅三條線：**Backend**（T-024、T-025 起；T-096、T-022、T-029、T-023 已完成）、**播放端**（T-042、T-034、T-035 起）、**Mockup 確認**（U-8；U-11 已完成）。佢哋只共用 `packages/catalog`。

### 外部依賴（要用戶做）

| 編號 | 事項 | 影響任務 | 幾時要 |
| --- | --- | --- | --- |
| U-1 | R2 開 `r-gram-media`（公開存取 + CORS 容許 `GET`、`HEAD`、`Range`，origin 包埋 Vercel 網址），上載一張碟嘅測試檔：2–3 首歌（`.m4a` 或 `.mp3`）+ 1 個 MV（`.mp4`，fast start），檔名以歌號開頭。**用邊張碟未定（決定 14）** | T-010、T-025 | Phase B 開始前 |
| U-2 | 用 iPhone 開 spike 網址，照清單逐項試（約 15 分鐘） | T-011 | T-010 完成後 |
| U-3 | R2 開 `r-gram-catalog`（private）；D1 開 `r-gram` | T-028 | Phase C 尾 |
| U-4 | Google Cloud 開 OAuth client | T-028 | 同上 |
| U-5 | Worker secret：`GOOGLE_CLIENT_SECRET`、`SESSION_SECRET` | T-028 | 同上 |
| U-6 | GitHub secret：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID` | T-028 | 同上 |
| U-7 | Vercel 開 project 連 repo（`VITE_CATALOG_URL` 可以到 T-041 先設）。**決定 13：提前到 T-010 之前**，spike 頁放喺度；用邊條 branch 部署見 A-7 | T-010、T-041 | **Phase B 開始前**（之前係 Phase D 尾） |
| U-8 | 確認管理端設計稿第 2 版（`_mockups_/admin/`，commit `d60b02b`；`副題：` 行 commit `82000ed`），連統計項目（Functional Spec D35） | T-051 起 | 而家（已出稿） |
| U-9 | 確認 P-7 各裝置 mockup | Phase I–K | 各自出稿後 |
| U-10 | 高清 / 向量 RubberBand logo（冇就用現有圖） | T-034、T-070 | 唔阻開發 |
| U-11 | ~~確認播放端設計稿第 16 版（`_mockups_/home-turntable/`，commit `e6f367c`；補兩格 commit `7ecf24b`：歌詞冇時間標記時嘅歌書、冇歌專輯嘅歌單）~~ ✅ **2026-11-25 完成**：用戶睇過第 16、17 版，答「用框入面斷行，第 17 版確認」。第 17 版（commit `3cfc327` 至 `9d0c9d6`）係播放端嘅 Design Source，包埋第 16 版嘅內容 | 已解除：T-036、T-042、T-072；T-037 嘅空狀態、T-082 嘅歌詞版面；T-038 嘅設計稿部分（T-038 仲要等 T-011） | 完成 |
| U-12 | ~~確認 Functional Spec D30–D39~~ ✅ **2026-11-25 完成**：用戶答「嗰 8 條跟建議」，D30、D31、D32、D34、D36–D39 已確認（D33 係技術決定；D35 轉去 U-8）。本文件 A-7、A-8 唔喺嗰八條問題入面，仍然係建議，要另外問（見開放問題） | 已解除：T-029、T-096、T-022、T-023、T-026；D36：T-038；D38：T-082。仍然等：A-7（T-010）、A-8（T-028、T-041） | D30–D39：完成；A-7、A-8：Phase B 前 |

---

## 工作量估算

單位：理想人日（粗略；已包自測，未包 review 同 QA 嗰兩欄以外嘅來回）。括號係 v1.0 嘅數。2026-11-25 設計稿第 17 版補充之後：Phase D 前端 18 → 19、Phase H 前端 3 → 3.5，總計 80.5 → 82。

| Phase | 前端 | 後端 | DevOps | QA + Review | 總計 |
| --- | --- | --- | --- | --- | --- |
| A 基礎 | — | 2 | 1 | 0.5 | 3.5 |
| B 真機 spike | 2 | — | — | — | 2 |
| C Backend API | — | 10.5（9） | 0.5 | 2.5（2） | 13.5（11.5） |
| D 播放端核心 | 19（16.5） | — | 0.5 | 5.5（5；包 T-040） | 25（22） |
| E 管理端 UI | 10（8） | — | — | 1.5 | 11.5（9.5） |
| F MV 同系統整合 | 5 | — | — | 1 | 6 |
| G 收藏、模式、歌書 | 4 | — | — | 1 | 5 |
| H 歌詞 | 3.5（4） | 0.5（2） | — | 1 | 5（7） |
| I–K 其他裝置 | 9 | — | — | 1.5 | 10.5 |
| **總計** | **52.5（48.5）** | **13** | **2** | **14.5（13.5）** | **82（77）** |

Phase L 未計。

CR-003 嘅增減：

| 項目 | 人日 |
| --- | --- |
| 取消 T-054、T-080、T-081；T-026 簡化 | −1、−1、−1.5、−0.5 |
| T-083 範圍收窄 | −0.5 |
| T-050 第 2 版（已做）、T-051、T-053 | +1.5、+1、+0.5 |
| T-029、T-096、T-023 | +1、+0.5、+0.5 |
| T-042、T-043（已做）、T-082 | +1、+0.5、+0.5 |
| QA + Review（重驗已凍結嘅鏈、新任務） | +1 |
| **淨增（CR-003，v1.1）** | **+3.5** |
| 設計稿第 17 版補充（2026-11-25）：T-043 第 17 版（已做）、T-042 加唱針開場、T-082 兩個歌詞版面 | +0.5、+0.5、+0.5 |
| **合共（77 → 82）** | **+5** |

第 17 版嘅其餘內容唔改估算：T-036 嘅字母規則係一個純函數加細點（留喺 2 人日）；T-038、T-072 嘅範圍冇變。

---

## 建議開始順序

Step 1（T-001、T-002）同 Step 2 嘅頭一段（T-020、T-021、T-030、T-031、T-032、T-033）已完成；D30–D39 已確認（U-12）；T-096、T-029、T-022、T-023 已完成；播放端設計稿第 17 版已確認（U-11）。由而家開始：

```
而家   → 用戶確認：管理端設計稿第 2 版連 D35（U-8）、A-7、A-8；
         定 spike 測試碟（決定 14）；開 Vercel（U-7）同上載測試媒體（U-1）
並行   → Backend（唔使等確認）：T-024、T-025 → T-026 → T-027
         播放端（唔使等確認）：T-042（U-11 已完成，可以即刻做）；T-034、T-035 → T-036（要 T-042）、
         T-037、T-039、T-040
         Spike ：T-010（要 U-1、U-7、測試碟）→ 用戶真機試（U-2）→ T-011
之後   → T-038 播放（要 T-011、T-042）→ 第一個可用版本：用戶開 PR 入 main（A-8）→ T-028、T-041 第一次部署
再之後 → Phase E 管理端（U-8 確認後；要 T-023、T-025、T-029）同 Phase F、G 並行
最後   → Phase H 歌詞 → Phase I–K 其他裝置
```

每個任務照團隊流程：TDD → Code Reviewer → QA，通過先做下一個依賴佢嘅任務。

---

## 假設及前提

| 編號 | 假設 |
| --- | --- |
| A-1 | **Branch**（✅ 用戶 2026-11-25 確認，決定 12）：全部任務喺 `claude/charming-cannon-8yulp0` 做，每個任務一組 conventional commit；第一個可用版本由用戶開 PR 入 `main` |
| A-2 | 版本同工具跟 903-player 現用版本（Technical Spec Tech Stack 表） |
| A-3 | Phase B 嘅 spike 頁放喺 Vercel（✅ 用戶 2026-11-25 確認，決定 13；U-7 提前） |
| A-4 | 開發期間播放端用 fixture catalog 同本機模擬媒體，唔等真 Backend 部署 |
| A-5 | Dashboard 設定由你做；我提供逐步清單同要填嘅值 |
| A-6 | **分工**（用戶 2026-11-25 指示）：mockup 確認之後，developer、reviewer、QA 嘅 subagent 用 Opus 跑；主 session 只做協調 |
| A-7 | **待用戶確認**（唔喺 2026-11-25 嗰八條問題入面，仍然係建議）：未有 `main` 之前，Vercel project 嘅 Production Branch 暫時設做 `claude/charming-cannon-8yulp0`，spike 頁由呢條 branch 部署；`main` 開咗之後改返 `main`。理由：Technical Spec 定咗只部署 production branch，而 `main` 要到第一個可用版本先有 |
| A-8 | **待用戶確認**（唔喺 2026-11-25 嗰八條問題入面，仍然係建議）：「第一個可用版本」= Phase C + D 完成（管理端 API 有齊、手機上播到歌）。T-028（Worker）同 T-041（播放端）嘅第一次正式部署喺 PR 合併入 `main` 之後做；之前只用本機環境同 spike 網址 |

---

## 開放問題

| 問題 | 影響任務 | 邊個決定 | 幾時要 |
| --- | --- | --- | --- |
| ~~Branch 模式照 A-1，定係准我開 `main` 同 `feature/` branch？~~ | 全部 | 用戶 | ✅ 2026-11-25：照 A-1（決定 12） |
| ~~Spike 頁放邊度（A-3）？~~ | T-010 | 用戶 | ✅ 2026-11-25：Vercel（決定 13） |
| 測試媒體用邊張碟？ | T-010、T-011、T-038（只阻呢三個） | 用戶 | Phase B 前。**未定（決定 14）** |
| ~~歌書入面㩒唱片夾暫停，歌書應唔應該留住？~~ | T-072 | 用戶 | ✅ 2026-11-25：留住（決定 5） |
| ~~Functional Spec D30–D39 接唔接受？~~ | T-029、T-023、T-026、T-096、T-038、T-082、T-083 | 用戶 | ✅ 2026-11-25：D30、D31、D32、D34、D36–D39 照建議接受（U-12；D32 取代 C4）。D33 係技術決定；D35 見下一行 |
| Functional Spec D35（統計項目）接唔接受？ | T-022（API-010 嘅統計欄，照建議先做）、T-052 | 用戶 | 同管理端設計稿第 2 版一齊（U-8） |
| A-7（Vercel 暫時用 session branch 部署）、A-8（第一個可用版本 = Phase C + D）接唔接受？（2026-11-25 嗰八條問題冇包，仍然未答） | T-010、T-028、T-041 | 用戶 | Phase B 前 |
| ~~播放端設計稿第 16 版確認~~ | T-036、T-038、T-042、T-072 | 用戶 | ✅ 2026-11-25：第 17 版已確認（U-11；包埋第 16 版嘅內容） |
| 管理端設計稿第 2 版確認（連 D35） | Phase E | 用戶 | U-8 |
| 歌書歌詞嘅兩個細節：① 同一首歌入面長短行交替時，弧線版面（`ARC`）同長行版面（`LONG`）點過渡；② 高身手機上純文字歌詞欄嘅頂底跟邊一組（建議：頂跟貼頂組、底跟貼底組） | T-082 | Frontend 照設計稿第 17 版定案（用戶知情；睇到同設計稿有出入就問返） | T-082 開工時 |
| 管理端要唔要同播放端共用金屬 SVG 零件（車床紋、螺絲、金屬掣；抽去一個共用 package），定係各自一份？ | T-051 | Architect（用戶知情） | 管理端設計稿第 2 版確認之後 |

---

## 驗證

| 層 | 做法 |
| --- | --- |
| 每個任務 | `npm run lint`、`npm test`、相關 `npm run build`；Code Reviewer 報告；QA 按階段驗收 |
| Phase A | Fixture catalog 通過 `parseCatalogDocument()`；`matchCredits` 結果 = 187 直接配對 / 22 同名配對 / 53 冇資料 |
| Phase C | Worker 測試喺 workerd 跑；本機 `wrangler dev` + seed 後用 `curl` 讀 `/catalog/v1/catalog.json`（17 張專輯、262 首歌全部喺度）；改一首歌嘅文字再讀一次，內容同 ETag 已變；`parseSongText(formatSongText(x))` round-trip |
| Phase D 起 | Playwright E2E（假 catalog + 本機媒體）；同 mockup 截圖比對（連高身畫面）；淨空規則測試（掃 1 至 30 張專輯） |
| CR-003 跟進 | T-029、T-042、T-096 改到已凍結嘅 QA 鏈：按 validation gate 重驗有改動嘅檔 |
| 真機 | Phase B 清單；之後每個 Phase 完成有一張真機檢查表（安裝、鎖屏、自動更新） |

---

## 修訂記錄

| 版本 | 日期 | 改動 |
| --- | --- | --- |
| v1.0 | 2026-11-25 00:07 | 初稿；用戶批准 |
| v1.1 | 2026-11-25 08:06 | **CR-003**（Functional Spec v1.4、Technical Spec v1.2）。取消 T-054、T-080、T-081；改 T-010、T-022、T-023、T-026、T-027、T-028、T-035、T-036、T-038、T-039、T-040、T-041、T-051–T-053、T-072、T-082、T-083；T-050 重開（管理端設計稿第 2 版已交，等確認）；新增 T-029、T-042、T-043（已交，等確認）、T-096。U-7 提前；加 U-11、U-12；A-1、A-3 確認；加 A-6（subagent 用 Opus）、A-7、A-8（待確認）；加 R-011–R-014；開放問題關閉三條、加四條；工作量 77 → 80.5；加進度表 |
| v1.1（確認） | 2026-11-25 | **2026-11-25：D30–D39 確認**（CR-003 之內嘅狀態更新，唔係新 CR；版本號、任務編號、工作量不變）。U-12 完成：T-029、T-096、T-022、T-023、T-026 唔再受阻；T-038（D36）、T-082（D32、D38）、T-083（D34）對應嘅決定已確認。仍然受阻：T-036、T-038、T-042、T-072（U-11）同 Phase E（U-8）。D35 轉去同 U-8 一齊確認；A-7、A-8、測試碟仍然未定。R-014 解除。進度：T-031、T-032、T-033 完成（review 同 QA S1 都過）。設計稿：T-043 補咗兩格（commit `7ecf24b`：純文字歌詞嘅歌書 D38、冇歌專輯嘅歌單 D39），一齊等 U-11；T-050 加咗 `副題：` 行（commit `82000ed`）。D39 嘅空狀態落點寫入 T-037（嗰部分要 U-11） |
| v1.1（第 17 版確認） | 2026-11-25 | **2026-11-25：播放端設計稿第 17 版確認**（CR-003 之內嘅補充，唔係新 CR；版本號、任務編號不變）。**U-11 完成**：用戶答「用框入面斷行，第 17 版確認」，第 17 版係播放端嘅 Design Source。播放端設計稿唔再阻任何任務：T-042 可以即刻開工；T-036 排喺 T-035、T-042 之後；T-037 嘅空狀態、T-072、T-082 嘅畫面已確認；T-038 仍然等 spike（T-011）同測試碟。Mockup Binding：T-036、T-038、T-042、T-072、T-082 改為「HT 第 17 版」。範圍：T-042 加唱針開場（1 → 1.5）；T-082 做兩個歌詞版面（純文字直身一欄連自動斷行同上下捲；有時間標記嘅長行喺框入面斷行，冇跑馬燈）（2 → 2.5）；T-036 加字母規則（估算不變）；T-043 加第 17 版（0.5 → 0.5 + 0.5，已做）；T-038 接上唱針開場（估算不變）。工作量 80.5 → 82。進度：T-022 完成（review 85 → re-review 100，QA S1 pass）；T-029、T-096 完成（review 95，QA S1 pass）；T-023 完成（review 95 / 100；QA S1 pass：`qa/2026-11-25_11-32_qa_api-tracks.md`，寫呢次更新期間交咗）；T-043 完成。開放問題：播放端設計稿一條關閉，加 T-082 兩個細節。仍然等用戶：U-8（管理端設計稿第 2 版連 D35）、A-7、A-8、spike 測試碟 |
