# Implementation Plan：R Gram（播放端 PWA + 內容管理 Backend）

**版本**：v1.0
**日期**：2026-11-25 00:07
**狀態**：Approved（用戶 2026-11-25 批准）
**關聯 Spec**：Functional Spec v1.3（CR-001、CR-002，用戶 2026-11-25 全部確認）；Technical Spec v1.1
**負責人**：Project Manager + Architect Agent

## Context

用戶已確認播放端全部場景（mockup 第 15 版）同兩份 spec（D22–D29 全部接受）。Repo 而家只有文件、資料同 mockup，未有任何 app code。呢份 plan 將 spec 拆成可以逐個 branch 交付嘅任務，定出先後、依賴同要用戶做嘅事。

Functional Spec 原本嘅分期（M0–M9）係 CR-002 之前寫嘅，有三處要調整：

| 原分期 | 調整 | 原因 |
| --- | --- | --- |
| M4、M5 寫住「mockup 確認後」 | 播放端部分已解鎖 | 收藏、播放模式、歌書已喺 mockup 確認 |
| M5 有獨立歌詞畫面同 Info | 改為「歌書」：曲詞編監唔使等歌詞，提前做 | CR-002 合併咗歌詞同 Info |
| 冇 scaffold 一期 | 加 Phase A | Repo 係空嘅 |

---

## 可行性評估

### 技術可行性

| 項目 | 評估 | 備注 |
| --- | --- | --- |
| 技術棧支持 | ✅ | 全部同 `dcwhung/903-player` 現用版本一樣；Backend 大部分模組可以直接移植 |
| 播放端繪圖（SVG + CSS） | ✅ | Mockup 已經用同一套做法畫晒全部場景同過場，幾何常數可以直接抄入資料表 |
| 第三方依賴 | ⚠️ | Cloudflare（Worker、D1、R2）、Google OAuth、Vercel 都要用戶喺 dashboard 開；我喺呢個 session 試過 Cloudflare API，回「Invalid access token」，所以唔可以當我代開 |
| iOS 播放限制 | ⚠️ | 手勢解鎖、背景自動下一首、MV 音量，三樣都要真機驗證（Phase B）；結果會決定 `audioEngine` 介面 |
| 性能要求 | ⚠️ | 旗幟 canvas 同模糊濾鏡喺舊 iPhone 嘅 fps 未知（Phase B 量度；有降級方案） |
| 安全要求 | ✅ | 認證、session、CORS 做法沿用 903-player；媒體公開網址係用戶已接受嘅決定（R-1） |

**總體可行性**：⚠️ 有條件可行

**條件**：① 用戶完成 dashboard 設定同上載測試媒體；② Phase B 真機結果冇推翻 `<audio>` 單一 element 嘅做法（有退路：見風險 R-001）。

### 其他維度

| 維度 | 評估 |
| --- | --- |
| 時間 | 約 77 個理想人日（見工作量；Phase A–D 即係「手機上播到歌」約 39）。播放端核心（Phase D）最大，因為要將 mockup 逐個場景變成有狀態嘅元件 |
| 資源 | 前端（SVG / CSS 動畫、PWA、iOS 媒體）、Cloudflare Worker、CI；全部喺團隊 agent 能力範圍 |
| 未知因素 | 只有 Phase B 嗰三項 iOS 行為同兩項 fps |

---

## 階段劃分

