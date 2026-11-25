# QA — player-home、player-fonts（+ player-core、player-foundation、repo-scaffold 重驗）— 2026-11-25 — S1

- Tier: T2（T-042、T-035、T-044；修正 W-017、W-027、S-072 – S-075）| Commit: `bce4dde`（code 最後改動：`apps/player` = `e88c605`，`scripts/ci` + `.gitignore` = `2252840`）| Verdict: ✅ pass | Hard Gates: all pass
- Ledger（`impact --since 9d0c9d6`）: SKIP 8（`api-albums`、`api-assets`、`api-auth`、`api-catalog`、`api-tracks`、`catalog-core`、`catalog-song-text`、`player-catalog`）/ REVERIFY 3（`player-core` 18 個 path、`player-foundation` 16、`repo-scaffold` 1：`.gitignore`）/ UNCOVERED 43 → 新鏈 `player-home`（30 個檔）、`player-fonts`（13 個檔，連 `scripts/ci/font-guard.*`）
- Plans: 新 [`plans/player-home.md`](plans/player-home.md)、[`plans/player-fonts.md`](plans/player-fonts.md)。[`player-core.md`](plans/player-core.md)、[`player-foundation.md`](plans/player-foundation.md) 只改 Scope 一行（排除新鏈嘅檔；`TurntableShell.tsx` 已刪）。每個檔只屬一條鏈。`font-guard.*` 放 `player-fonts`（同一個需求 FR-041 / W-027）；`CLAUDE.md` 寫 `scripts/ci` 屬 `repo-scaffold`，main agent 更新 chain 表時請寫明呢個例外

## Runs
| Command | Result | Time |
| --- | --- | --- |
| `npm run lint`、`typecheck`、`build -w apps/player`、`coverage`（全部 workspace 一次；SKIP 嘅鏈順帶跑到，唔當重驗） | exit 0、exit 0、build 成功（JS 254 kB / gzip 81 kB、2 個 woff2、precache 7 項）；**1113 / 1113**，statements 99.57% / branches 95.79% / functions 99.58% / lines 99.87%；改過嘅 player 檔 statements ≥ 95.45%、lines 100% | 6 + 5 + 4 + 28 s |
| `VITE_FONT_URL` 五個值各 build 一次（scratchpad outDir）：冇設定、`https://media.example.com/fonts/lubalin.woff2`、`http://…`、`javascript:alert(1)`、`https://media.example.com/a");}body{color:red}/*.woff2` | 全部 exit 0；`http`、`javascript` 有 `VITE_FONT_URL is not an https URL` 警告兼冇遠端 `url()`；`sw.js` 只喺有效值先有遠端 runtime cache | 5 × 4 s |
| Scratch clone（repo 外）：`scaleAngle` 4 個 mutant（除 `positions`／固定 11.25°／♥ 唔喺弧尾／冇專輯放弧頭）；守衛：`git add -f` `_design_/Lubalin.otf`、`deep/dir/F.WOFF`、改 Rokkitt 一個 byte | mutant 4 / 4 被捉（6、7 連 29–30 張碟螺絲淨空、1、1 個 test fail）；守衛 3 / 3 fail（第三個係 SHA-256），原狀 4 / 4 pass | 40 s |
| Browser（Chromium，harness = 真 `App` + 示範 catalog，`127.0.0.1` 靜態 server；production build 另外驗） | 120 項全過（唱臂 20、主頁 69、字體 / 超長文字 19、小燈位置 2；probe 自己寫錯 3 項，改 probe 重跑一次）。**對外請求：共 261 個；被封 4 個，全部係假網址 `media.example.com`（遠端字體「載入唔到」嘅測試，build 帶假值，兩次執行各 2 個）；其他全部去 `127.0.0.1`** | 約 3 分鐘 |

