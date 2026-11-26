# Test Plan — api-albums

- Chain: 專輯 API（`apps/api`）：唯讀列表 + 統計（API-010）、讀取（API-012）、同步嘅封面結果（API-017）、寫入後置步驟接口、內容 API 共用（錯誤、欄位、`updated_at`）。任務 T-022；CR-007（T-104、T-106）之後專輯由同步建立，人手新增、修改、刪除、排序（API-011、013、014、015）取消
- AC（L1 來源：TS = Technical Spec v1.7「API 一覽嘅變化」「資料模型」API-017；FS = Functional Spec v1.9 D69、D74、D80；之前嘅 AC-3 – AC-7、AC-10 – AC-13 寫入部分 CR-007 作廢）:
    - AC-1 守門（TS「安全設計」授權 / CSRF）：全部 `/api/albums*` 冇 session 一律 401；寫入 Origin ≠ `WORKER_ORIGIN` 一律 403，資料不變；讀唔使 Origin
    - AC-2 列表（TS API-010；FS D69、D80、D35 第 4 版待確認唔 block）：次序 `albumOrder()`（類別 → 序號 → id）；每張碟 `wheelKey` 由碟名計（`wheelKeyFor`）、`checkCount`、`hasInfo`（跟 `info_used`，W-046）；統計 = 歌曲已有音檔、歌詞、MV，專輯已有封面；冇 `label`、`sortOrder`
    - AC-3 讀取（TS API-012）：專輯 + 歌 + `checks`；冇 `label`、`subtitle`、手動指定、參考欄；唔存在 404
    - AC-4 封面結果（TS API-017；FS D74、D55；backlog B-052 ①、B-067 ②；review S-186、S-187、W-048）：body 太大 413（未 parse）；`sourceKey` 要係呢張碟資料夾第一層同一個位（`cover`／`cover2`）；兩張圖要已上載（`assets` + R2，否則 `IMAGE_NOT_FOUND`）；`cover` 1200²、`thumb` 320²、非正方形 → 400 `WRONG_SIZE`；圖只用 range 讀檔頭；`accent` 只收 `#rrggbb` 而且只喺第一張；`cover2` 冇第一張 → 409 `NO_FIRST_COVER`（連同時清走第一張）；來源 ETag 唔同 → 409 `STALE`；專輯喺讀入之後改過 → 409 `STALE`；寫完生成 catalog；唔寫媒體 bucket
    - AC-5 寫入後置步驟（TS API-061）：只喺成功寫入之後行；hook throw → 照回成功、`catalog: { ok: false }`；`skipPostWrite` 唔生成
    - AC-6 訊息（CLAUDE.md 介面文字規則）：`message`、`details[].message` 係中文書面語，冇未填 `{…}`
    - AC-7 取消嘅 route（TS「API 一覽嘅變化」）：`POST /api/albums`、`PATCH`／`DELETE /api/albums/:id`、`PUT /api/albums/order` → 404（`test/removedRoutes.test.ts` 屬 `api-auth`）
- Scope files:
    - `apps/api/src/albums/{cover,coverBody,coverStore,errors,overview,routes,rows,store}.ts`、`src/api/{afterWrite,errors}.ts`、`src/lib/{fields,updatedAt}.ts`、`src/i18n/fillMessage.ts`
    - `apps/api/test/{albumsList,albumCover,afterWrite,fillMessage,updatedAt}.test.ts`、`test/albumFixtures.ts`
    - 1-hop（唔喺呢條鏈 freeze）：`src/albums/info.ts`（`api-writeback`）；`src/assets/{imageHeader,imageName,webp}.ts`（`api-assets`）；`src/sync/checkMessages.ts`、`media/listing.ts`（`api-sync`）；`src/tracks/rows.ts`（`api-tracks`）；`src/api/routes.ts`、`src/config.ts`、`src/lib/http.ts`、`src/i18n/zh-Hant.ts`（`api-auth`）；`@r-gram/catalog`（`catalog-core`）
- Commands:
    - `npm run lint`、`npm run typecheck`、`npm run coverage`（全部 workspace 一次；門檻 80%）
- Probe（scratchpad，唔入 repo）：workerd vitest，經 `src/index.ts` 打真 session cookie；API-050 上載真 WebP；D1 proxy 喺 `UPDATE albums SET cover` 之前改 `updated_at`／`checks`（S-187）；R2 proxy 記低 `get` 嘅 `range`（S-186）；Sanity mutant（W-048 嘅 N19、N21、N30、N31）
- PWA gate: no。Performance gate: no（API-017 約 11 個操作）。Security / Data gate: yes（AC-1、AC-4）
- Out of scope: 同步本身（`api-sync`）；`info.txt` 文字框（`api-writeback`）；`COVER_FAILED` 儲存（S-185 未建）；D80 統計等用戶確認（U-8）