| Phase | 名稱 | 目標 | 對應 FR | 完成標準 | 阻塞 |
| --- | --- | --- | --- | --- | --- |
| A | 基礎 | Monorepo、共用邏輯、CI | — | `npm run lint`、`npm test`、`npm run build` 全綠；`packages/catalog` 覆蓋率 ≥ 80%；用現有 `discography.json` + `credits.json` 生成嘅 fixture catalog 通過 validator | 冇 |
| B | 真機 spike（M0） | 驗證 iOS 播放、MV 音量、fps | R-5、R-6、R-8 | 一份 spike 報告：五項各有「得 / 唔得 + 採用做法」；`audioEngine` 介面定案 | 用戶：測試媒體、HTTPS 網址、iPhone |
| C | Backend API（M1） | 登入、專輯 / 歌 CRUD、封面、掃描、發佈、對外 catalog、seed | FR-101–105、107–109、113、117、118 | Worker 測試全綠；本機 seed 後 `GET /catalog/v1/catalog.json` 出到 17 張專輯、262 首歌並通過 validator | 部署要用戶 dashboard 設定 |
| D | 播放端核心（M2） | 手機直度：Preload、主頁、轉碟、歌單、播放、自動下一首、PWA、i18n | FR-001–011、018、025、031、032、034–038（字母盤） | E2E 行通「開 app → 轉碟 → 揀歌 → 播 → 自動下一首」；淨空規則測試全綠；同 mockup 截圖比對喺容許誤差內；真機安裝得 | B 嘅結論（只阻 T-038） |
| E | 管理端 UI | 管理介面 | 同 C | 管理端 E2E：登入 → 改專輯 → 上載封面 → 掃描 → 發佈 | **P-3 mockup 要用戶確認** |
| F | MV 同系統整合（M3） | MV 電視、鎖屏控制、續播 | FR-012、014、015、026、038（電視） | E2E：播歌 → MV → 熄機 → 人手續播；真機鎖屏控制得 | D |
| G | 收藏、播放模式、歌書（M4） | 心形、Favourites 碟、四個模式、歌書（曲詞編監） | FR-016、023、024、030、033（credit）、038（歌書） | 隊列純函數測試覆蓋四個模式；收藏重開 app 仍然喺度 | D |
| H | 歌詞（M5） | LRC 編輯同驗證、歌書同步歌詞 | FR-106、110–112、119、033（歌詞）、036 | 貼入 LRC → 發佈 → 播放端歌書跟住歌行 | E（歌詞編輯器畫面） |
| I | iPhone Duo（M6） | 版面 | FR-027 | 截圖比對：手機版零改變 | **P-7 mockup** |
| J | HomeView（M7） | 版面 | FR-028 | 同上 | **P-7 mockup** |
| K | 電腦（M8） | 版面 | FR-029 | 同上 | **P-7 mockup** |
| L | P2 項目（M9） | 手勢開轉碟、拖動進度、歌詞跳句、對時工具、還原發佈 | FR-019–021、115、116 | 到時再拆 | 部分要先出 mockup |

---

## 任務分解

Mockup Binding 縮寫：**HT** = `_mockups_/home-turntable/index.html`（source：`src/template.html`，第 15 版，已確認）；**v16** = `_mockups_/r-gram/index.html`（只用旗幟同金屬質感）。

### Phase A — 基礎

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-001 | Monorepo scaffold：workspaces、TypeScript、ESLint、Prettier、Vitest projects、`.gitignore`、project `CLAUDE.md`（QA chain、指令、branch 模式）；`data/` 搬去 `apps/api/seed/`；`ci.yml` | chore | DevOps + Architect | none-required | 1 | — | P0 |
| T-002 | `packages/catalog`：catalog 型別同 validator（連 credit）、`wheelKeyFor`、`dominantColor` / `glowColor`、LRC parser、`matchMediaFiles`、`matchCredits`；由 seed 資料生成 fixture catalog | feature | Backend | none-required | 2 | T-001 | P0 |

### Phase B — 真機 spike

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-010 | Spike 頁（用完即棄，唔入產品）：① 手勢入面靜音解鎖、1.5 秒後出聲 ② 鎖屏下同一個 `<audio>` 自動下一首 ③ Media Session ④ `<video>` 經 Web Audio 調音量（連 CORS）⑤ 旗幟 canvas 同模糊濾鏡 fps。每項畫面上顯示結果 | chore | Frontend | none-required | 1.5 | T-001、用戶 U-1、U-2 | P0 |
| T-011 | Spike 報告（`.proj-docs/`）同 `audioEngine` 介面定案 | docs | Architect | none-required | 0.5 | T-010、用戶真機測試 | P0 |

