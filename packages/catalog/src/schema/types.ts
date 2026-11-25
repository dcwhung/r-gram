/*
 * 已發佈內容（`/catalog/v1/catalog.json`）嘅型別。Technical Spec API-070。
 * 只包已上架嘅專輯同歌，次序 = 管理端次序。
 */
export const CATALOG_VERSION = 1;

/** 曲 / 詞 / 編 / 監：管理端輸入嘅原文字串（多個名用「 / 」分隔只係慣例，播放端照原文顯示） */
export interface TrackCredits {
    composer: string | null;
    lyricist: string | null;
    arranger: string | null;
    producer: string | null;
}

export const CREDIT_FIELDS = ['composer', 'lyricist', 'arranger', 'producer'] as const;
export type CreditField = (typeof CREDIT_FIELDS)[number];

export interface CatalogTrack {
    /** 建立後不變（用戶本機收藏靠佢） */
    id: string;
    no: number;
    title: string;
    subtitle: string | null;
    /** 四個欄都冇就成個係 null */
    credits: TrackCredits | null;
    /** `r-gram-media` 入面嘅 key；null = 未有音檔（播放端顯示灰色） */
    audio: string | null;
    mv: string | null;
    /** 歌詞 JSON 檔名（相對 `lyricsBase`） */
    lyrics: string | null;
}

export interface CatalogAlbum {
    id: string;
    title: string;
    /** 字母盤標記，1–2 個字 */
    wheelKey: string;
    /** `YYYY-MM-DD` */
    releaseDate: string | null;
    year: number | null;
    type: string;
    label: string;
    /** 專輯色 `#rrggbb` */
    accent: string;
    /** 封面檔名（相對 `imageBase`） */
    cover: string | null;
    thumb: string | null;
    tracks: CatalogTrack[];
}

export interface CatalogDocument {
    version: typeof CATALOG_VERSION;
    /** ISO 8601 */
    generatedAt: string;
    mediaBase: string;
    imageBase: string;
    lyricsBase: string;
    albums: CatalogAlbum[];
}
