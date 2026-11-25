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
    /**
     * CR-006（Functional Spec D63、D44）：只有年份（可選，`YEAR_MIN` 至 `YEAR_MAX`）；冇發行日期。
     * 冇自由文字「類型」：要顯示就由 `category` 喺各 app 語言檔攞中文名
     */
    year: number | null;
    /**
     * CR-004（FR-124）、Technical Spec API-072：發行類別同類別內序號（由 1 起），必填。播放端唔顯示。
     * 舊版 app 存喺本機、冇呢兩個欄嘅 catalog 驗唔過，播放端當冇本機副本（未部署過，冇舊播放端要兼容）
     */
    category: ReleaseCategory;
    categoryNo: number;
    label: string;
    /** 專輯色 `#rrggbb` */
    accent: string;
    /** 封面檔名（相對 `imageBase`） */
    cover: string | null;
    thumb: string | null;
    /**
     * CR-005（D55、FR-125）：可選嘅第二張封面同佢嘅縮圖（相對 `imageBase`）。冇呢兩個欄嘅舊 document 照樣有效；
     * 有就一定成對，亦一定有 `cover`。專輯色永遠跟第一張（冇第二張專輯色）
     */
    cover2?: string | null;
    thumb2?: string | null;
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
