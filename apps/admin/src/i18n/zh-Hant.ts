/*
 * 管理端語言檔（繁體中文，書面語；Functional Spec FR-037）。元件唔寫死文字，一律經 `t()`。
 * 專輯名、歌名、資料夾名、錯誤碼係資料，唔翻譯
 */
export const zhHant = {
    app: {
        heading: 'R Gram 媒體同步',
    },
    session: {
        signedInAs: '已登入：{email}',
        signOut: '登出',
    },
} as const;