### Phase C — Backend API

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-020 | Worker scaffold：Hono、`wrangler.toml`、env 驗證、D1 migration（6 張表）、workerd 測試環境、health | chore | Backend | none-required | 1 | T-001 | P0 |
| T-021 | 認證：Google OAuth（PKCE）、email 白名單、session cookie、middleware、登出 | feature | Backend | none-required | 1 | T-020 | P0 |
| T-022 | 專輯 API：CRUD、排序、上下架、完整度統計 | feature | Backend | none-required | 1 | T-020、T-002 | P0 |
| T-023 | 歌曲 API：CRUD、排序、上下架、credit 欄、由同名歌複製 credit | feature | Backend | none-required | 1.5 | T-022 | P0 |
| T-024 | 封面：上載、驗證、兩個尺寸 WebP、hash 檔名、抽專輯色 | feature | Backend | none-required | 1 | T-022 | P0 |
| T-025 | 掃描 R2：list / head、配對、衝突、手動指定 | feature | Backend | none-required | 1 | T-023 | P0 |
| T-026 | 發佈：草稿 → `catalog.json`、警告、ID 守衛、發佈記錄；對外 `/catalog/v1/*`（ETag、CORS 限播放端網域） | feature | Backend | none-required | 1.5 | T-023、T-024 | P0 |
| T-027 | Seed script：歌單 + credit + 下載封面，可重複執行 | feature | Backend | none-required | 1 | T-022–T-024 | P0 |
| T-028 | `deploy-api.yml` 同第一次部署 | chore | DevOps | none-required | 0.5 | T-026、用戶 U-3–U-6 | P0 |

### Phase D — 播放端核心（手機直度）

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-030 | 播放端 scaffold：Vite + PWA plugin；`tokens.css`、`config/motion.ts`；i18n（`zh-Hant.ts`、有型別 `t()`、書面語測試、寫死文字測試）；舞台縮放（1080 × 1920）；`layouts/phone.ts` 幾何資料表 + 淨空規則測試 | feature | Frontend | mockup: HT（常數表、量度表） | 2 | T-001 | P0 |
| T-031 | Catalog loader：fetch、驗證、本機 fallback；selectors | feature | Frontend | none-required | 1 | T-002、T-030 | P0 |
| T-032 | 場景狀態機 `stageReducer`（純函數）：`preload → home ⇄ discChange`、`home ⇄ list`、overlay `mv`｜`booklet`；每個轉換有「冇動畫」路徑 | feature | Frontend | none-required | 1 | T-030 | P0 |
| T-033 | 基本元件：金屬面、螺絲、金屬掣同 icon、轉盤、空心碟、固定唱片夾（四個狀態）、唱臂 | feature | Frontend | mockup: HT「未揀歌」「播緊」 | 2.5 | T-030 | P0 |
| T-034 | Preload：旗幟 canvas、真實載入進度、App 名 / 非官方 / 版本 | feature | Frontend | mockup: HT「Preload」+ v16（旗幟） | 1.5 | T-031 | P0 |
| T-035 | 主頁：左上資訊、三粒細掣嘅狀態、版本號、`fitText` | feature | Frontend | mockup: HT「未揀歌」「播緊」 | 1.5 | T-032、T-033 | P0 |
| T-036 | 轉碟：旋鈕、刻度、♥ 位置、字母盤（連過場）、其他碟滑入、指針；格數跟專輯數自動生成 | feature | Frontend | mockup: HT「轉碟中」兩格 + 互動格 | 2 | T-035 | P0 |
| T-037 | 歌單：`arcRows`、框線、捲動手勢、灰色行、㩒暗位收返 | feature | Frontend | mockup: HT「歌單」 | 1.5 | T-035 | P0 |
| T-038 | 播放：`audioEngine`（按 T-011 定案）、隊列純函數（先做順序）、自動下一首、落針、碟轉、進度圈、時間 | feature | Frontend | mockup: HT「播緊」 | 2 | T-011、T-037 | P0 |
| T-039 | PWA 規則：manifest、版本注入、`updateManager`、`100dvh`、`noindex`、「請打直」、無障礙檢查 | feature | Frontend | none-required（「請打直」用 `proposal:` Functional Spec US-015） | 1.5 | T-035 | P0 |
| T-040 | E2E 工具：假 catalog + 本機媒體 server；同 mockup 嘅截圖比對 | test | QA + Frontend | mockup: HT 全部靜態格 | 1.5 | T-035 | P0 |
| T-041 | `vercel.json` 同第一次部署 | chore | DevOps | none-required | 0.5 | T-039、用戶 U-7 | P0 |