## 驗收標準（player-home）
| AC | 結果 | 證據 |
| --- | --- | --- |
| AC-1 唱臂 | ✅ | 每格取樣（393 × 852）：泊位 176°；開場 0–600 ms 升針 scale 1.018、落影 (14, 25)、燈熄、碟停；656 ms 到 99°；690 ms 開始放低、840 ms 落到；小燈同碟 823 ms 先郁（650 + 160）。暫停：一直 99°、1.018、(14, 25)、燈熄、碟停、標籤「播放」；繼續：角度冇郁過，176 ms 放低。S-072：300 ms 暫停 + 450 ms 再播 → 820 ms 先著燈；300 ms 暫停唔再播 → 停喺升針、冇著燈，之後繼續只放低。MV：返 176°、唱片夾 `aria-disabled`、㩒唱片夾冇反應；收返仍然泊位，再播行足兩段（828 ms 著燈）。減少動態：30 ms 內到終點，三個 transition 0s，碟 `animation-name: none`。小燈位置（設計單位）泊位 (280, 422.6)、落針 (850.8, 954.9) = 上次凍結值 |
| AC-2 左上資訊 | ✅ | 三個尺寸：碟名 70／192／88／字距 1、`RB Slab`；年份 74／244／29／6、`RB Slab Light`、「2026」；橫線 y 234、長 98、粗 3.5、專輯色；歌名 128／318／44；三條棒 = 設計稿 (74, 294.4, 8 × 21.6)…；心形中心 y 302、`aria-hidden`；「第 01 首 · 0:00」74／368／22／3；版本 1008／118／22／3、靠右、`v0.1.0`。超長：14 字中文歌名縮到 37；英文長歌名「…Many…」、中文 23 字截短，32 號，「…」前冇空格，心形右邊 ≤ 743（上限 768）；長英文碟名 48 號截短、右邊 971；長中文碟名縮到 54 |
| AC-3 細掣同唱片夾 | ✅ | 未揀歌：歌書、MV `aria-disabled="true"`，歌書 `aria-pressed="false"`，模式冇燈，唱片夾「開啟歌單」。播緊：歌書、MV 用得，模式著燈，唱片夾「暫停」；歌書 `aria-pressed="true"` 兼著燈；暫停模式熄燈；MV 開住 MV 掣著燈、唱片夾 `aria-disabled="true"`（S-073）。標籤全部 = 語言檔書面語 |
| AC-4 歌單暗層 | ✅ | 三粒細掣 `tabIndex -1`、外層 `aria-hidden="true"`；Tab 只到「關閉歌單」同「播放」；暗層 Enter 收返之後 focus = 唱片夾（S-074）。平時 Tab：歌書 → MV → 播放模式 → 唱片夾，全部有 focus 圈 |
| AC-5 版面 | ✅ | 393 × 852：貼底組 `translate(0 421.37)` = 多出嘅高度；左上資訊、版本號、頂部螺絲嘅設計單位位置同 360 × 640 一樣（< 2 單位，字形 box 取整）；左下螺絲離底 47.9 單位兩個尺寸一樣；1280 × 800 置中 (415, 450 闊)。冇重覆 id、冇指空 `url(#…)`；console 冇 error / warning；頁面唔捲。碟以專輯 id 做 key：`HomeScene.test.tsx`「should mount a new disc…」（UI 未可以換碟，T-036） |

## 驗收標準（player-fonts）
| AC | 結果 | 證據 |
| --- | --- | --- |
| AC-1 – AC-3 來源、設定值、隨 app 字體 | ✅ | 冇設定：`local()` 三個 Lubalin 名 → Rokkitt；假網址：`local()` → `url("https://media.example.com/fonts/lubalin.woff2") format("woff2")` → Rokkitt；`http`／`javascript` = 冇設定；帶 `");}` 嘅值被 percent-encode，瀏覽器讀到兩條 `@font-face`、`body` 冇變紅。production build：兩個 woff2 由 `127.0.0.1` 載入、兩個 family `loaded`、Service Worker cache 有兩個 Rokkitt；遠端假網址被封，照樣 `loaded`（Rokkitt）、頁面正常 |
| AC-4 用喺邊 | ✅ | CDP 實際字體：碟名 Rokkitt ExtraBold、年份 / 版本號 / 歌號行 Rokkitt Light（「第」「首」用系統中文字體） |
| AC-5 W-017 | ✅ | 字體遲 2.5 秒：「THE GREATEST HITS COLLECTION」56 → 55、「WWW…」54 → 52、「KOMOREBI KOMOREBI KO」72 → 73，載入後 = 字體一開始就有嘅結果；右邊全部 ≤ 1004 |
| AC-6 守衛 | ✅ | 見 Runs；兩個 SHA-256 = 守衛表；`git check-ignore`：`*.otf` 等細楷副檔名（連 `public/fonts/`、`assets/fonts/other.woff2`）忽略，兩個 Rokkitt 冇忽略 |

