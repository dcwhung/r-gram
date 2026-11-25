# Code Review — T-044 slab 字體、W-017 同 S-072–S-075 嘅修正（播放端）

- **日期**：2026-11-25 15:51　**審閱者**：Code Reviewer（獨立）　**Tier**：T2（新功能：字體、build plugin、Service Worker 規則；加上一份 review 嘅窄範圍 re-review）
- **目標**：branch `claude/charming-cannon-8yulp0`，`git diff d1aa85d..e88c605 -- apps/player`（`e70b000` test → `aebfd34` feat，T-044；`4c8eab4` W-017；`19826b0` S-072；`3232bcd` S-073；`f1ee814` S-074；`9b15afa` S-075）。34 個檔，+901 / −73。`apps/player` 由 `e88c605` 到 HEAD `1b52312` 冇改。`apps/api` 由另一位 reviewer 睇
- **總評**：**pass（90 / 100）**。冇 Critical。兩個 WOFF2 我自己解碼過：係 Rokkitt（SIL OFL 1.1），同設計稿嘅 base64 一個 byte 都唔差；成個 repo 連 git 歷史都冇其他字體資料。W-017 修好（實測：改之前出界到 1016.9，改之後縮到 59 號、右邊 1001.6）；S-072–S-075 全部修好，新測試喺改之前嘅 code 上面會 fail。兩個 Warning：單一字重檔宣告咗 `100 900`，所以 D45 講嘅「模擬加粗」唔會出現（W-026，要 PM 定）；「商業字體唔入 repo」嘅防線淨係睇一個資料夾（W-027）

## Hard Gates

all pass — `npx eslint apps/player` exit 0；`npx tsc -b apps/player` exit 0；`prettier --check apps/player` exit 0；diff 相關 14 個測試檔 128 tests 全綠（冇跑 full suite；developer 報 full suite 1109 綠、coverage 99.57% / 95.79%）；冇新增 npm 依賴（字體係 repo 入面嘅 OFL 檔）。TDD：`e70b000`（test，`fontSource.ts` 未存在，一定紅）→ `aebfd34`（feat，冇改測試）；review 修正每項一個 `fix: <ID> |` commit（Fix Convention）。`version` 仍然係 0.1.0（首次 release 之前，同之前幾份 review 一致）。

## 評分結果

| 維度 | 得分 | 滿分 | 備注 |
| --- | --- | --- | --- |
| 正確性 | 20 | 25 | W-026 |
| 安全性 | 15 | 20 | W-027；S-110 |
| 可維護性 | 20 | 20 | S-111、S-113 |
| 測試覆蓋 | 15 | 15 | 13 個 mutant 捉到 12 個（漏網見 S-114） |
| 性能 | 10 | 10 | |
| 代碼風格 | 10 | 10 | |
| **總分** | **90** | **100** | 2 個 Warning × −5 |

**結果：pass**

## 字體鑑定（全部實測）

