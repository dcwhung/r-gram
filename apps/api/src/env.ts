/* Worker bindings（wrangler.toml）+ vars + secrets */
export interface Env {
    DB: D1Database;
    /** private：catalog.json、封面圖、歌詞 JSON */
    CATALOG: R2Bucket;
    /**
     * 媒體 bucket rb-discography：音檔、MV、封面來源、`info.txt`、歌曲文字檔（公開網址直出）。Worker 讀；
     * 只會經 media/writeText.ts 寫 `info.txt` 同 `NN ….txt`（T-106），永遠唔 delete
     */
    MEDIA: R2Bucket;
    GOOGLE_CLIENT_ID: string;
    /** secret */
    GOOGLE_CLIENT_SECRET: string;
    /** secret：state cookie 嘅 HMAC key */
    SESSION_SECRET: string;
    /** 逗號分隔 */
    ADMIN_EMAILS: string;
    /** 逗號分隔：CORS 只回呢度 match 到嘅 origin */
    PLAYER_ORIGINS: string;
    /** Worker 自己嘅 origin：OAuth redirect、CSRF Origin 檢查、catalog 圖 URL */
    WORKER_ORIGIN: string;
    /** 媒體 bucket（rb-discography）嘅公開網址（/ 結尾），寫入 catalog.json 嘅 mediaBase */
    MEDIA_BASE: string;
}
