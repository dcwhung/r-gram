# 臨時測試 catalog（T-113）

`catalog.json` 是供真機試用播放端的臨時測試資料，由參考資料 `apps/api/seed/*.json` 生成，**並非正式內容**：沒有封面，大部分音檔網址（按資料夾規則推算）暫時並不存在。
在部署設定把 `VITE_CATALOG_URL` 設為 `/test-catalog/catalog.json` 即可使用。
重新生成：在 repo 根執行 `node scripts/dev/build-test-catalog.mjs`（`--audio=none` 則全部歌曲沒有音檔），不可人手修改；測試會比對檔案與生成結果。
第一次正式部署（T-041）之前，必須刪除本資料夾、生成 script 及其測試，並改用正式的 `VITE_CATALOG_URL`。
