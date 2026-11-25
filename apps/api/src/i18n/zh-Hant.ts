/*
 * Worker 自己出嘅頁面文字（登入流程嘅三個頁）：中文書面語，唔用口語字（test/writtenChinese.test.ts 鎖住）。
 * JSON API 嘅錯誤 message 係畀開發者睇嘅英文，唔喺呢度；管理端按 error code 用自己嘅語言檔出字
 */
export const zhHant = {
    appName: 'R Gram 管理端',
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
} as const;