### Phase E — 管理端 UI

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-050 | **P-3 管理端 mockup**（`_mockups_/admin/index.html`）→ 用戶確認 | docs | PM + Frontend | proposal: Functional Spec P-3 | 1.5 | — | P0 |
| T-051 | 管理端 scaffold：登入、外框、共用元件、i18n | feature | Frontend | mockup: `_mockups_/admin/`（T-050 之後） | 1.5 | T-050、T-021 | P0 |
| T-052 | 專輯列表、編輯、封面裁切、專輯色、完整度 | feature | Frontend | 同上 | 2 | T-051、T-024 | P0 |
| T-053 | 歌曲編輯、credit、掃描面板 | feature | Frontend | 同上 | 2 | T-052、T-025 | P0 |
| T-054 | 發佈面板：變更摘要、警告、記錄 | feature | Frontend | 同上 | 1 | T-053、T-026 | P0 |

### Phase F — MV 同系統整合

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-060 | MV 電視：機身、升起 / 開機 / 熄機 / 收埋過場、▶ ❚❚ ■、收返後唔自動續播；`videoEngine` | feature | Frontend | mockup: HT「MV 電視」「MV 收返之後」 | 2.5 | T-038 | P1 |
| T-061 | 電視旋鈕：音量（特徵檢測 → Web Audio → 靜音開關）、快轉 / 倒轉 | feature | Frontend | mockup: HT「MV 電視」 | 1.5 | T-060、T-011 | P1 |
| T-062 | Media Session（鎖屏 / 耳機）同續播（記住碟、歌、位置） | feature | Frontend | none-required | 1 | T-038 | P1 |

### Phase G — 收藏、播放模式、歌書

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-070 | 收藏：本機 store、心形掣、虛擬專輯 `favouritesAlbum`、♥ 入口、碟面、Favourites 歌單（連空狀態） | feature | Frontend | mockup: HT「Favourites 碟」三格 | 2 | T-038 | P1 |
| T-071 | 播放模式：隊列四個模式、模式掣 | feature | Frontend | mockup: HT 播放模式放大圖 | 1 | T-038 | P1 |
| T-072 | 歌書：暗層、曲詞編監、開收過場（歌詞行先留空） | feature | Frontend | mockup: HT「歌書」 | 1 | T-038 | P1 |

### Phase H — 歌詞

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-080 | 歌詞 API：儲存、驗證、清除、發佈時出歌詞 JSON | feature | Backend | none-required | 1 | T-026 | P0 |
| T-081 | 歌詞編輯器（即時逐行驗證、參考連結） | feature | Frontend | mockup: `_mockups_/admin/`（T-050 要包埋呢頁） | 1.5 | T-080、T-053 | P0 |
| T-082 | 歌書同步歌詞：`activeLine`、弧線行、超長處理（D22） | feature | Frontend | mockup: HT「歌書」 | 1.5 | T-072、T-080 | P1 |
| T-083 | 批量匯入 `.lrc`、由同名歌複製歌詞、播音檔預覽 | feature | Frontend + Backend | 同 T-081 | 2 | T-081 | P1 |

### Phase I–K — 其他裝置

