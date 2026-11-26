# Test Plan — api-tracks

- Chain: 歌曲共用 code（`apps/api/src/tracks`）：歌曲文字解析同歌詞 JSON（`songText.ts`：`putLyrics`、`parseText`）、`saveSongText`／`findTrackText`（`store.ts`）、指定歌號新增（`insertNumbered.ts`、`ids.ts`）、冇人用嘅歌詞檔清理（`lyricsCleanup.ts`）、歌 row 形狀（`rows.ts`）、錯誤（`errors.ts`）、route 表（`routes.ts`）。任務 T-023、T-102；CR-007（T-104、T-106）之後歌由同步建立，API-020 – 022 取消，API-040 / 041 搬去 `api-writeback`
- AC（L1 來源：TS = Technical Spec v1.7「資料模型 → tracks」「已完成嘅 code：保留、改寫、拎走」；FS = Functional Spec v1.9 D61、D71、D72；之前嘅 AC-2、AC-6、AC-7 CR-007 作廢）:
    - AC-1 守門：`/api/tracks/*` 冇 session 一律 401；寫入跨站 403
    - AC-2 歌 id（FS D61；TS「tracks」）：建立時 `<albumId>-<NN>`（100 以上三位），撞咗用 `<albumId>-<6 位隨機>`；之後不變；同步並發唔會撞號、冇孤兒歌詞檔
    - AC-3 歌曲文字欄（FS D72；TS「tracks」）：`saveSongText` 寫 credit、歌詞行、`text_source_etag`、`text_key`；冇 `subtitle`、手動指定、參考欄；歌詞 JSON 先寫 R2 再寫 D1，舊檔冇人用先刪（catalog 生成成功之後）
    - AC-4 逐行錯誤同上限（TS API-041）：`parseText` 逐行錯誤帶行號；超過 `SONG_TEXT_MAX_BYTES` → `tooLarge`；`hints` 唔擋
    - AC-5 取消嘅 route（TS「API 一覽嘅變化」）：`POST /api/albums/:id/tracks`、`PATCH`／`DELETE /api/tracks/:id` → 404（`test/removedRoutes.test.ts` 屬 `api-auth`）
    - AC-6 訊息（CLAUDE.md 介面文字）：`message`、`details[].message`、`hints[].message` 係中文書面語，冇未填 `{…}`；`code` 同 spec 一致
- Scope files:
    - `apps/api/src/tracks/{errors,ids,insertNumbered,lyricsCleanup,routes,rows,songText,store}.ts`
    - `apps/api/test/messageParams.test.ts`、`test/trackFixtures.ts`
    - 1-hop（唔喺呢條鏈 freeze）：`src/tracks/text.ts`、`test/tracksText.test.ts`（`api-writeback`）；`src/sync/{trackWrite,syncTracks}.ts`、`test/{syncFolder,lyricsCleanupBatch}.test.ts`（`api-sync`，經佢哋行呢條鏈嘅 code）；`src/api/errors.ts`、`src/lib/{fields,updatedAt}.ts`（`api-albums`）；`src/config.ts`、`migrations/0001_init.sql`（`api-auth`）；`song-text`（`catalog-song-text`）
- Commands:
    - `npm run lint`、`npm run typecheck`、`npm run coverage`（全部 workspace 一次；門檻 80%）
- Probe（scratchpad，唔入 repo）：經 `api-sync`／`api-writeback` 嘅 workerd probe 行呢條鏈（同步建立歌、寫歌詞 JSON、確認移除清歌詞檔）
- PWA gate: no。Performance gate: no。Security / Data gate: yes（AC-3、AC-4）
- Out of scope: `ids.ts` 隨機後備 id 而家冇 test 行到（同步唔會撞 `<albumId>-<NN>`；backlog S-195）；`/catalog/v1/lyrics/*` 公開讀取（`api-catalog`）；管理端 UI
