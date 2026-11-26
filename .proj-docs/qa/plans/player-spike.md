# Test Plan — player-spike

- Chain: T-010 真機 spike 頁（`apps/player`，用完即棄、唔入產品）：`/spike.html` 同佢自己嘅 build（`vite.spike.config.ts`）、`src/spike/**`（媒體搵檔、六項測試、結果摘要）。同 app 分開嘅部分（precache、導航 fallback、`spikePage.ts`、`vite.config.ts` 嘅 `spikeBuild()`）屬 `player-pwa` AC-10；覆蓋率排除屬 `repo-scaffold` AC-3；寫死文字豁免屬 `player-foundation` AC-12
- AC（L1 來源：Plan T-010 ①–⑥；Plan R-026、U-1、U-2；QA brief 2026-11-26「只驗掂到產品嘅部分」）:
    - AC-1 隔離：`dist/spike.html` 有 `noindex, nofollow`；唔註冊 Service Worker；app 冇連結去佢；用完 spike 頁 app 嘅 cache 冇 spike 或者媒體檔
    - AC-2 smoke：本機假媒體資料夾（`?media=`）：讀到 `info.txt`、搵到音檔 / MV / 封面；結果摘要有字
    - AC-3 測試：`src/spike/**` 嘅 unit test 照跑（覆蓋率唔計）；寫死文字只喺 `spike/text.ts`
- 唔驗（要真 iPhone，U-2 / T-011）：①–⑥ 嘅聲音、鎖屏、Media Session、MV 音量、fps、打橫結果；spike 嘅 code 未有獨立 code review（只係 smoke），所以呢條鏈嘅凍結唔代表 spike 邏輯啱
- Scope files:
    - `apps/player/spike.html`、`apps/player/vite.spike.config.ts`、`apps/player/src/spike/**`（連 test、css）
    - 1-hop（屬其他鏈）：`vite.config.ts`、`src/pwa/spikePage.ts`、`manifest.ts`（`player-pwa`）；`src/assets/logo-full.png`（`player-startup`）；`src/styles/fonts.css`（`player-fonts`）
- Commands:
    - `npx vitest run --project @r-gram/player src/spike`
    - `npm run build -w apps/player`（app build 完會 build spike 入同一個 `dist/`，`spike-build` plugin；驗 `dist/spike.html`、`dist/spike-assets/`、`sw.js` 冇 spike）
- Browser check：`/tmp/…/scratchpad/qa-t109-t110/spike.cjs`（app SW 裝咗之後開 `/spike.html`、`?media=`；假媒體 `t010/media-server.mjs` 127.0.0.1:8123；擋晒非本機）。**唔准**連真媒體 bucket 或者 rgram.vercel.app
- PWA gate: no（app 嗰邊喺 `player-pwa`）。Security / Data gate: no（只讀本機 / 指定媒體網址）。Performance gate: no
- Out of scope：spike 嘅真機結果（T-011 報告）；spike 頁設計（冇設計稿，用完即棄）