| 任務 | 描述 | 類型 | Agent | Mockup Binding | 人日 | 依賴 | 優先級 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-090、T-092、T-094 | P-7 mockup：iPhone Duo、HomeView、電腦（各一份，逐份確認） | docs | PM + Frontend | proposal: Functional Spec P-7 | 各 1 | Phase D 完成 | P1 |
| T-091、T-093、T-095 | 各裝置幾何資料表 + 版面判斷；淨空測試照跑；截圖比對證明現有裝置零改變 | feature | Frontend | mockup: 對應嗰份（確認之後） | 各 2 | 對應 mockup、T-040 | P1 |

Phase L（P2 項目）而家唔拆。

---

## 可以由 903-player 移植嘅檔案

| 用途 | 來源（`dcwhung/903-player`） | 用喺 |
| --- | --- | --- |
| Monorepo 設定 | 根目錄 `package.json`、`eslint.config.js`、`.prettierrc.json`、`vitest.config.ts`、`tsconfig.json` | T-001 |
| CI | `.github/workflows/ci.yml`、`deploy-api.yml`；`vercel.json` | T-001、T-028、T-041 |
| 認證 | `apps/api/src/auth/{google,oauthState,session,middleware,routes,deniedPage}.ts`、`src/lib/{crypto,env}.ts` | T-021 |
| 圖片 | `apps/api/src/assets/{webp,png,imageName,storedImage,routes}.ts` | T-024 |
| 發佈同對外 | `apps/api/src/catalog/{publish,serve,store,warnings}.ts` | T-026 |
| Worker 測試 | `apps/api/test/{applyMigrations,helpers,fixtures}.ts`、`vitest.config.ts` | T-020 |
| 管理端元件 | `apps/admin/src/ui/`（`SegmentedTabs`、`SaveBar`、`Toast`、`ConfirmDialog`、`ImageSlot`、`CropEditor`、`SortableList`） | T-051–T-054 |
| i18n | `apps/admin/src/i18n/{t.ts,writtenChinese.test.ts}` | T-030、T-051 |
| PWA | `apps/player/src/pwa/updateManager.ts`、`src/config/appVersion.ts` | T-039 |

播放端場景元件冇得移植：由 `_mockups_/home-turntable/src/template.html` 嘅常數同繪圖函數改寫（`metal()`、`discArt()`、`spindle()`、`tonearm()`、`knob()`、`dialRing()`、`booklet()`、`listLayer()`、`tvSet()`）。

---

## 風險登記

| 編號 | 風險 | 可能性 | 影響 | 應對 | 負責 |
| --- | --- | --- | --- | --- | --- |
| R-001 | iOS 上「㩒 play 後 1.5 秒先出聲」解鎖唔成功 | 中 | 高 | Phase B 第一項驗證；退路：落針動畫縮短到手勢容許範圍，或者即刻靜音播、落針時取消靜音 | Frontend |
| R-002 | 鎖屏下自動下一首失敗 | 中 | 高 | 同一個 `<audio>` 換 `src`；唱片唔經 Web Audio；Phase B 驗證 | Frontend |
| R-003 | iPhone MV 音量旋鈕做唔到 | 中 | 中 | 退做靜音開關（spec 已容許） | Frontend |
| R-004 | 旗幟或者模糊濾鏡 fps 唔夠 | 中 | 中 | 降網格密度、限 DPR；模糊改用預先模糊嘅靜態圖 | Frontend |
| R-005 | SVG 濾鏡（金屬紋、內陰影、落影）喺 iOS Safari 表現同 Chromium 有出入 | 中 | 中 | T-033 完成後即刻出一個真機預覽；有出入就改用預先生成嘅貼圖 | Frontend |
| R-006 | 用戶 dashboard 設定未做，部署任務卡住 | 中 | 中 | 所有開發同測試都可以喺本機模擬環境完成；只有 T-028、T-041 同真機測試受阻 | 用戶 / DevOps |
| R-007 | 呢個雲端 session 只可以 push 去 `claude/charming-cannon-8yulp0`，同團隊「一個任務一個 branch、PR 入 `main`」規則有出入；repo 亦未有 `main` | 高（已存在） | 中 | 見假設 A-1；每個任務一組 commit，review 同 QA 照做 | Main agent |
| R-008 | P-3、P-7 mockup 確認需要多輪 | 中 | 中 | Phase C、D、F、G 都唔受佢哋阻；mockup 同開發並行 | PM |
| R-009 | Mockup 用 Rokkitt 量字闊，真機有 Lubalin Graph 時字闊唔同 | 高 | 低 | 版面以 Rokkitt 做準；E2E 兩隻字都影 | QA |
| R-010 | 真實媒體檔名（中文、空格、符號）令配對或者網址出錯 | 中 | 中 | `matchMediaFiles` 同砌網址嘅測試用真實檔名；用戶上載第一張碟之後即刻跑掃描 | Backend |

