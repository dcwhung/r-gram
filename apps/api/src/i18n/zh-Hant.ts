/*
 * Worker 自己出嘅文字：中文書面語，唔用口語字（test/writtenChinese.test.ts 鎖住）。
 * 規則（backlog B-044）：所有 API 錯誤回應嘅 message 都係呢度嘅中文書面語；管理端可以直接顯示，
 * 亦可以按 `code` / `details[].reason` 用自己嘅語言檔砌字（code 同 reason 係穩定介面，message 唔係）。
 * - auth：登入流程嘅三個頁
 * - errors：守門（401、403）同通用 404 / 500 嘅 message
 * - albums：專輯 API（T-022）錯誤回應嘅 message 同每個欄位錯誤（details[].reason）嘅 message；
 *   `{name}` 係參數，由 fillMessage() 填入
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
            INVALID_DATE: '日期必須為 YYYY-MM-DD 格式的有效日期。',
            INVALID_COLOUR: '顏色必須為 #rrggbb 格式。',
            INVALID_FOLDER:
                '資料夾名稱不可為空白、「.」或「..」，亦不可包含斜線、反斜線、?、#、%、換行、控制字元或不可見的格式字元。',
            UNKNOWN_ASSET: '找不到此圖片，請重新上載。',
            INVALID_LIST: '必須為不重複的專輯 ID 列表。',
        },
    },
} as const;
