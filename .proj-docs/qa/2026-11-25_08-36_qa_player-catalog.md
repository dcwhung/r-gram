# QA — player-catalog（+ player-foundation 局部重驗）— 2026-11-25 — S1

- Tier: T2（T-031，新模組）| Commit: HEAD `4922e80`（code 最後改喺 `ca7ba95`；`git diff ca7ba95..4922e80 -- apps packages scripts` 係空）| Verdict: ✅ pass | Hard Gates: all pass（PWA、Performance 唔適用；Security / Data 由 AC-2、AC-4 覆蓋）
- Ledger（`impact --since cbd855b`）: SKIP 4（`api-auth`、`catalog-core`、`player-core`、`repo-scaffold`）/ REVERIFY 1（`player-foundation`：只有 `vite-env.d.ts`）/ UNCOVERED 12 → 新鏈 `player-catalog`
- Plan: [`plans/player-catalog.md`](plans/player-catalog.md)（新）。[`plans/player-foundation.md`](plans/player-foundation.md) 只改咗 Scope 一行（唔包 `player-catalog` 嘅檔，同上次 `player-core` 嘅做法一樣）；所以 foundation 喺同一個 hash 重新 freeze。`vite-env.d.ts` 留喺 `player-foundation`

## Runs

| Command | Result | Time |
| --- | --- | --- |
| `npm run lint`、`npm run typecheck`、`npm run build -w apps/player` | exit 0、exit 0、build 成功（JS 241 kB、gzip 77 kB、precache 5 項；catalog 未接 UI，所以 bundle 冇變） | 6 + 6 + 6 s |
| `npm run coverage`（全部 workspace 一次；SKIP 嘅鏈係順帶跑到，唔當重驗） | 50 個檔、581 / 581；statements 99.59% / branches 96.7% / functions 99.41% / lines 99.9%；`src/catalog` 100 / 97.72 / 100 / 100（`defaultDeps.ts:18` 一個 `??` 分支） | 22 s |
| Probe（scratchpad；esbuild bundle 真 `loader` / `catalogStore` / `defaultDeps` / `selectors`，Node 22 真 `fetch` 對 `127.0.0.1` 本機 server；預期由 spec 寫） | 77 / 77。**對外請求：41 個本機請求，全部去 `127.0.0.1`；被拒 0 個**（冇用瀏覽器） | 2 s |

## 驗收標準

| AC | 結果 | 證據 |
| --- | --- | --- |
| AC-1 新鮮載入 + 真資料來回 | ✅ | 真 seed（`seedToCatalog`，17 碟 / 262 首，奇數首有音檔）經 `http://127.0.0.1` 載入 → `ready/network` 28 ms；`rgram.catalog.v1` = `{ document, etag: "\"h1\"" }`（57 625 bytes），document 同 server 嗰份逐 byte 一樣，再過 validator。停 server 再載 → `ready/cache/network`、同一份；冇副本 → `unavailable/network` |
| AC-2 每類失敗 fallback + 原因 | ✅ | 11 類 × 有 / 冇副本：冇網址 → `notConfigured`；關閉嘅 port → `network`；冇 header → `timeout`（401 ms，limit 400）；**S-043** header 到咗、body 寫咗 5 000 bytes 之後卡住 → `timeout`（404 ms）唔係 `invalid`；404 `NOT_READY`、500（body 有效都唔用）、bare 304 → `http`；HTML、空 body → `invalid`；`mediaBase` 係 http、`albums` 唔係 array → `invalid`。有副本 = `ready/cache/<原因>`，冇 = `unavailable/<原因>` |
| AC-3 唔蓋走好嘅 | ✅ | 上面 11 類失敗之後，本機副本字串同之前逐 byte 一樣 |
| AC-4 壞副本 = 冇 | ✅ | 8 種：唔係 JSON、`null`、`[]`、冇 `{ etag, document }` 外殼、`etag` 係數字、改咗 http `mediaBase`、track id 改成數字、`version` 999 → 全部 `unavailable`；壞副本之後一次成功載入會換走佢 |
| AC-5 Storage 拋錯 | ✅ | `getItem` / `setItem` 都拋 → 網絡 OK 照 `ready/network`、失敗 `unavailable/http`；storage = null 一樣；`localStorage` getter 拋錯 → `browserStorage()` = null；**S-048** 注入 `write` 會拋嘅 store → resolve `ready/network` |
| AC-6 永遠 resolve；timer 清走 | ✅ | fetch 同步拋錯、回 `null`、回冇 `json()` 嘅物件、網址唔合法 → 全部 resolve 去 cache；全部 probe 冇一次 reject。**S-044** timeout 60 s：成功、404、網絡錯 resolve 之後 `process.getActiveResourcesInfo()` 嘅 Timeout 數 0 → 0（冇 timer 留低，process 2 s 完）；150 ms 回應、limit 1 s → `network` 冇被 abort |
| AC-7 Selectors（真 seed） | ✅ | `dialAlbums` 次序 = `discography.json` 次序（17）；17 隻碟 `albumTracks` 次序啱；262 首 `findTrack` 全部回自己嗰隻碟、同一個物件；未知 id → `null` / `[]`；125 首 `audio === null` 全部唔播得、其餘全部播得；`playableTracks` 保持次序；第 3 隻碟清空 → 過 validator、`dialAlbums` 仍然 17、`albumTracks` = `[]`；selectors 冇改 document |

