-- R Gram 內容資料（Technical Spec「數據庫設計」，CR-003 之後：冇上下架、冇發佈記錄；
-- CR-004：發行類別、序號、封面同歌曲文字嘅來源 ETag）。
-- D1 未部署過，所以 CR-003、CR-004 直接改呢個檔，唔加新 migration。
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

-- albums：一隻碟一行
--   id：^[a-z0-9]+(-[a-z0-9]+)*$（同 packages/catalog isAlbumId），建立後不變；
--       'favourites' 係播放端虛擬專輯嘅保留字
--   category：發行類別短名（packages/catalog RELEASE_CATEGORIES；串法待用戶確認，Functional Spec D43）
--   category_no：類別內序號，由 1 起；同類別唔可以重覆由 API 驗（唔加 UNIQUE：兩張碟對調序號要分兩步改）
--   cover_source_etag：上次由掃描套用嘅封面來源（cover.jpg｜png）嘅 R2 ETag；NULL = 未套用過
--   cover2 / thumb2：可選嘅第二張封面同縮圖（CR-005，Functional Spec D55）；冇第一張唔可以有第二張（CHECK）；
--     兩個欄一齊有或者一齊冇由 API 驗
--   cover2_source_etag：上次由掃描套用嘅第二張封面來源（cover2.jpg）嘅 R2 ETag；規則同 cover_source_etag
--   folder：媒體 bucket rb-discography 入面嘅資料夾名（NULL = 用預期資料夾名 <category>-<NN>-<id>，
--     由 packages/catalog expectedFolder() 計；字元規則由 API 驗）
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
    wheel_key TEXT NOT NULL,
    release_date TEXT,
    year INTEGER,
    type TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL CHECK (category IN ('album', 'ep', 'best', 'live', 'ost', 'single')),
    category_no INTEGER NOT NULL CHECK (category_no >= 1),
    label TEXT NOT NULL DEFAULT '',
    accent TEXT NOT NULL,
    cover TEXT REFERENCES assets (name),
    cover_source_etag TEXT,
    thumb TEXT REFERENCES assets (name),
    cover2 TEXT REFERENCES assets (name) CHECK (cover2 IS NULL OR cover IS NOT NULL),
    thumb2 TEXT REFERENCES assets (name),
    cover2_source_etag TEXT,
    folder TEXT,
    sort_order INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX albums_sort_order ON albums (sort_order);

-- tracks：一首歌一行
--   id：^[a-z0-9-]+$（同 packages/catalog isTrackId），建立後不變
--   audio_manual / mv_manual：1 = 手動指定，掃描唔蓋
--   lyrics_source_url、note、youtube_id、video_kind：參考欄，唔入 catalog
--   text_source_etag：上次由掃描套用嘅歌曲文字檔（NN 名.txt）嘅 R2 ETag；NULL = 未套用過。人手儲存唔改佢
CREATE TABLE tracks (
    id TEXT PRIMARY KEY NOT NULL CHECK (id <> '' AND id NOT GLOB '*[^a-z0-9-]*'),
    album_id TEXT NOT NULL REFERENCES albums (id) ON DELETE CASCADE,
    "no" INTEGER NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    audio_key TEXT,
    audio_manual INTEGER NOT NULL DEFAULT 0 CHECK (audio_manual IN (0, 1)),
    mv_key TEXT,
    mv_manual INTEGER NOT NULL DEFAULT 0 CHECK (mv_manual IN (0, 1)),
    composer TEXT,
    lyricist TEXT,
    arranger TEXT,
    producer TEXT,
    lyrics_source_url TEXT CHECK (
        lyrics_source_url IS NULL OR lyrics_source_url GLOB 'https://*'
    ),
    note TEXT,
    text_source_etag TEXT,
    youtube_id TEXT,
    video_kind TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 專輯頁列歌；保證歌號唔重覆
CREATE UNIQUE INDEX tracks_album_no ON tracks (album_id, "no");

-- 搵其他專輯同名歌（由同名歌帶入）
CREATE INDEX tracks_title ON tracks (title);

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
--   updated_at / updated_by：最近一次嘗試（admin email 或者 seed）；error：失敗原因
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