## 重驗
- `player-core`（18 個 path）：AC-2 – AC-6 喺上面嘅 browser check 入面重行：唱片夾三個標籤、`pressable`（Enter、Tab、`covered`）、`MetalButton` 停用 / 著燈、唱臂幾何、`SvgDefs` memo 後 id 冇重覆、減少動態；snapshot 同單元測試喺 1113 之內。AC-1 reducer 冇改，引用 ledger
- `player-foundation`（16 個 path）：AC-1 / AC-2 幾何（刻度弧固定 185° – 376.25°、平均分佈、♥ 喺弧尾；1 – 30 張碟淨空同感應範圍；mutation 證明 assertion 係真）；AC-3 舞台（同上 AC-5）；AC-4 i18n（新字串書面語，`writtenChinese.test.ts` 過）；AC-5 token（650 / 160 / 120 ms = `tokens.css` = 實測）；`vite.config.ts` 嘅字體部分喺 `player-fonts` 驗。PWA gate：precache 清單見 AC-3；vN → vN+1 等 T-039
- `repo-scaffold`（`.gitignore`）：lint、typecheck、`@r-gram/repo-scripts` 喺 coverage 入面全綠；CI `45650086110` 喺 `bce4dde` 綠

## Findings（冇 🔴 / 🟡）
- 🟢 S-116 `.gitignore` 嘅字體規則分大細楷：`x/b.TTF`、`.OTF` 冇被忽略（`git check-ignore`）；守衛測試照捉到（`F.WOFF` 實測 fail），所以唔會入 repo，只係本機 `git status` 會見到。可以加 `*.[oO][tT][fF]` 之類（backlog）
- 🟢 S-117 Vite 警告 `configLoader: 'native'` 唔支援 `vite.config.ts` 冇副檔名嘅 import（`./src/i18n/zh-Hant`、今次新加嘅 `./src/styles/fontSource`）；而家冇影響，Vite 將來轉預設先會壞（backlog）
- Observation：`SmallButtons.tsx` branches 71.42%（`?? 0` 退路；statements / lines 100%）；全域門檻 80% 冇 fail。守衛只睇副檔名，W-027 方案 A 提過嘅 magic bytes 冇做。`impact` 仍然列已刪嘅 `TurntableShell.tsx` 做 UNCOVERED（script 將刪咗嘅 path 當改動；檔案唔存在，base 過咗佢就消失）

## 建議補測
- none（S-072 兩個次序、超長文字、字體遲到都有單元測試）。T-040 加 Playwright 時將唱臂時間線同字體遲到 probe 寫成 e2e spec

```handoff-receipt
protocol: 2
status: pass
score: n/a
stage: S1
ledger: "SKIP 8 / REVERIFY 3 (player-core, player-foundation, repo-scaffold) / UNCOVERED 43 (new chains player-home, player-fonts)"
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "99.57%"
next_action: end
next_agent: null
branch: "claude/charming-cannon-8yulp0"
context: "T-042/T-035/T-044 S1 pass at bce4dde: 1113/1113, coverage 99.57%, browser 120/120 (harness + production build), 4 geometry mutants and 3 font-guard cases caught in a scratch clone. 261 browser requests, 4 aborted (all to the dummy media.example.com). New chains player-home (30 files) and player-fonts (13 files incl. scripts/ci/font-guard.*); Scope lines of player-core and player-foundation edited; 5 chains frozen. No blocking finding; 2 Minor (S-116 case-sensitive .gitignore font rules, S-117 Vite native config loader warning), 2 Observations. QA files uncommitted: main agent commits, adds player-home and player-fonts to CLAUDE.md (note font-guard ownership) and the index."
```
