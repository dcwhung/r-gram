# Test Plan — admin-sync

- Chain: 管理端第一版（`apps/admin`）= 冇設計嘅同步頁：登入狀態（冇 session → Google 登入連結；有 → email、登出、同步）、同步 runner（API-033 → 逐個 API-034，`more`／`nextFrom`、再試、資料夾上限 `PAGES_EXHAUSTED`、session 過期停）、瀏覽器封面處理（攞原圖、EXIF 方向、置中裁、1200／320、WebP、抽色、API-050 × 2 → API-017）、純文字記錄同總結、`public/_headers`（CSP）。任務 T-116（連 review 修正 W-061、S-228、S-230、S-231、S-232、S-234）
- AC（L1：FS v1.12 §CR-010 D108（同 §CR-007「同步」、C3）；TS「CR-010 → 冇設計嘅同步頁同部署準備」同 CR-007 同步各節（API-033、API-034、API-050、API-017）；Plan v1.9 T-116 A1–A7、通用）:
    - AC-1 Workspace（A1）：根 `tsconfig.json`、`vitest.config.ts`、`ci.yml` 各一行；介面文字書面語、全部經 `src/i18n/zh-Hant.ts`（測試鎖住）
    - AC-2 登入（A2、C3）：冇 session 只有登入連結（`/auth/google/start?next=%2F`）、冇資料、冇掣；有 session = email、登出、同步；唔喺白名單、`ADMIN_EMAILS` 空／冇設 = 拒絕（fail closed）
    - AC-3 Runner（A3）：次序、`more`、一個資料夾失敗唔停其他、只有 0／5xx 再試；session 過期 = 停，返登入連結 +「登入已過期，請重新登入。」；`FOLDER_PAGES_MAX` 用完 = 問題 `PAGES_EXHAUSTED`、計入未完成
    - AC-4 封面（A4、D50）：置中裁、細過 1200 放大、1200 + 320 WebP、EXIF 方向、第一張帶專輯色、CORS／網絡／檔案錯誤分開、唔停同步
    - AC-5 冇 API-035（A5）：網絡層冇任何 `/api/sync/removals`；待確認移除只喺記錄列出
    - AC-6 記錄同總結：新專輯、新增／更新／沒有改動、檢查結果、封面結果、待確認移除、同步完成；第二次同步全部「沒有改動」、唔重做封面
    - AC-7 由 Worker 出頁（Worker 一邊屬 `api-auth`）：CSP 喺頁面、唔擋自己；console 冇錯
- Scope files:
    - `apps/admin/**`：`index.html`、`package.json`、`public/_headers`、`tsconfig{,.app,.node}.json`、`vite.config.ts`、`tests/setup.ts`、`src/main.tsx`、`src/vite-env.d.ts`、`src/styles/base.css`、`src/api/**`、`src/app/**`、`src/covers/**`、`src/i18n/**`、`src/sync/**`（連 `testing/fakeApi.ts`）同全部 `*.test.ts(x)`
    - 1-hop（屬其他鏈）：`packages/catalog/src/schema/coverSize.ts`（`catalog-core`）；Worker route（`api-auth`、`api-sync`、`api-assets`、`api-albums`）
- Commands:
    - `npx vitest run --project @r-gram/admin`；`npm run build -w apps/admin`（lint／typecheck／coverage 引用同一個 SHA 嘅 gate）
    - 本機 Worker（只限 local；照 `/tmp/…/scratchpad/t116/COMMANDS.txt`，喺 repo 外 `git archive` 副本行，唔整污 tree）：`npm run migrate:local -w apps/api`、本機 R2 假媒體資料夾、`wrangler d1 execute --local` 開 session、`wrangler dev --local-protocol https`；Playwright `/tmp/…/scratchpad/qa-t038-t116/t116/admin.cjs`（signedout、sync1–3、pages、expired、covers；桌面 + 393 × 852）+ `player.cjs`（播放端 build 指本機 Worker，播到同步咗嘅歌）；`curl` 驗 route 歸屬、401、fail closed、catalog／圖嘅 header；Pillow 驗輸出 WebP
- PWA gate: no。Security / Data gate: yes（AC-2、AC-5、CSP）。Performance gate: no（操作數見 review）
- Out of scope：真 Google 來回、真 R2／真媒體 bucket、`wrangler deploy`（用戶部署，A7）；Safari 嘅 wasm WebP 路徑（真機）；有設計嘅管理端（T-051、T-055）；S-229、S-233（已接受）
