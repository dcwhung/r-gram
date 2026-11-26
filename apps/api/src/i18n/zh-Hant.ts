/*
 * Worker 自己出嘅文字：中文書面語，唔用口語字（test/writtenChinese.test.ts 鎖住）。
 * 規則（backlog B-044）：所有 API 錯誤回應嘅 message 都係呢度嘅中文書面語；管理端可以直接顯示，
 * 亦可以按 `code` / `details[].reason` 用自己嘅語言檔砌字（code 同 reason 係穩定介面，message 唔係）。
 * - auth：登入流程嘅三個頁
 * - errors：守門（401、403）同通用 404 / 500 嘅 message
 * - albums：專輯 API（T-022）錯誤回應嘅 message 同每個欄位錯誤（details[].reason）嘅 message；
 *   `{name}` 係參數，由 fillMessage() 填入
 * - tracks：歌曲 API（T-023）：同上，另加歌曲文字逐行錯誤（reason = packages/catalog 嘅錯誤碼）同唔擋儲存嘅提示
 * - assets：封面上載（API-050）同公開圖（API-071）嘅錯誤（T-024）
 * - catalog：生成 catalog（API-061）同公開內容（API-070、API-072）嘅錯誤（T-026）
 * - scan：掃描（API-030、API-031、API-032；T-025）嘅錯誤、檔案原因同套用逐項結果
 */
