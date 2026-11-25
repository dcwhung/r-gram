/*
 * 初始資料（`apps/api/seed/discography.json`、`credits.json`）嘅型別：只列 seed 會讀嘅欄位。
 * 兩個檔由 `_design_/tools/` 嘅 script（parse_discography.py、parse_credits.py）由原始頁面生成，
 * 唔人手改；仲有其他參考欄（封面網址、影片、來源備註等），呢度唔理。
 */
import type { ReleaseCategory } from '../schema/releaseCategory';

export interface SeedTrack {
    no: number;
    title: string;
    subtitle: string | null;
}

export interface SeedAlbum {
    /** 初始次序（0 起）：先類別（來源檔次序），後序號（Functional Spec D47，建議） */
    order: number;
    id: string;
    /** CR-004（FR-124）：發行類別同類別內序號，照來源檔 */
    category: ReleaseCategory;
    categoryNo: number;
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
