-- R Gram 內容資料（Technical Spec「數據庫設計」）。
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
--   folder：r-gram-media 入面嘅資料夾名（NULL = 用 id）
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
    label TEXT NOT NULL DEFAULT '',
    accent TEXT NOT NULL,
    cover TEXT REFERENCES assets (name),
    thumb TEXT REFERENCES assets (name),
    folder TEXT,
    sort_order INTEGER NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX albums_sort_order ON albums (sort_order);

-- tracks：一首歌一行
--   id：^[a-z0-9-]+$（同 packages/catalog isTrackId），建立後不變
--   audio_manual / mv_manual：1 = 手動指定，掃描唔蓋
--   lyrics_source_url、note、youtube_id、video_kind：參考欄，唔入 catalog
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
    youtube_id TEXT,
    video_kind TEXT,
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 專輯頁列歌；保證歌號唔重覆
CREATE UNIQUE INDEX tracks_album_no ON tracks (album_id, "no");

-- 搵其他專輯同名歌（複製 credit / 歌詞）
CREATE INDEX tracks_title ON tracks (title);

-- lyrics：獨立一張表，歌曲列表查詢唔使拎歌詞原文
--   lrc：管理員貼入嘅 LRC 原文；json_name：R2 lyrics/<hash>.json 檔名
CREATE TABLE lyrics (
    track_id TEXT PRIMARY KEY NOT NULL REFERENCES tracks (id) ON DELETE CASCADE,
    lrc TEXT NOT NULL,
    json_name TEXT NOT NULL,
    line_count INTEGER NOT NULL,
    updated_at TEXT NOT NULL
);

-- publishes：每次發佈記一行；先寫 pending，R2 寫成功先轉 ok。最大 id（PK）= 最新一次
--   hash：document JSON 嘅 sha256（= catalog.json 嘅 ETag）
--   ids：JSON，今次發佈嘅專輯 id + 歌 id（ID 守衛用）；summary：JSON，變更摘要
CREATE TABLE publishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'ok', 'failed')),
    hash TEXT NOT NULL,
    document TEXT NOT NULL,
    ids TEXT NOT NULL,
    album_count INTEGER NOT NULL,
    track_count INTEGER NOT NULL,
    summary TEXT NOT NULL,
    error TEXT
);

-- sessions：只存 token 嘅 SHA-256 hex（D1 漏咗都用唔到）；expires_at 係 epoch ms
CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL,
    expires_at INTEGER NOT NULL
);

-- 清過期 session
CREATE INDEX sessions_expires_at ON sessions (expires_at);
