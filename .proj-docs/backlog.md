# Backlog

Review 同 QA 留低、未有對應任務嘅項目。做完就刪走嗰行。

| # | 來源 | 項目 | 幾時做 |
| --- | --- | --- | --- |
| B-001 | Re-review T-001 / T-002（Observation） | Catalog validator 嘅 base URL 一定要 `https://`。播放端 E2E 嘅「假 catalog + 本機模擬媒體 server」唔可以用 `http://localhost`：用 Playwright 攔截 `https://` 請求，或者本機起 https | T-031、T-040 |
| B-002 | Review T-001 / T-002（Observation） | `_design_/HANDOFF.md` 同 Functional Spec（US-109 等）仲寫 `data/…` 舊路徑；實際已搬去 `apps/api/seed/`（Technical Spec 有寫） | 下次 Change Request |
| B-003 | Review T-001 / T-002（Observation） | 加 `vercel.json` 時一齊加 `.vercelignore`（`_mockups_/`、`_design_/`、`.proj-docs/`） | T-041 |
| B-004 | Re-review（Observation） | `generatedAt` 仍然收 `2026-02-30T…`（V8 `Date.parse` 寬鬆）。只係資訊欄，播放端唔靠佢做判斷 | 有需要先做 |
| B-005 | Review T-001 / T-002（Observation） | 發佈 builder 要將草稿入面嘅空字串轉做 `null`（validator 唔收空字串） | T-026 |
| B-006 | QA S1 catalog-core（Observation） | 字串長度上限未做（Technical Spec「安全設計」：`CREDIT_MAX_CHARS`、`LRC_MAX_BYTES` 等）。常數放 `packages/catalog`（管理端同 API 共用），API 入口驗 | T-023、T-080 |
| B-007 | QA S1 catalog-core（Observation） | 根設定檔（`package.json`、`tsconfig.json`、`vitest.config.ts`、`ci.yml`）而家喺 `catalog-core` 鏈，每加一個 app 都會令佢 REVERIFY。下次 QA 將佢哋分去新鏈 `repo-scaffold` | T-020 嘅 QA |
| B-008 | T-030（`npm audit`） | `vite-plugin-pwa ^2.0.0` → `workbox-build` → `glob` / `minimatch` 有 4 個 moderate 警告（GHSA-3g3m-2fjr-6pw4、GHSA-g3hv-75wg-m249）。只喺 build 時用，glob pattern 係自己寫死嘅設定，唔食外來輸入；`npm audit fix` 會降去 `vite-plugin-pwa@1.1.0`（breaking）。同 903-player 用緊嘅版本一樣。等上游出修正版再升 | 上游有修正時 |
| B-009 | T-030（設計問題，要用戶決定） | 設計稿係 9:16（1080 × 1920），但 iPhone 係約 9:19.5。舞台只用安全區入面嘅位（扣走狀態列 / 動態島同底部指示條）：iPhone 15 闊度填滿之後，可用高度比設計稿多約 166 單位（約 9%）；舞台已經計出 `--stage-extra`。預設做法：左上資訊同頂部螺絲貼頂，唱片機（碟、轉盤、唱臂、控件）成組貼底，多出嚟嘅空位喺中間。要喺真機 / 預覽睇過先定 | T-033、T-035 |
| B-010 | Review T-030（W-006；設計問題，要用戶決定） | 刻度格數 = 已上架專輯數 + 1。而家嘅幾何（每格固定 11.25°，♥ 喺最尾一格）只有 8–10 同 15–18 格過到「感應範圍互不重疊」：例如只上架 3–4 張碟時 ♥ 會疊住播放模式掣；19 格（多一張碟）♥ 會疊住旋鈕，字母盤過場亦超過 0.5 秒。建議：刻度弧固定（185° 至 376.25°），♥ 永遠喺弧嘅最尾（同設計稿 18 格時一樣位置），專輯喺弧上面平均分佈。要改 spec（CR）同設計稿 | T-036 之前 |
| B-011 | Review T-030（S-020、S-024） | `useStageFit` 量 `innerWidth` / `innerHeight`，但 CSS 容器係 `100dvh`；iOS 轉向後 `innerHeight` 有機會未更新。安全區亦只喺 `resize` / `orientationchange` 時重讀（stylesheet 遲載入就要等下一個 resize 先修正）。做法：對 `#root` 同安全區 probe 加 `ResizeObserver`，或者加聽 `visualViewport`；順手將 probe element 存起。要真機先重現到 | T-039（真機測試時） |
| B-012 | Review T-030（Observation） | 感應範圍以 390pt 闊做基準：375pt 手機得 42.3pt、360pt 得 40.6pt。要唔要為細屏手機放大感應範圍（同 B-009 一齊問用戶） | T-033、T-035 |
| B-013 | Review T-030（Observation） | T-039 要處理：`registerType: 'prompt'` 而家已經會自動註冊 Service Worker（未有 update manager）；`clientsClaim` 令第一次安裝都有 `controllerchange`，update manager 要「之前有 controller」先 reload；`orientation: 'portrait'` 同之後嘅橫向版面（Duo 打開、電腦）有衝突；加字體後 `woff2` 分片會全部 precache | T-039 |
| B-014 | Re-review T-030（S-025） | 安全區外面（狀態列、底部指示條後面，同闊畫面兩邊）由 `#root` 嘅 `--stage-backdrop` 填。每個場景要設返：Preload 黑底、歌單 / 歌書暗層、MV 淡白層。`black-translucent` 嘅狀態列字係白色，淺色主頁上面可能睇唔到，要真機確認再定 `apple-mobile-web-app-status-bar-style` | T-034、T-035 |
| B-015 | Re-review T-030（Observation） | B-010 定方案時，格數掃描要加埋「♥ 感應方格唔可以出界」（23–26 格方格底邊超出畫面） | 同 B-010 |
| B-016 | Review T-020 / T-021（S-031） | Env 驗證而家收 `wrangler.toml` 嘅 placeholder（`admin@example.com`、全 0 嘅 `database_id`）：安全（部署唔到、冇人登入到）但唔會即刻提示。部署前嘅檢查要擋 placeholder；`MEDIA_BASE` 唔應該收有 userinfo 嘅網址 | T-028 |
| B-017 | Review T-020 / T-021（S-033） | Technical Spec 同步：API-003（登出）認證欄改做「None（要 same-origin）」；組件圖加新檔（`lib/validateEnv.ts`、`auth/pages.ts` 等）；Header 行加 `Referrer-Policy`、`X-Content-Type-Options` | 下次 Change Request |
| B-018 | Review T-020 / T-021（S-030） | 測試名同內容唔完全對應：`oauthCallback.test.ts`「use the state cookie once」只驗 Set-Cookie 有清；replay 測試同「Google rejects the code」實際一樣；`session.test.ts`「requested size」只試 32 | 下次改呢幾個檔時 |
| B-019 | Review T-020 / T-021（Observation） | 之後 Backend 任務要留意：① `/api` 守門靠註冊次序，新 route 一定要加喺 `use('*')` 之後；② `tracks (album_id, no)` UNIQUE 逐句檢查，重編歌號要分兩步；③ 重新登入唔會收返同一個瀏覽器之前嘅 session；④ `/auth/google/start` 同 callback 冇 rate limit；⑤ 自訂網域要加 HSTS；CI 未有 Worker bundle 檢查 | T-022、T-023、T-028 |
