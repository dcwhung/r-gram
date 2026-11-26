# Test Plan — repo-scaffold

- Chain: Repo 根設定同 CI：workspaces、lint / format、type check、Vitest projects、CI 改動偵測。任務 T-001（由 `catalog-core` 分出嚟，backlog B-007：加 app 會改呢啲檔，唔應該令 `catalog-core` 重驗）
- AC（L1 來源：TS = Technical Spec、Plan = Implementation Plan）:
    - AC-1 Scaffold（Plan T-001；TS「Repo 結構」）：workspaces（`apps/*`、`packages/*`）；`npm run lint` / `typecheck` / `test` / `coverage` 跑得到；根 `tsconfig.json` 嘅 `references` 同根 `vitest.config.ts` 嘅 `projects` 包晒現有 workspace
    - AC-2 CI（Plan T-001；TS「部署架構」`ci.yml` 行）：非 `main` 嘅 push 跑 lint + type check + unit（連 80% 門檻）+ build；成條 branch 淨係改文件 / 設計稿先跳過，判斷唔到就照跑
    - AC-3 覆蓋率範圍（T-010，`7ad10b0`）：根 `vitest.config.ts` coverage `exclude` 加 `**/src/spike/**`（spike 頁唔計覆蓋率），spike 嘅測試照跑（`include` 冇改）
- Scope files:
    - Root：`package.json`、`package-lock.json`、`tsconfig.json`、`vitest.config.ts`、`eslint.config.js`、`.prettierrc.json`、`.prettierignore`、`.gitignore`
    - `.github/workflows/ci.yml`、`scripts/ci/detect-code-changes.sh`、`scripts/ci/detect-code-changes.test.mjs`
- Commands:
    - `npm run lint`
    - `npm run typecheck`
    - `npx vitest run --project @r-gram/repo-scripts`
- CI 引用: 同一個 SHA 嘅 `CI` workflow 綠咗（`gh run list --branch <branch> --limit 1`）就引用，證明 `ci.yml` 真係行得；唔重跑
- 淨係 `package-lock.json` 或者加 workspace 嗰一行改咗：跑上面三條指令就夠；改到嘅 workspace 由佢自己條鏈驗
- PWA gate: no。Security / Data gate: no。Performance gate: no
- Out of scope: 各 workspace 入面嘅 code 同設定（`catalog-core`、`player-foundation`、`api-auth`）；`deploy-api.yml`（T-028）；`vercel.json`（T-041）
