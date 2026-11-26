-- R Gram 內容資料（Technical Spec「數據庫設計」，CR-003 之後：冇上下架、冇發佈記錄；
-- CR-004：發行類別、序號、封面同歌曲文字嘅來源 ETag；CR-007：媒體 bucket 係唯一來源，D1 係由 bucket 砌嘅索引）。
-- D1 未部署過，所以 CR-003 至 CR-007 直接改呢個檔，唔加新 migration。
-- 時間欄一律 ISO 8601 UTC 字串（sessions.expires_at 例外：epoch ms）。
-- CHECK 只鎖結構上唔會變嘅規則（id 格式、0 / 1、狀態值）；長度上限等可調嘅規則由 packages/catalog validator 管。
-- TEXT PRIMARY KEY 喺 SQLite 唔會自動 NOT NULL，所以逐個寫明。

-- assets：R2 已經有嘅圖（content hash 檔名，同一張圖只上載一次）
--   name：<sha256 前 16 hex>.<ext>（catalog/v1/img/ 底下）
CREATE TABLE assets (
    name TEXT PRIMARY KEY NOT NULL,
    content_type TEXT NOT NULL,
    bytes INTEGER NOT NULL,
    created_at TEXT NOT NULL
);

-- albums：一隻碟一行 = 媒體 bucket rb-discography 第一層一個 <category>-<NN>-<id> 資料夾（CR-007，Functional Spec D67）
--   id：資料夾名入面嘅 id；^[a-z0-9]+(-[a-z0-9]+)*$（同 packages/catalog isAlbumId），建立後不變；
--       'favourites' 係播放端虛擬專輯嘅保留字
--   folder：實際嘅資料夾名（packages/catalog parseAlbumFolder() 讀得到 id、類別、序號）；一張碟一個，唔可以共用
--   category、category_no：由資料夾名讀；同類別同序號照收（只出檢查結果，D67）
--   title、year：由 info.txt 讀（冇 info.txt = 碟名用 id、冇年份；年份範圍由 packages/catalog 驗）
--   accent：第一張封面抽出嘅色；冇封面 = 中性灰
--   cover / thumb、cover2 / thumb2：同步嘅封面處理結果（API-017）；冇第一張唔可以有第二張（CHECK）
--   cover_source_etag、cover2_source_etag：處理過嘅封面來源檔（cover.jpg｜png、cover2.jpg｜png）嘅 R2 ETag
--   info_etag：上次讀到嘅 info.txt 嘅 R2 httpEtag；NULL = 資料夾冇 info.txt
--   checks：最近一次同步呢個資料夾嘅檢查結果（JSON array，packages/catalog Check；最多 CHECKS_MAX 條）
--   字母盤標記同轉盤次序唔儲存：生成時由 wheelKeyFor(title) 同 albumOrder() 計（D69）
--   updated_at 兼做 If-Match
CREATE TABLE albums (
    id TEXT PRIMARY KEY NOT NULL CHECK (
        id <> ''
        AND id <> 'favourites'
        AND id NOT GLOB '*[^a-z0-9-]*'
        AND id NOT GLOB '-*'
        AND id NOT GLOB '*-'
        AND id NOT GLOB '*--*'
    ),
    title TEXT NOT NULL,
    year INTEGER,
    category TEXT NOT NULL CHECK (category IN ('album', 'ep', 'best', 'live', 'ost', 'single')),
    category_no INTEGER NOT NULL CHECK (category_no >= 1),
    accent TEXT NOT NULL,
    cover TEXT REFERENCES assets (name),
    cover_source_etag TEXT,
    thumb TEXT REFERENCES assets (name),
    cover2 TEXT REFERENCES assets (name) CHECK (cover2 IS NULL OR cover IS NOT NULL),
    thumb2 TEXT REFERENCES assets (name),
    cover2_source_etag TEXT,
    folder TEXT NOT NULL UNIQUE,
    info_etag TEXT,
    checks TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(checks) AND json_type(checks) = 'array'),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- tracks：一首歌一行 = info.txt 曲目表嘅一行（CR-007，D70；冇 info.txt 時由音檔歌號）
