# R Gram — Project Rules

歌迷自製、非官方嘅 RubberBand 唱片機 PWA。播放端（`apps/player`）+ 管理端（`apps/admin`）+ Cloudflare Worker（`apps/api`）+ 共用純邏輯（`packages/catalog`）。

## 文件（開工前先睇）

| 文件                                                      | 位置                                                                                                                         |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 文件索引                                                  | `.proj-docs/index.md`                                                                                                        |
| Functional Spec（Approved；改動要行 Change Request）      | `.proj-docs/specs/2026-11-24_16-13_functional-spec_r-gram.md`                                                                |
| Technical Spec（Approved）                                | `.proj-docs/specs/2026-11-24_16-50_technical-spec_r-gram.md`                                                                 |
| Implementation Plan（任務 T-xxx、依賴、用戶要做嘅事 U-x） | `.proj-docs/plans/`                                                                                                          |
| 播放端設計稿（已確認，Design Source）                     | `_mockups_/home-turntable/index.html`；source 係 `src/template.html`，改完跑 `python3 src/build.py`，唔好直接改 `index.html` |
| 參考實作                                                  | `dcwhung/903-player`（同一套 stack；Backend、管理端元件、PWA 更新可以移植）                                                  |

## 指令

| 用途                         | 指令（repo 根）                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| 安裝                         | `npm ci`                                                                                 |
| Lint + format 檢查           | `npm run lint`                                                                           |
| Type check（全部 workspace） | `npm run typecheck`                                                                      |
| Unit（全部 workspace）       | `npm test`                                                                               |
| 覆蓋率                       | `npm run coverage`                                                                       |
| Format                       | `npm run format`                                                                         |
| Cloud sandbox 嘅 Playwright  | 預裝 Chromium：`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`；唔好跑 `playwright install` |

加 app（`apps/player`、`apps/admin`、`apps/api`）時：喺根 `tsconfig.json` 嘅 `references`、根 `vitest.config.ts` 嘅 `projects`、`.github/workflows/ci.yml` 各加一行，並更新呢個表。

## Branch 同 commit

- Production branch 係 `main`（冇 `develop`）：`feature/` / `fix/` / `refactor/` branch → PR → `main`。
- Claude Code 雲端 session 只可以 push 去 session 指定嘅 `claude/…` branch：喺嗰條 branch 做，每個任務（T-xxx）一組 commit，review 同 QA 照做。
- Conventional commits：`feat` / `fix` / `refactor` / `chore` / `test` / `docs`。
- TDD：先 commit 會 fail 嘅測試（`test:`），再 commit 實作（`feat:` / `fix:`）。

## 寫 code 嘅規則

- 函數做一件事；`.ts` 函數 ≤ 30 行，`.tsx` 函數 ≤ 50 行、檔案 ≤ 150 行（ESLint 會擋）。
- 唔用 magic number：用有名嘅常數。
- 介面文字（畫面上嘅字、`aria-label`、提示）：**中文書面語**，唔用廣東話口語字；全部經 i18n 語言檔（`src/i18n/zh-Hant.ts`），元件唔寫死文字；預設繁體中文。專輯名、歌名、歌詞、人名係資料，唔翻譯。
- 播放端版面數字係資料：放喺 `stage/layouts/<裝置>.ts`，元件只讀表；數值以設計稿 `template.html` 嘅常數做準。
- 動畫時長用 token（`config/motion.ts`），元件唔寫死毫秒；所有過場要有 `prefers-reduced-motion` 嘅即時路徑。
- `packages/catalog` 只放純邏輯：唔掂 DOM、唔用 Vite / Worker API。
- 內容資料（`apps/api/seed/*.json`）由 `_design_/tools/` 嘅 script 生成，唔人手改。

## QA / Validation Gate

跟 ai-dev-team `skills/sw-validation-gate/SKILL.md`。

| 項目               | 設定                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------ |
| Ledger             | `.proj-docs/qa/verification-ledger.tsv`                                              |
| Frozen plans       | `.proj-docs/qa/plans/<chain_id>.md`                                                  |
| Chains（隨開發加） | `catalog-core`（`packages/catalog`）                                                 |
| `impact` base      | 未有 `main` 之前：上一個任務最後一個 commit；之後：`git merge-base HEAD origin/main` |
