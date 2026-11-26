/*
 * Worker 自己出嘅文字：中文書面語，唔用口語字（test/writtenChinese.test.ts 鎖住）。
 * 規則（backlog B-044）：所有 API 錯誤回應嘅 message 都係呢度嘅中文書面語；管理端可以直接顯示，
 * 亦可以按 `code` / `details[].reason` 用自己嘅語言檔砌字（code 同 reason 係穩定介面，message 唔係）。
 * - auth：登入流程嘅三個頁
 * - errors：守門（401、403）同通用 404 / 500 嘅 message
 * - albums：專輯 API（T-022；CR-007 之後唯讀）錯誤回應嘅 message；`{name}` 係參數，由 fillMessage() 填入
 * - tracks：歌曲 API（T-023）：同上，另加歌曲文字逐行錯誤（reason = packages/catalog 嘅錯誤碼）同唔擋儲存嘅提示
 * - assets：封面上載（API-050）同公開圖（API-071）嘅錯誤（T-024）
 * - catalog：生成 catalog（API-061）同公開內容（API-070、API-072）嘅錯誤（T-026）
 * - sync：同步（API-033、API-034、API-035；T-105）嘅錯誤、逐項結果同檢查結果嘅句子
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
        /** error.message（CR-007：唯讀，只有 404） */
        errors: {
            notFound: '找不到指定的專輯。',
        },
    },
    tracks: {
        /** error.message（按情況） */
        errors: {
            invalid: '資料有誤，請修正後再儲存。',
            notFound: '找不到指定的歌曲。',
            stale: '歌曲資料已被其他操作更新，請重新載入後再修改。',
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
    sync: {
        /** error.message（按情況） */
        errors: {
            invalid: '資料有誤，請修正後再試。',
            /** 400 INVALID_FOLDER */
            invalidFolder: '資料夾名稱不符合「類別-序號-id」的格式，或屬於保留的資料夾。',
            /** 404 FOLDER_EMPTY */
            folderEmpty: '媒體庫中找不到此資料夾，或資料夾內沒有檔案。',
            /** 409 DUPLICATE_ALBUM_ID */
            duplicateAlbumId: '另一個資料夾亦使用相同的專輯 id，請只保留一個資料夾後再掃描。',
        },
        /** details[].message：key = details[].reason */
        reasons: {
            REQUIRED: '必須填寫。',
            NOT_AN_OBJECT: '內容必須為 JSON 物件。',
            NOT_EDITABLE: '此欄位不可修改。',
            /** `{max}` = UNKNOWN_FIELDS_MAX */
            TOO_MANY_UNKNOWN_FIELDS: '無法識別的欄位過多，只列出前 {max} 個。',
            /** `{min}`、`{max}` = TRACK_NO_MIN、TRACK_NO_MAX */
            INVALID_NUMBER: '歌號必須為 {min} 至 {max} 的整數。',
            NOT_A_LIST: '必須為列表。',
            /** `{max}` = SYNC_REMOVALS_MAX */
            TOO_MANY_ITEMS: '每次最多確認 {max} 項，請分批確認。',
            INVALID_VALUE: '格式不正確。',
        },
        /** 歌曲文字檔檔案層面嘅錯誤（第 0 行；其餘逐行錯誤用 tracks.reasons） */
        fileReasons: {
            BAD_ENCODING: '歌曲文字檔必須為 UTF-8 編碼。',
            FILE_NOT_FOUND: '媒體庫中已找不到此檔案。',
        },
        /** 確認移除（API-035）同同步（API-034）逐項失敗嘅 message：key = 結果嘅 code */
        items: {
            STILL_PRESENT: '檔案或資料夾仍在媒體庫中，未有移除。',
            STALE: '資料在掃描後已更改，未有處理，請重新掃描。',
            NOT_FOUND: '找不到指定的專輯或歌曲。',
            /** 處理此項時出 exception（review W-035）：未能確認寫入咗未，所以叫管理員重新掃描 */
            INTERNAL: '處理此項時發生錯誤，未能確認是否已完成，請重新掃描。',
        },
        /** 檢查結果入面「第幾行」（歌曲文字檔逐行錯誤） */
        linePlace: '第 {line} 行',
        /**
         * 檢查結果（Functional Spec D77；albums.checks）嘅 message：key = code。參數由同步填（packages/catalog checkOf）；
         * `{reason}` 換做歌曲文字錯誤嘅句子，`{place}` 換做「第幾行」
         */
        checks: {
            INVALID_FOLDER_NAME: '資料夾名稱不符合格式：「{folder}」。',
            DUPLICATE_ALBUM_ID:
                '專輯 id「{id}」同時用於多個資料夾（{folders}），只會使用原有的資料夾。',
            DUPLICATE_ORDINAL: '資料夾「{other}」的類別及序號與此專輯相同，次序會按 id 排列。',
            NO_INFO: '找不到 info.txt，唱片名稱暫用「{title}」。',
            INFO_CONFLICT: '資料夾內有多於一個 info.txt，此檔不會使用。',
            /** S-164：用唔到嘅 `info.txt` 唔改專輯（之前用過嘅話），所以句子唔講「當作沒有」 */
            INFO_BAD_ENCODING: 'info.txt 必須為 UTF-8 編碼，此檔未有使用，請修正後再掃描。',
            INFO_TOO_LARGE:
                'info.txt 超出 {maxBytes} 位元組或 {maxLines} 行的上限，此檔未有使用，請修正後再掃描。',
            INFO_UNREADABLE: '未能讀取 info.txt，此檔未有使用，下次掃描會再試。',
            INFO_UNKNOWN_LINE: 'info.txt 第 {line} 行無法識別，已略過。',
            INFO_DUPLICATE_LABEL: 'info.txt 第 {line} 行：此標籤已出現過，已略過。',
            INFO_DUPLICATE_NUMBER: 'info.txt 第 {line} 行：第 {no} 首重複出現，已略過。',
            INFO_BAD_YEAR: 'info.txt 第 {line} 行：無法讀取發行年份。',
            INFO_NO_TITLE: 'info.txt 沒有唱片名稱，暫用專輯 id。',
            INFO_TOO_LONG: 'info.txt 第 {line} 行：名稱最多 {max} 個字，已略過。',
            AUDIO_NOT_LISTED: '第 {no} 首有音檔，但 info.txt 沒有這一首。',
            FILE_WITHOUT_TRACK: '第 {no} 首不在曲目表內，此檔不會匯入。',
            NO_AUDIO: '第 {no} 首沒有音檔，歌曲文字及 MV 不會匯入。',
            TITLE_MISMATCH: '第 {no} 首：歌名為「{title}」，此檔為「{other}」。',
            TEXT_INVALID: '第 {no} 首的歌曲文字檔{place}：{reason}',
            AUDIO_CONFLICT: '第 {no} 首有多於一個音檔，請只保留一個。',
            MV_CONFLICT: '第 {no} 首有多於一個 MV，請只保留一個。',
            TEXT_CONFLICT: '第 {no} 首有多於一個歌曲文字檔，請只保留一個。',
            COVER_CONFLICT: '封面有多於一個檔案（jpg 及 png），請只保留一個。',
            NO_FIRST_COVER: '沒有第一張封面，因此不會匯入第二張封面。',
            COVER_FAILED: '封面未能處理，下次掃描會再試。',
            COVER_NOT_SQUARE: '封面不是正方形，已置中裁切。',
            SUBTITLE_IGNORED: '第 {no} 首：副題已不再使用，第 {line} 行已略過。',
        },
    },
} as const;
