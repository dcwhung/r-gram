-- 0002：下一次同步重新讀晒全部歌曲文字檔（擁有人決定 2026-11-27：曲 / 詞 / 編 / 監認 prefix，
-- 歌名同標籤之間有空行都照讀做 credit；之前呢啲行當咗歌詞）。
-- 同步只會讀 R2 ETag 同 tracks.text_source_etag 唔同嘅 `.txt`，冇改過嘅檔永遠唔會用新規則再解析；
-- 清走 text_source_etag（= 未匯入過）之後，下一次同步逐首重新讀、重新解析，重寫 credit、歌詞同歌詞 JSON。
-- 只改呢一欄：updated_at 唔郁（同步按 updated_at 防同時寫入），冇歌曲文字檔嘅歌本身已經係 NULL。
-- 同步只讀媒體 bucket，唔會寫返 `.txt`
UPDATE tracks SET text_source_etag = NULL WHERE text_source_etag IS NOT NULL;