export const zhHant = {
    appName: 'R Gram 管理端',
    errors: {
        /** 401 UNAUTHORIZED */
        unauthorized: '尚未登入或登入已逾時，請重新登入。',
        /** 403 FORBIDDEN_ORIGIN */
        forbiddenOrigin: '請求來源不符，已拒絕處理。',
        /** 404 NOT_FOUND（冇呢個路徑） */
        notFound: '找不到指定的路徑。',
        /** 500 INTERNAL */
        internal: '伺服器發生錯誤，請稍後再試。',
        /** 500 INTERNAL：Worker 設定不完整（validateEnv） */
        misconfigured: '伺服器設定不完整，請通知管理員。',
    },
    auth: {
        /** 白名單外嘅帳戶（403） */
        denied: {
            title: '沒有權限',
            message: '此帳戶沒有管理權限。',
            action: '使用其他 Google 帳戶登入',
        },
        /** state cookie 過期 / 唔啱 / 冇 code（400） */
        loginExpired: {
            title: '登入逾時',
            message: '登入已逾時或無效，請重新登入。',
            action: '重新登入',
        },
        /** Google token endpoint 出錯 / ID token 唔啱（502） */
        loginFailed: {
            title: '登入失敗',
            message: '未能透過 Google 登入，請稍後再試。',
            action: '重新登入',
        },
    },
    albums: {
        /** error.message（按情況，唔係按 code：CONFLICT 有兩個情況） */
        errors: {
            invalid: '資料有誤，請修正後再儲存。',
            notFound: '找不到指定的專輯。',
            stale: '專輯資料已被其他操作更新，請重新載入後再修改。',
            idTaken: '此專輯 ID 已被使用。',
            orderChanged: '專輯列表已變更，請重新載入後再排序。',
            idRemoved:
                '刪除後，播放端會即時移除此專輯，聽眾本機對此專輯的收藏及續播亦會失效。確認後請再次刪除。',
        },
        /** details[].message：key = details[].reason */
        reasons: {
            REQUIRED: '必須填寫。',
            NOT_AN_OBJECT: '內容必須為 JSON 物件。',
            NOT_EDITABLE: '此欄位不可修改。',
            /** `{max}` = UNKNOWN_FIELDS_MAX（errors.ts 填入） */
            TOO_MANY_UNKNOWN_FIELDS: '無法識別的欄位過多，只列出前 {max} 個。',
            /** `{max}` = ALBUM_ID_MAX_CHARS（errors.ts 填入） */
            INVALID_ID:
                '只可使用小寫英文字母、數字及單個連字號（首尾不可為連字號），不可為保留字，最多 {max} 個字元。',
            INVALID_TEXT: '必須為文字，且不可包含換行、控制字元或不可見的格式字元。',
            TOO_LONG: '字數超出上限。',
            INVALID_WHEEL_KEY:
                '必須為一至兩個字，前後不可有空白，亦不可包含控制字元或不可見的格式字元。',
            /** `{min}`、`{max}` = YEAR_MIN、YEAR_MAX（errors.ts 填入；CR-006：專輯只有年份） */
            INVALID_YEAR: '年份必須為 {min} 至 {max} 的整數。',
            INVALID_COLOUR: '顏色必須為 #rrggbb 格式。',
            INVALID_FOLDER:
                '資料夾名稱不可為空白或「.」，不可包含「..」，不可以「_」開頭（保留給非專輯資料夾），亦不可包含斜線、反斜線、?、#、%、換行、控制字元或不可見的格式字元。',
            /** `{list}` = RELEASE_CATEGORIES（errors.ts 填入） */
            INVALID_CATEGORY: '發行類別必須為以下其中一個：{list}。',
            /** `{max}` = CATEGORY_NO_MAX（errors.ts 填入） */
            INVALID_ORDINAL: '序號必須為 1 至 {max} 的整數。',
            ORDINAL_TAKEN: '同一發行類別內已有專輯使用此序號，請改用其他序號。',
            UNKNOWN_ASSET: '找不到此圖片，請重新上載。',
            /** CR-005（D55）：第二張封面同佢嘅縮圖要一齊設定、一齊移除 */
            UNPAIRED_COVER2: '第二張封面與其縮圖必須同時設定或同時移除。',
            /** CR-005（D55）：冇第一張封面唔可以有第二張；移除第一張之前要先移除第二張，或者同一次移除兩張 */
            COVER2_WITHOUT_COVER:
                '必須先有第一張封面才可設定第二張封面；如要移除第一張封面，請先移除第二張封面，或同時移除兩張。',
            INVALID_LIST: '必須為不重複的專輯 ID 列表。',
        },
    },
    tracks: {
        /** error.message（按情況） */
        errors: {
            invalid: '資料有誤，請修正後再儲存。',
            notFound: '找不到指定的歌曲。',
            albumNotFound: '找不到指定的專輯。',
            stale: '歌曲資料已被其他操作更新，請重新載入後再修改。',
            /** 409 CONFLICT：同一張碟已有歌用呢個歌號（CR-006，Functional Spec D60） */
            numberTaken: '歌號已被使用，請改用其他歌號。',
            idRemoved:
                '刪除後，播放端會即時移除此歌曲，聽眾本機對此歌曲的收藏及續播亦會失效。確認後請再次刪除。',
            lyricsRemoved: '儲存後會清除這首歌現有的歌詞，確定要繼續嗎？確認後請再次儲存。',
            /** `{max}` = SONG_TEXT_MAX_BYTES 嘅 KB 數 */
            tooLarge: '歌曲文字超出 {max} KB 的上限。',
        },
        /** details[].message：key = details[].reason */
        reasons: {
            REQUIRED: '必須填寫。',
            NOT_AN_OBJECT: '內容必須為 JSON 物件。',
            NOT_EDITABLE: '此欄位不可修改。',
            /** `{max}` = UNKNOWN_FIELDS_MAX */
            TOO_MANY_UNKNOWN_FIELDS: '無法識別的欄位過多，只列出前 {max} 個。',
            NOT_TEXT: '必須為文字。',
            INVALID_TEXT: '必須為文字，且不可包含換行、控制字元或不可見的格式字元。',
            /** `{max}` = NOTE_MAX_CHARS */
            TOO_LONG: '字數超出上限（最多 {max} 個字）。',
            INVALID_URL: '必須為以 https:// 開頭的有效網址。',
            INVALID_MEDIA_KEY:
                '檔案路徑不可為空白、不可以「/」開頭、不可包含「..」、控制字元或不可見的格式字元，長度亦有上限。',
            MEDIA_NOT_FOUND: '媒體庫中找不到此檔案。',
            /** `{min}`、`{max}` = TRACK_NO_MIN、TRACK_NO_MAX（CR-006：歌號跟檔名，可以跳號） */
            INVALID_NUMBER: '歌號必須為 {min} 至 {max} 的整數。',
            NUMBER_TAKEN: '同一張專輯內已有歌曲使用此歌號，請改用其他歌號。',
            /** `{max}` = TRACK_NO_MAX：冇指定歌號時用「最大歌號 + 1」，已經到上限 */
            NUMBER_EXHAUSTED: '自動編號已超出上限 {max}，請自行指定歌號。',
            /** 以下係歌曲文字（path = text）逐行嘅錯誤；`{max}` 由 tracks/errors.ts 按 packages/catalog 嘅上限填入 */
            TOO_LARGE: '歌曲文字超出大小上限。',
            TOO_MANY_LINES: '歌曲文字最多 {max} 行。',
            TITLE_REQUIRED: '第一行必須是歌名。',
            TITLE_TOO_LONG: '歌名最多 {max} 個字。',
            DUPLICATE_LABEL: '此標籤已出現過，每項只可填寫一次。',
            CREDIT_TOO_LONG: '曲、詞、編、監每項最多 {max} 個字。',
            LINE_TOO_LONG: '每行歌詞最多 {max} 個字。',
            MIXED_TIMESTAMPS:
                '此行沒有時間標記（其他歌詞行都有）。請補上，或者全部歌詞都不加時間標記。',
            BAD_TIMESTAMP: '時間標記格式不正確，應為 [分:秒.百分秒]，例如 [01:23.45]。',
            BAD_OFFSET: '[offset:] 的值必須為整數毫秒。',
        },
        /** 唔擋儲存嘅提示（200 / 201 回應嘅 hints[]）：key = hints[].reason */
        hints: {
            LABEL_AFTER_BLANK_LINE:
                '此行看似標籤，但前面有空行，因此已當作歌詞儲存。如屬標籤，請刪除前面的空行。',
            /** CR-007（Functional Spec D72）：舊檔嘅「副題：」行照收但唔用 */
            SUBTITLE_IGNORED: '副題已不再使用，此行已略過。',
        },
    },
    assets: {
        /** error.message（按情況） */
        errors: {
            invalid: '圖片無法使用，請重新裁切後再上載。',
            unsupportedType: '只接受 WebP、JPEG 或 PNG 圖片，而且檔案內容必須與宣告的格式相符。',
            /** `{max}` = IMAGE_MAX_BYTES 嘅 MB 數 */
            tooLarge: '圖片超出 {max} MB 的上限。',
            notFound: '找不到指定的圖片。',
        },
        /** details[].message：key = details[].reason */
        reasons: {
            INVALID_IMAGE: '無法讀取圖片的格式資料，檔案可能已損壞。',
            /** `{cover}`、`{thumb}` = 兩個封面尺寸（像素） */
            INVALID_DIMENSIONS: '圖片必須為 {cover} × {cover} 或 {thumb} × {thumb} 像素的正方形。',
        },
    },
    catalog: {
        /** error.message（按情況） */
        errors: {
            /** 404 NOT_READY：未生成過 catalog.json */
            notReady: '播放端內容尚未生成，請稍後再試。',
            /** 404 NOT_FOUND：歌詞檔 */
            notFound: '找不到指定的檔案。',
            /** 422 INVALID_DOCUMENT */
            invalidDocument: '內容檔未能通過驗證，播放端會繼續使用上一份內容。',
            /** 502 CATALOG_WRITE_FAILED */
            writeFailed: '內容檔未能寫入，播放端會繼續使用上一份內容，請稍後重試。',
        },
    },
    scan: {
        /** error.message（按情況） */
        errors: {
            invalid: '資料有誤，請修正後再試。',
            notFound: '找不到指定的專輯。',
            /** 404 FOLDER_EMPTY */
            folderEmpty: '媒體庫中找不到此專輯的資料夾，或資料夾內沒有檔案。',
        },
        /** details[].message、skipped[] / unmatchedFiles[] / 歌曲文字檔錯誤嘅 message：key = reason */
        reasons: {
            REQUIRED: '必須填寫。',
            NOT_AN_OBJECT: '內容必須為 JSON 物件。',
            NOT_EDITABLE: '此欄位不可修改。',
            /** `{max}` = UNKNOWN_FIELDS_MAX */
            TOO_MANY_UNKNOWN_FIELDS: '無法識別的欄位過多，只列出前 {max} 個。',
            /** `{min}`、`{max}` = TRACK_NO_MIN、TRACK_NO_MAX */
            INVALID_NUMBER: '歌號必須為 {min} 至 {max} 的整數。',
            NOT_A_LIST: '必須為列表。',
            /** `{max}` = SCAN_APPLY_MAX_ITEMS */
            TOO_MANY_ITEMS: '每次最多套用 {max} 項，請分批套用。',
            INVALID_VALUE: '格式不正確。',
            NOT_IN_FOLDER: '檔案不在此專輯的資料夾內。',
            NOT_IN_ALBUM: '此歌曲不屬於這張專輯。',
            WRONG_FILE: '檔案類別或歌號與此項目不符。',
            DUPLICATE_ITEM: '同一首歌或同一個歌號在此類項目中重複出現。',
            INVALID_PREFIX:
                '路徑必須為空白或以「/」結尾的資料夾路徑，不可以「/」開頭，不可包含「..」，第一層亦不可以「_」開頭。',
            NO_AUDIO: '此歌號在資料夾內沒有音檔，因此不會匯入。',
            AUDIO_CONFLICT: '此歌號有多於一個音檔，請先只保留一個，才可建立歌曲。',
            NO_FIRST_COVER: '沒有第一張封面，因此不會匯入第二張封面。',
            /** 資料夾同時有 cover.jpg 同 cover.png（S-139） */
            FIRST_COVER_CONFLICT: '第一張封面有多於一個檔案，請先只保留一個，才可匯入第二張封面。',
            UNKNOWN_EXTENSION: '無法識別此檔案類別。',
            NO_TRACK_NUMBER: '檔名開頭沒有 1 至 999 的歌號。',
            BAD_ENCODING: '歌曲文字檔必須為 UTF-8 編碼。',
            FILE_NOT_FOUND: '媒體庫中已找不到此檔案。',
        },
        /** 套用（API-031）逐項失敗嘅 message：key = 結果嘅 code */
        items: {
            STALE: '檔案或歌曲在掃描後已更改，未有套用，請重新掃描。',
            NO_AUDIO: '此歌號現時沒有音檔，未有套用。',
            NUMBER_TAKEN: '同一張專輯內已有歌曲使用此歌號，未有建立。',
            LYRICS_REMOVED: '套用後會清除這首歌現有的歌詞，請確認後再套用。',
            VALIDATION_ERROR: '歌曲文字有格式錯誤，未有套用。',
            MANUAL_KEPT: '此歌曲的檔案為手動指定，掃描不會更改。',
            NOT_FOUND: '找不到指定的歌曲。',
            /** 套用此項時出 exception（review W-035）：未能確認寫入咗未，所以叫管理員重新掃描 */
            INTERNAL: '套用此項時發生錯誤，未能確認是否已套用，請重新掃描。',
        },
    },
} as const;
