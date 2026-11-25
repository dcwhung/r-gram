# QA — player-foundation — 2026-11-25 — S1

- Tier: T3（新 app，有 build 設定、PWA plugin 同 manifest；任務 T-030）| Commit: `b9af7ff` | Verdict: ✅ pass
- Ledger（`impact --since bf22b27`，成個 run）: SKIP 0 / REVERIFY 1 (`catalog-core`) / UNCOVERED 84 → 當中 `apps/player` 43 個檔入呢條鏈
- Plan: [`plans/player-foundation.md`](plans/player-foundation.md)（AC-1 – AC-6 嘅來源同 scope 喺入面）
- Hard Gates: all pass（Tests、Coverage、No blocking finding；PWA gate 做咗 S1 做得到嘅部分，見下面；Security / Data 同 Performance 唔適用）

## Runs

| Command | Result | Time |
| --- | --- | --- |
| `npm run lint`、`npm run typecheck`（成個 repo，今次 run 只跑一次） | 冇錯 | 2 s + 1 s |
| `npx vitest run --project @r-gram/player --coverage --coverage.include='src/**/*.{ts,tsx}'` | 13 個檔、91 / 91；statements 98.9% / branches 96.49% / functions 98.33% / lines 100%；最低嘅檔 `geometry.ts` branches 75%（4 個分支漏 1 個防禦分支），statements 98.5% | 5 s |
| `npm run build -w apps/player` | 成功：JS 222 kB（gzip 70 kB）、CSS 1.9 kB、`sw.js` precache 5 項 | 4 s |
| 驗收 probe（scratchpad，冇入 repo）：將設計稿 `template.html` 嘅常數同「量度」函數原樣執行，同 app 逐項比 | 11 / 11 | 1 s |
| Browser check（Chromium，`vite preview`，對外 host 全部封咗）：393 × 852、360 × 640、1280 × 800 | 三個尺寸所有項目通過 | 10 s |
| CI（引用）：run 45538369844 @ `b9af7ff` | success，連 `npm run build -w apps/player` | — |

## 驗收標準

| AC | 結果 | 證據 |
| --- | --- | --- |
| AC-1 幾何表 | ✅ | `PHONE_LAYOUT` 每一組（碟、轉盤、碟芯、唱臂、弧線、三粒掣、旋鈕、刻度、字母盤、螺絲、歌單弧線、淨空常數）同設計稿常數相等；FS 版面表嘅數字（碟 (940, 1196) r 700、轉盤 716、掣 x 112 y 1380 / 1510 / 1640、旋鈕 (266, 1784) r 76、刻度 185° 每格 11.25°、字母盤 186 / 288）全部啱；旋鈕 x = `round(platterLeftAt(1784) / 2)` |
| AC-2 淨空規則 | ✅ | 獨立重計：掣同 CD 91.7（≥ 16）、掣同轉盤 75.7、旋鈕同轉盤 66.4（≥ 40）、掣同旋鈕刻度 42.3（≥ 40）、螺絲 125（≥ 120）、旋鈕左右 154 / 153.5（差 0.5）、6 個感應範圍全部 ≥ 44pt 而且最近相隔 4；`geometry.ts` 七個量度函數同設計稿函數嘅輸出一致（去到小數後 9 位）；♥ 位置喺 open 0 / 0.5 / 1 都一致。格數只有 8–10、15–18 過到（已知，B-010，有 test 鎖住） |
| AC-3 舞台 | ✅ | 393 × 852：舞台 (0, 0) 393 × 852，`--u` 0.3639px，`--stage-extra` 421.374。360 × 640：360 × 640，`--u` 0.3333px，extra 0。1280 × 800：(415, 0) 450 × 800，`--u` 0.4167px，extra 0。三個尺寸 `html` / `body` `overflow: hidden`、`scrollTo`、觸控拖動同滾輪之後 `scrollY` 仍然係 0，舞台 `touch-action: none`。安全區：`fitStage(393, 852, { top: 59, bottom: 34 })` 舞台由 y = 59 開始、高 759 |
| AC-4 i18n | ✅ | 語言檔 35 句全部同 FS 用詞表同設計稿 `T` / `BUTTON_LABEL` / `MODE_LABEL` 一樣；冇 TS 列嘅口語字同「而家」；17 個非測試 source 檔（語言檔除外）冇任何中文字面值，而寫死嘅 `aria-label` / JSX 文字例子捉得到；`resolveLocale(['en-US', 'ja'])` 同空 list 都回 `zh-Hant`；瀏覽器入面 `<html lang="zh-Hant">`，manifest `name` R Gram、`lang` zh-Hant、`description`「歌迷自製的 RubberBand 唱片機（非官方）」（同 `<meta name="description">` 一樣） |
| AC-5 動畫 token | ✅ | 場景時長 = FS「過場動畫」：轉碟 500、字母 260（每格 14 / 8）、歌書 400 / 240、電視 800、開機 220、熄機 150、收埋 450；回饋類 160 / 200 / 120（≤ 300）；`tokens.css` 12 個 `--motion-*` 同 `motion.ts` 同值；四個 CSS 檔冇寫死時長。減少動態 = 0 由 `utils/motion.test.ts` 覆蓋（91 個 test 之內） |
| AC-6 版本同 noindex | ✅ | 三個尺寸畫面都顯示 `v0.1.0`，`<body data-version>` 0.1.0，= `apps/player/package.json`；`<meta name="robots" content="noindex, nofollow">` |
| PWA gate（S1 部分） | ✅ | Service Worker `activated`、有 control 頁面、cache 5 項；離線重新載入照樣顯示 `R Gram / 歌迷自製　非官方 / v0.1.0`；console 冇 error / warning、冇失敗請求、冇對外請求。vN → vN+1 自動更新未做得（未有 `updateManager`，T-039，已知） |

## Findings

冇 🔴 / 🟡。以下係 Observation：唔 block，入 backlog。

- Observation：FR-011 同 TS「安全設計」除咗 `noindex` meta 仲要 `robots.txt`（同 Vercel `X-Robots-Tag`）。而家 `apps/player/public/` 係空嘅，`/robots.txt` 回嘅係 `index.html`。T-030 嘅範圍冇列呢項，但 Implementation Plan 冇任何一行寫明 `robots.txt`：T-039（`noindex`）或者 T-041（`vercel.json`）要包埋。
- Observation：安全區（`env(safe-area-inset-*)`）喺 headless Chromium 模擬唔到，今次只驗到純函數同 probe element 嘅 unit test；真機（動態島、底部指示條）要靠 Phase B / D 嘅真機檢查表。

## 建議補測

- no edge case gap（幾何、縮放、i18n 都有 test，probe 冇搵到漏咗嘅情況）。
- 另外（唔係 edge case）：T-040 加 Playwright E2E 時，將今次 browser check 嘅項目（三個尺寸嘅舞台變數、`lang`、robots、版本號、manifest、唔捲動）寫成一個 smoke spec，之後呢條鏈重驗就唔使人手 script。

```handoff-receipt
protocol: 2
status: pass
score: n/a
stage: S1
ledger: "SKIP 0 / REVERIFY 1 / UNCOVERED 84"
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "98.9%"
next_action: end
next_agent: null
branch: "claude/charming-cannon-8yulp0"
context: "T-030 S1 pass：AC-1–AC-6 + PWA gate（S1 部分）通過（91/91、覆蓋率 98.9%、probe 11/11、browser check 三個尺寸、CI 45538369844 @ b9af7ff 綠）；player-foundation S1 已 freeze。冇 blocking finding。Observation：robots.txt 未有任務行（T-039 / T-041）"
```
