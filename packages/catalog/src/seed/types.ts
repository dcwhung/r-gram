/*
 * 初始資料（`apps/api/seed/discography.json`、`credits.json`）嘅型別：只列 seed 會讀嘅欄位。
 * 兩個檔由 `_design_/tools/` 嘅 script 由原始頁面生成，仲有其他參考欄（來源備註等），呢度唔理。
 */
export interface SeedTrack {
    no: number;
    title: string;
    subtitle: string | null;
}

export interface SeedAlbum {
    order: number;
    id: string;
    wheelKey: string;
    title: string;
    releaseDate: string | null;
    year: number | null;
    type: string;
    label: string;
    tracks: SeedTrack[];
}

export interface SeedDiscography {
    albums: SeedAlbum[];
}

export interface SeedCreditTrack {
    no: number;
    title: string;
    /** 原始資料標明搵唔到 */
    missing: boolean;
    composer: string | null;
    lyricist: string | null;
    arranger: string | null;
    producer: string | null;
    lyricsUrl: string | null;
    note: string | null;
}

export interface SeedCreditAlbum {
    albumId: string;
    tracks: SeedCreditTrack[];
}

export interface SeedCredits {
    albums: SeedCreditAlbum[];
}
