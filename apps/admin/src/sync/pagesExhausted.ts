/* 一個資料夾嘅批次上限（folderPass.ts FOLDER_PAGES_MAX）用完仲有 `more` */
/** 批次上限用完仲有 `more`：呢個資料夾未做完（S-230），當問題報、計入未完成，唔處理封面；下次同步再繼續 */
export class PagesExhaustedError extends Error {
    override readonly name = 'PagesExhaustedError';
    readonly code = 'PAGES_EXHAUSTED';
}