---

## 依賴關係

### 內部依賴

```
T-001 ─┬─ T-002 ─┬─ T-022 → T-023 → T-025
       │         │            └────┬─ T-026 → T-028
       │         │   T-024 ────────┘     └─ T-080 → T-081 → T-083
       │         └─ T-031 → T-034
       ├─ T-020 → T-021 ─────────────── T-051 → T-052 → T-053 → T-054
       ├─ T-030 → T-032 ─┐
       │        └ T-033 ─┴ T-035 ─┬─ T-036
       │                          ├─ T-037 ─┐
       │                          ├─ T-039 → T-041
       │                          └─ T-040
       └─ T-010 → T-011 ───────────────────┴ T-038 ─┬─ T-060 → T-061
                                                    ├─ T-062
                                                    ├─ T-070、T-071
                                                    └─ T-072 → T-082
T-050（mockup）→ T-051、T-081
```

可以並行嘅三條線：**Backend**（T-020 起）、**播放端**（T-030 起）、**Mockup**（T-050）。佢哋只共用 `packages/catalog`。

### 外部依賴（要用戶做）

| 編號 | 事項 | 影響任務 | 幾時要 |
| --- | --- | --- | --- |
| U-1 | R2 開 `r-gram-media`（公開存取 + CORS 容許 `GET`、`HEAD`、`Range`），上載一張碟嘅測試檔：2–3 首歌（`.m4a` 或 `.mp3`）+ 1 個 MV（`.mp4`，fast start），檔名以歌號開頭 | T-010、T-025 | Phase B 開始前 |
| U-2 | 用 iPhone 開 spike 網址，照清單逐項試（約 15 分鐘） | T-011 | T-010 完成後 |
| U-3 | R2 開 `r-gram-catalog`（private）；D1 開 `r-gram` | T-028 | Phase C 尾 |
| U-4 | Google Cloud 開 OAuth client | T-028 | 同上 |
| U-5 | Worker secret：`GOOGLE_CLIENT_SECRET`、`SESSION_SECRET` | T-028 | 同上 |
| U-6 | GitHub secret：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID` | T-028 | 同上 |
| U-7 | Vercel 開 project 連 repo，設 `VITE_CATALOG_URL` | T-041 | Phase D 尾 |
| U-8 | 確認 P-3 管理端 mockup | T-051 起 | T-050 出稿後 |
| U-9 | 確認 P-7 各裝置 mockup | Phase I–K | 各自出稿後 |
| U-10 | 高清 / 向量 RubberBand logo（冇就用現有圖） | T-034、T-070 | 唔阻開發 |

---

## 工作量估算

單位：理想人日（粗略；已包自測，未包 review 同 QA 嗰兩欄以外嘅來回）。

| Phase | 前端 | 後端 | DevOps | QA + Review | 總計 |
| --- | --- | --- | --- | --- | --- |
| A 基礎 | — | 2 | 1 | 0.5 | 3.5 |
| B 真機 spike | 2 | — | — | — | 2 |
| C Backend API | — | 9 | 0.5 | 2 | 11.5 |
| D 播放端核心 | 16.5 | — | 0.5 | 5（包 T-040） | 22 |
| E 管理端 UI | 8 | — | — | 1.5 | 9.5 |
| F MV 同系統整合 | 5 | — | — | 1 | 6 |
| G 收藏、模式、歌書 | 4 | — | — | 1 | 5 |
| H 歌詞 | 4 | 2 | — | 1 | 7 |
| I–K 其他裝置 | 9 | — | — | 1.5 | 10.5 |
| **總計** | **48.5** | **13** | **2** | **13.5** | **77** |

Phase L 未計。

---

## 建議開始順序

```
Step 1 → T-001、T-002（基礎）。其他所有任務都靠佢。
Step 2 → 三條線並行：
         Backend：T-020 → T-021 → T-022 → …（唔使等 mockup，唔使等真機）
         播放端：T-030 → T-032、T-033 → T-035（唔使等 Backend，用 fixture catalog）
         Spike ：T-010（要 U-1）；同時出 T-050 管理端 mockup