--   id：^[a-z0-9-]+$（同 packages/catalog isTrackId），建立後不變（建立時 = trackIdFor(album_id, no)，撞咗用隨機）
--   no：歌號 = info.txt 嘅歌號，1 至 999（packages/catalog TRACK_NO_MIN / TRACK_NO_MAX），可以跳號
--   audio_key / mv_key：資料夾入面同歌號嘅音檔 / MV；audio_key NULL = 冇音檔（播放端灰色行）
--   composer、lyricist、arranger、producer：由歌曲文字檔（NN 名.txt）
--   text_key：嗰首歌嘅歌曲文字檔 key（文字框讀寫用）；NULL = 冇
--   text_source_etag：上次匯入嘅歌曲文字檔嘅 R2 ETag；NULL = 未匯入過
CREATE TABLE tracks (
    id TEXT PRIMARY KEY NOT NULL CHECK (id <> '' AND id NOT GLOB '*[^a-z0-9-]*'),
    album_id TEXT NOT NULL REFERENCES albums (id) ON DELETE CASCADE,
    "no" INTEGER NOT NULL CHECK ("no" BETWEEN 1 AND 999),
    title TEXT NOT NULL,
    audio_key TEXT,
    mv_key TEXT,
    composer TEXT,
    lyricist TEXT,
    arranger TEXT,
    producer TEXT,
    text_source_etag TEXT,
    text_key TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 專輯頁列歌；保證歌號唔重覆（同步按 (album_id, no) upsert）
CREATE UNIQUE INDEX tracks_album_no ON tracks (album_id, "no");

-- lyrics：獨立一張表，歌曲列表查詢唔使拎歌詞原文；冇歌詞 = 冇呢一行
--   source：歌曲文字入面歌詞部分嘅原文（packages/catalog parseSongText 正規化後，回填文字框用）
--   synced：1 = 有時間標記（同步歌詞）；0 = 純文字（Functional Spec D32）
--   json_name：R2 lyrics/<hash>.json 檔名
CREATE TABLE lyrics (
    track_id TEXT PRIMARY KEY NOT NULL REFERENCES tracks (id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    synced INTEGER NOT NULL CHECK (synced IN (0, 1)),
    json_name TEXT NOT NULL,
    line_count INTEGER NOT NULL,
    updated_at TEXT NOT NULL
);

-- catalog_state：得一行（id = 1），記低而家 R2 嗰份 catalog.json；冇發佈記錄、冇 diff、冇還原
--   未生成過就冇呢一行；每次嘗試生成都 upsert
--   status：最近一次生成嘅結果；failed = D1 比 catalog.json 新（管理端顯示提示同重試）
--   hash：而家 R2 嗰份 document JSON 嘅 sha256（= catalog.json 嘅 ETag）
--   hash、generated_at、album_count、track_count：而家嗰份嘅資料；生成失敗時保留上一份，
--     未成功過就係 NULL。status = 'ok' 時一定有
--   updated_at / updated_by：最近一次嘗試（admin email）；error：失敗原因
CREATE TABLE catalog_state (
    id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
    status TEXT NOT NULL CHECK (status IN ('ok', 'failed')),
    hash TEXT,
    generated_at TEXT,
    album_count INTEGER,
    track_count INTEGER,
    updated_at TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    error TEXT,
    CHECK (
        status = 'failed'
        OR (
            hash IS NOT NULL
            AND generated_at IS NOT NULL
            AND album_count IS NOT NULL
            AND track_count IS NOT NULL
        )
    )
);

-- sessions：只存 token 嘅 SHA-256 hex（D1 漏咗都用唔到）；expires_at 係 epoch ms
CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL,
    expires_at INTEGER NOT NULL
);

-- 清過期 session
CREATE INDEX sessions_expires_at ON sessions (expires_at);
