/*
 * 內容檔（`/catalog/v1/catalog.json`）嘅型別。Technical Spec API-070。
 * 包全部專輯同歌（冇上下架），次序 = 管理端次序；每次儲存之後由 D1 重新生成。
 * 「冇值」一律用 null：除咗 `type` 同 `label`，空字串唔合法（生成時要將 D1 入面嘅 '' 轉做 null）。
 */
import type { ReleaseCategory } from './releaseCategory';

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
    /** 媒體 bucket（`rb-discography`）入面嘅 key；null = 未有音檔（播放端顯示灰色） */
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
    /**
     * CR-004（FR-124）：發行類別同類別內序號（由 1 起）。播放端唔顯示；兩個一齊出現或者一齊冇。
     * Backend 生成嘅 catalog 一定有；選填只係因為舊 fixture 冇（未部署過，冇舊播放端要兼容）
     */
    category?: ReleaseCategory;
    categoryNo?: number;
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