Step 3 → 用戶真機試 spike（U-2）→ T-011 → T-038 播放
Step 4 → T-036、T-037、T-039、T-040 → 第一次真機安裝（T-041）
Step 5 → Phase E 管理端（T-050 確認後）同 Phase F、G 並行
Step 6 → Phase H 歌詞 → Phase I–K 其他裝置
```

每個任務照團隊流程：TDD → Code Reviewer → QA，通過先做下一個依賴佢嘅任務。

---

## 假設及前提

| 編號 | 假設 |
| --- | --- |
| A-1 | **Branch**：呢個雲端 session 只准 push 去 `claude/charming-cannon-8yulp0`，所以全部任務喺呢條 branch 做，每個任務一組 conventional commit。你想跟團隊規則（每個任務一條 `feature/` branch、PR 入 `main`）嘅話，要你講明准我開其他 branch 同 `main` |
| A-2 | 版本同工具跟 903-player 現用版本（Technical Spec Tech Stack 表） |
| A-3 | Phase B 嘅 spike 頁要一個 HTTPS 網址畀 iPhone 開。預設放喺 Vercel（U-7 提前做）；未有之前我只可以交本機可跑嘅版本 |
| A-4 | 開發期間播放端用 fixture catalog 同本機模擬媒體，唔等真 Backend 部署 |
| A-5 | Dashboard 設定由你做；我提供逐步清單同要填嘅值 |

---

## 開放問題

| 問題 | 影響任務 | 邊個決定 | 幾時要 |
| --- | --- | --- | --- |
| Branch 模式照 A-1，定係准我開 `main` 同 `feature/` branch？ | 全部 | 用戶 | Step 1 前（唔答就照 A-1） |
| Spike 頁放邊度（A-3）？ | T-010 | 用戶 | Phase B 前 |
| 測試媒體用邊張碟？ | T-010、T-025 | 用戶 | Phase B 前 |
| 歌書入面㩒唱片夾暫停，歌書應唔應該留住？Mockup 而家係會收起；spec 寫「播／停照㩒得」冇講明 | T-072 | 用戶 | Phase G 前 |

---

## 驗證

| 層 | 做法 |
| --- | --- |
| 每個任務 | `npm run lint`、`npm test`、相關 `npm run build`；Code Reviewer 報告；QA 按階段驗收 |
| Phase A | Fixture catalog 通過 `parseCatalogDocument()`；`matchCredits` 結果 = 187 直接配對 / 22 同名配對 / 53 冇資料 |
| Phase C | Worker 測試喺 workerd 跑；本機 `wrangler dev` + seed 後用 `curl` 讀 `/catalog/v1/catalog.json` |
| Phase D 起 | Playwright E2E（假 catalog + 本機媒體）；同 mockup 截圖比對；淨空規則測試 |
| 真機 | Phase B 清單；之後每個 Phase 完成有一張真機檢查表（安裝、鎖屏、自動更新） |

---

## 修訂記錄

| 版本 | 日期 | 改動 |
| --- | --- | --- |
| v1.0 | 2026-11-25 00:07 | 初稿；用戶批准 |