| 檢查 | 結果 |
| --- | --- |
| `rokkitt-extrabold-latin1.woff2`（13 432 B） | 自己寫 parser：WOFF2 table directory → `brotliDecompressSync` → `name` / `OS/2`。Copyright「Copyright 2016 The Rokkit Project Authors (https://github.com/googlefonts/RokkittFont)」、family「Rokkitt SemiBold」/ subfamily「ExtraBold」、PostScript `RokkittSemiBold-ExtraBold`、Version 3.103、licence URL `https://scripts.sil.org/OFL`、`usWeightClass` 800、`fsType` 0 |
| `rokkitt-light-latin1.woff2`（13 336 B） | 同上，`RokkittSemiBold-Light`、`usWeightClass` 300 |
| 同設計稿一樣？ | 兩個檔同 `_mockups_/home-turntable/src/fonts.css` 嘅 base64 解出嚟嘅資料逐個 byte 比過：`RB Slab` = extrabold、`RB Slab Light` = light，完全一樣 |
| 字元覆蓋 | 每個檔 228 個 code point：Latin-1 加 `– — ‘ ’ “ ” • … € ™`；冇 `♥`、冇 Latin Extended-A |
| `OFL.txt` | 第 1 行 copyright 同字體 `name` 0 一模一樣（「Rokkit」係上游字體檔本身嘅串法）；條文同 SIL OFL 1.1 一致（同 node_modules 入面另一份 OFL 比過：只差第 4 條一個字「and / or the Author(s)」，呢份用 SIL 原文嘅「and」）。Rokkitt 冇 Reserved Font Name，所以 subset 用返個名冇問題 |
| repo 入面仲有冇其他字體 | `git ls-files` 搵字體副檔名：淨係兩個 Rokkitt。全部 851 個歷史 blob 用 magic bytes（`wOF2` / `wOFF` / `OTTO` / `00010000` / `ttcf`）掃過：都係淨係呢兩個。所有歷史 blob 入面 ≥ 200 字元嘅 base64：解出嚟淨係呢兩個 WOFF2（各 30 次，喺設計稿 HTML）同 PNG。ITC Lubalin Graph 只係以名出現（`local()`、文件、註解） |
| guard 測試 | `fonts.node.test.ts:83` 喺 `assets/fonts/` 加多個檔會 fail（mutant 實測）；放去 `public/fonts/` 或者 `src/assets/` 就照綠（W-027） |

## 你指定要睇嘅幾點（「實測」= 我跑過，「讀 code」= 推論）

| 項目 | 結論 |
| --- | --- |
| `@font-face` 次序 | 實測（build 出嚟嘅 CSS，有冇設 `VITE_FONT_URL` 都 build 過）：三個 `local()` → 遠端 `url()` → hash 咗嘅 Rokkitt。冇設定時唔會有空嘅 `url()` 或者多咗嘅逗號。`font-display: swap`，冇 `unicode-range`：中日韓字逐個字跌去 Rockwell → `--font-cjk`（`--font-mixed` 冇夾 generic family，啱） |
| 設錯 / 惡意嘅 `VITE_FONT_URL` | 實測 25 個值。冇設定、空、相對、`//host`、`http:`、`javascript:`、`data:` → 唔出。`"` 變 `%22`、空格變 `%20`；`(` 同 `'` 經 minifier 之後變 `\(`、`\'`，仍然有效。唯一爛嘅情況：query 或 fragment 以 `\` 收尾，`\"` 跳脫咗收尾引號，**兩個 `@font-face` 都冇咗**（S-110）。由於值係 build 時嘅設定，唔會畀人注入 CSS |
| `format()` | 實測：`.woff2` / `.woff` / `.otf` / `.ttf`（唔理大小楷）對到；`.eot`、冇副檔名、`dir.v2/font` 都唔出 `format()`（瀏覽器照試），啱 |
| 字重 `100 900` | 實測（Chromium）：宣告 `100 900` 時 700 號同 400 號嘅墨量一樣（400 496 = 400 496），即係**冇模擬加粗**；改成單一字重（`300`）就加粗（670 455）。字寬兩種都一樣，所以 fitText 唔受影響。用戶會見到：而家播放端冇 slab 字用到 > 400，所以畫面冇分別；bucket 放咗 Lubalin Book 之後，`RB Slab` 同 `RB Slab Light` 都會用同一個 Book 檔（版本號、年份、歌號同碟名一樣粗，同設計稿喺有裝 Lubalin 嘅機一致）；之後 T-037 / T-082 啲 `MIXED` 500 / 700 行，拉丁字母都唔會加粗，但中文會加粗。同 D45 嘅寫法相反（W-026） |
| Vite plugin | 實測：dev server（`/src/styles/fonts.css?direct`）同 build 出嚟嘅 `src` 一樣。設咗但唔係 https → build log 有 warning。`fonts.css` 改成經 `global.css` 嘅 `@import` 引入：遠端字體靜靜雞冇咗，冇 warning，但 SW 規則照加（S-111） |
| `loadEnv` | 讀 code + 實測：prefix 係 `VITE_`，config 淨係用 `VITE_FONT_URL`；bundle JS 冇字體網址、冇其他變數。`__APP_VERSION__`（`0.1.0` 喺 JS）、manifest 同 `<meta description>` 照有 |
| Service Worker | 實測 `sw.js`：兩個 Rokkitt 入 precache；設咗網址先有 `registerRoute(/^https:\/\/media\.example\/fonts\/Lubalin\.otf\?v=2$/, CacheFirst{cacheName:"r-gram-remote-font", CacheableResponsePlugin{statuses:[200]}})`；冇設就冇呢條。opaque（status 0）唔會 cache。讀 code：字體請求係 CORS mode，CORS 失敗 / 離線未 cache → 呢個 src 失敗，用下一項（precache 咗嘅 Rokkitt），唔會阻 app 開。冇 expiration：見 S-112 |
| W-017 | 見下表 |
| CR-004 變數名 | Technical Spec:725、:1087 同 Implementation Plan U-14 寫 `VITE_SLAB_FONT_URL`（同 `VITE_SLAB_FONT_BOLD_URL`），code 用 `VITE_FONT_URL`，冇粗體網址。spec 寫明「建議名，T-044 定案」，所以兩個名都唔算錯，但 spec 未更新：用戶照 U-14 設 `VITE_SLAB_FONT_URL` 就會冇反應（S-113） |

## 上一份 review 嘅修正

| 項目 | 結論 |
| --- | --- |
| **W-017** 字體載入後重新量字 | ✅ **已修**。實測：自己 build 嘅 harness，用真 `fonts.css`，延遲 woff2 回應 1.5 秒。`THE GREATEST SHOWMAN LIVE`：載入前 60 號、右邊 1008.5；載入後 **59 號、右邊 1001.6**（上限 1010）。同一個 harness 換返改之前嘅 `useState(createTextMeasure)`：載入後仲係 60 號、右邊 **1016.9**（出界）。`useFontsVersion`：`ready` 一次、每次 `loadingdone` 一次，unmount 移除 listener（測試數 listener），`active` flag 擋住 unmount 之後先 resolve 嘅 `ready`。冇 `document.fonts` 就一直係 0。只喺字體事件先 +1，所以唔會無限 re-render（一路載入一路 +1，有盡頭）。Mutant：用返舊 App、刪 `removeEventListener`、刪 `loadingdone` 都會紅 |
| **S-072** 轉入途中暫停 / 再播 | ✅ **已修**。`leadInOnPose`：swing 期間轉去 `lifted` / `playing` 都仲係 `swing`，`leadIn` 冇變所以 effect 唔重新計時（timer 由 swing 開始計）；返 `parked` 就停。swing 喺暫停時完咗就停喺升針，唔會自己放低。drop 期間暫停 → `null`，再播 = 一般嘅繼續（同上份 review 決定 1 一致）。650 → 160 → 小燈 / 碟嘅次序冇變（`LEAD_IN_MS` 冇改，fake timer 測試逐毫秒驗）。改之前嘅 `useArmLeadIn.ts` 會令新測試紅 |
| **S-073** MV 開住時唱片夾 | ✅ **已修**。`Spindle` 有 `aria-disabled="true"`，仍然喺 Tab 次序（讀屏講「已停用」），click / Enter 都唔叫 `onPress`。`useHome` 守衛而家有測試：刪咗守衛會紅；`Turntable` 唔傳 `disabled` 會紅 |
| **S-074** 歌單暗層下面嘅掣 | ✅ **已修**。三粒細掣 `tabindex="-1"`，外面個 `<g>` 有 `aria-hidden`，㩒唔到；Tab 只會去暗層同唱片夾。用暗層收返歌單之後 focus 返唱片夾。SVG 冇 `inert`，用 `tabIndex` 係合理做法。三個 mutant（唔傳 `covered`、唔 refocus、冇 `aria-hidden`）全部會紅 |
| **S-075** 「…」之前嘅空格 | ✅ **已修**。`trimEnd()` 之後先加「…」；拿走空格只會更窄，所以照樣放得落。刪 `trimEnd()` 會紅 |

## Warning

### W-026 單一字重檔宣告咗 `font-weight: 100 900`，bucket 嘅 Book 字重永遠唔會模擬加粗（`styles/fonts.css:16`、`:29`）
- **L1**：Functional Spec D45（:796）「只有 Book 字重時較粗嘅字會模擬加粗」；Technical Spec:1086「要求：Rokkitt 用真字重；Book 單一字重遇到粗體由瀏覽器模擬，除非另外提供粗體檔」；Implementation Plan R-009「粗體係模擬」。
- **L2**：實測（Chromium，`RB Slab Light` 嘅 Rokkitt Light）：宣告 `100 900` 時，700 號嘅墨量同 400 號一樣（400 496），冇加粗；宣告單一字重就有模擬加粗（670 455）。因為個 face 話自己包晒 100–900，瀏覽器就唔會模擬。遠端檔放入同一個 `src`，所以 Lubalin Book 都一樣。
- **L3**：而家播放端嘅 slab 字全部係 400，所以今日畫面冇分別。設計稿（第 17 版，Design Source）自己都係 `100 900`，所以 code 跟咗設計稿，但同 D45 / Technical Spec 寫嘅相反。影響喺之後：T-037 歌單、T-082 歌詞嘅 `MIXED` 500 / 700 行，中文加粗而拉丁字母唔加粗；用戶會覺得粗體冇效。
- **方案 A（推薦，要 PM 定）**：PM 喺 D45 同 Technical Spec「字體」寫明「跟設計稿：slab 唔模擬加粗」，code 唔使改；加一條測試鎖住呢個決定。**方案 B**：跟 D45 改 code：每個 family 分開兩個 `@font-face`（Rokkitt 用真字重 400 / 800，或者 300；遠端 Book 用 `font-weight: 400`），之後用 > 400 就會模擬加粗；但會同設計稿睇落唔同（粗體字變得更粗），要截圖再對。

### W-027 「商業字體唔入 repo」嘅防線淨係睇 `assets/fonts/`（`styles/fonts.node.test.ts:83-88`、`.gitignore`）
- **L1**：D45 / 決定 4「用戶自己嘅字體……唔可以入 repo（repo 係公開嘅）」；Implementation Plan T-044「商業字體檔唔入 repo」；Technical Spec:1093「`.gitignore` 加一條防誤入（建議）」（未做）。
- **L2**：實測（scratch copy）：喺 `assets/fonts/` 加多個檔，guard 測試會紅。但將同一個 woff2 放去 `apps/player/public/fonts/lubalin.woff2` 或者 `src/assets/lubalin.otf`，9 個 test 全綠；`.gitignore` 冇擋任何字體副檔名；lint、typecheck、CI 都唔會捉到。
- **L3**：用戶就快要處理 Lubalin 檔（U-14，上載去 bucket），本機好可能有一份；`public/` 係放靜態檔嘅自然位置。一旦 push 咗，公開 repo 嘅 git 歷史好難清乾淨，係授權問題。
- **方案 A（推薦）**：`.gitignore` 加 `*.otf`、`*.ttf`、`*.woff`、`*.woff2`、`*.eot`，再用 `!apps/player/src/assets/fonts/rokkitt-*-latin1.woff2` 放行；同埋將 guard 改成全 repo：`scripts/ci` 用 `git ls-files` 搵字體副檔名同 magic bytes（`wOF2`、`wOFF`、`OTTO`、`00010000`），只准兩個 Rokkitt（hash 鎖死），喺 CI 跑。**方案 B**：淨係 `.gitignore`；`git add -f` 擋唔到，CI 都唔知。

## Suggestion（入 backlog，唔 block）

- **S-110** `styles/fontSource.ts:26-31`：query 或 fragment 以 `\` 收尾嘅網址（例如 `…woff2?x=\`）會令 `url("…\")` 跳脫咗收尾引號；build 照綠、冇 warning，但出嚟嘅 CSS 淨低一個冇 `src` 嘅 `RB Slab`，`RB Slab Light` 都冇埋（實測）。網址有 `user:pw@` 都照寫入公開 CSS。`remoteFontUrl` 拒絕有 `\`（或者轉做 `%5C`）同有 `username` / `password` 嘅網址，加入 `it.each`。
- **S-111** `vite.config.ts:59-62`：transform 對唔到檔（例如將 `fonts.css` 改成經 `global.css` 嘅 `@import` 引入，或者搬咗位）就靜靜雞冇遠端字體（實測，冇 warning），但 SW 嘅 CacheFirst 規則照加。plugin 記住換咗幾多個標記，設咗網址但 `buildEnd` 時係 0 就 `this.error`；或者加測試鎖住 `main.tsx` 直接 import `./styles/fonts.css`。
- **S-112** `styles/fontSource.ts:52-61`：CacheFirst 冇 expiration：bucket 同一個網址換咗檔，已經 cache 咗嘅機永遠用舊檔；換網址之後舊檔一直留喺 `r-gram-remote-font`。`.env.example` 寫明「換檔要改檔名或者加 `?v=`」，再加 `expiration: { maxEntries: 1 }` 清走舊嗰個。
- **S-113** 文件：Technical Spec:725、:1086-1087、:1162 同 Implementation Plan U-14 改用 `VITE_FONT_URL`，刪走或者標「未做」`VITE_SLAB_FONT_BOLD_URL`；寫低 T-044 定咗嘅做法（`RB Slab` / `RB Slab Light` 兩個 family、遠端一個檔頂替兩個 family、Rokkitt Latin-1 subset 由設計稿抽出）。U-14 一定要喺用戶動手之前改好，否則佢設咗變數都冇效。
- **S-114** 測試漏洞：`useTextMeasure` 改成永遠唔換量字函數，`App.test.tsx` 嘅 W-017 測試照綠；Chromium 實測都 fit 得啱。原因係 `useFontsVersion` 令 App re-render，而 InfoBlock 每次 render 都重新 fit（S-076），canvas 本身已經用新字體。所以而家真正起作用嘅係 re-render，唔係換函數；做 S-076（`useMemo` 以量字函數做 key）之後換函數先會有用，到時要確認呢條測試鎖得住。
- **S-115** 讀 code：遠端檔同 Rokkitt 喺同一個 `@font-face`，所以遠端檔冇嘅字唔會跌去 Rokkitt，而係跌去 Rockwell / serif；Rokkitt subset 冇 Latin Extended-A（例如 `ā`、`ł`）。RubberBand 嘅碟名同歌名應該用唔到，記入 R-009 嘅 E2E 截圖就夠。

## 做得好嘅地方

`fontSource.ts` 係純函數（Node 嘅 config 同測試共用），用 `URL` 正規化同淨收 https，SW 規則用 anchor 咗嘅 regex 只對準嗰一個網址，仲只 cache status 200，諗得周到。W-017 用「render 期間調整 state」換量字函數，唔使等 effect 用舊字多量一次。S-072 改用 reducer，將「暫停時 swing 照計時」寫成純函數 `leadInOnPose`，條件清楚，好易測。

## 修訂代碼（只列 Warning 涉及嘅位）

```css
/* W-026 方案 B（PM 揀方案 A 就唔使改，只改 spec）：每個檔宣告自己嘅真字重，超過嘅由瀏覽器模擬 */
@font-face {
    font-family: 'RB Slab';
    font-weight: 400; /* 遠端 Lubalin Book；Rokkitt ExtraBold 用作 400 嘅替身（設計稿 SLAB） */
    font-display: swap;
    src: local('ITC Lubalin Graph Std Book'), /* … */ /* remote-font */ url('../assets/fonts/rokkitt-extrabold-latin1.woff2') format('woff2');
}
```

```gitignore
# W-027：商業字體永遠唔入 repo（D45）；只放行隨 app 嘅 Rokkitt
*.otf
*.ttf
*.eot
*.woff
*.woff2
!apps/player/src/assets/fonts/rokkitt-extrabold-latin1.woff2
!apps/player/src/assets/fonts/rokkitt-light-latin1.woff2
```

```handoff-receipt
protocol: 1
status: pass
score: 90/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "99.57% statements / 95.79% branches (developer full-suite run at 1b52312; scoped 128/128 green)"
  no_critical: pass
  security_scan: n/a
next_action: merge_develop
next_agent: quality-assurance
branch: "claude/charming-cannon-8yulp0"
context: "T-044 + W-017 + S-072..S-075 (apps/player) pass 90/100, no Critical. No develop branch: stay on the claude/ branch and run QA S1 for player-foundation and player-core (T-042/T-035/T-044). Fonts verified: both WOFF2 are Rokkitt (OFL, Copyright 2016 The Rokkit Project Authors), byte-identical to the mockup; no other font data anywhere in repo or history. W-017 fixed (title overflow 1016.9 -> 59pt at 1001.6 in Chromium). S-072..S-075 fixed; new tests fail on pre-fix code. Two Warnings: W-026 font-weight 100 900 stops the synthetic bold that D45/Tech Spec require (matches mockup; PM decides: write 'no synthetic bold' into spec, or declare real weights); W-027 commercial-font guard only checks assets/fonts (add .gitignore rules + repo-wide CI check). S-110..S-115 to backlog; S-113 (spec/U-14 still say VITE_SLAB_FONT_URL, code uses VITE_FONT_URL) must be fixed before the user does U-14."
blockers: []
```