## 重驗（player-foundation：只有 `vite-env.d.ts` 變咗，其餘引用 ledger @`dff2750`，冇重跑）

- `vite-env.d.ts` 只加 `ImportMetaEnv.VITE_CATALOG_URL?: string`（型別，冇 runtime）：typecheck exit 0（`defaultDeps.ts` 用到）；build 照舊；`defaultCatalogDeps()` 喺 build 定義下讀到網址、`timeoutMs` = `CATALOG_FETCH_TIMEOUT_MS`（8000）。冇影響 AC-1 – AC-6

## Findings（冇 🔴 / 🟡；以下唔 block，由 main agent 決定入唔入 backlog）

- 🟢 Minor（S-048 嘅另一邊）：注入一個 `read` 會拋錯嘅 store，`loadCatalog` 會 reject（probe 實測）。`createCatalogStore` 自己 catch 晒，真 app 唔會發生，冇違反任何 AC；`CatalogStore` 介面註明「唔可以拋錯」或者 `fallBack` 包 try 就夠。
- Observation：`CATALOG_FETCH_TIMEOUT_MS` 8 秒係 developer 定（TS 只寫「有 timeout」）；如果之後 spec 定數值，跟 spec。

## 建議補測

- no edge case gap（S-043 / S-044 / S-048 嘅修正都有對應 unit test，probe 冇搵到漏咗嘅情況）。T-034 接 UI 之後，Preload 嘅「錯誤 + 重試掣」同離線用本機副本應該寫入 T-040 嘅 e2e。

```handoff-receipt
protocol: 2
status: pass
score: n/a
stage: S1
ledger: "SKIP 4 / REVERIFY 1 (player-foundation: vite-env.d.ts) / UNCOVERED 12 (player-catalog)"
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "99.59%"
next_action: end
next_agent: null
branch: "claude/charming-cannon-8yulp0"
context: "T-031 S1 pass: player-catalog AC-1 to AC-7 (581/581, coverage 99.59%, catalog 100% statements; Node probe 77/77 with real fetch on 127.0.0.1 incl. seed round trip 17/262, S-043/S-044/S-048 confirmed fixed; 0 outside requests). player-foundation re-verified for vite-env.d.ts only; its plan Scope line now excludes player-catalog files. Both chains frozen at 4922e80. 1 Minor (injected store.read that throws rejects; real store cannot), 1 Observation. QA files uncommitted: main agent commits and adds player-catalog to CLAUDE.md chains and the index."
```
