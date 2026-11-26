/* `info.txt`（Functional Spec D68、FR-128）嘅型別 */
import type { Check } from '../sync/checks';

export interface AlbumInfoTrack {
    no: number;
    title: string;
}

/** `formatAlbumInfo()` 嘅輸入（D1 而家嘅資料；冇 `info.txt` 時文字框嘅範本） */
export interface AlbumInfoFields {
    title: string;
    year: number | null;
    tracks: readonly AlbumInfoTrack[];
}

export interface AlbumInfo {
    /**
     * false = 成個檔用唔到（太大，INFO_TOO_LARGE）：同步唔用佢（之前用過就沿用 D1，否則曲目由音檔決定，S-164）。
     * true 而冇曲目 = 檔讀到，只係冇列歌
     */
    usable: boolean;
    /** 冇、空或者太長 = null（同步用專輯 id 做碟名，D68） */
    title: string | null;
    year: number | null;
    /** 按歌號排；`line` = 嗰行喺檔入面嘅行號（由 1 開始） */
    tracks: (AlbumInfoTrack & { line: number })[];
    /** 按行號排；講成個檔嘅（冇 `line`）排最尾 */
    checks: Check[];
}
