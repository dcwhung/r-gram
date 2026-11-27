/** 診斷開住 = 存 '1'；閂 = 刪走。主畫面 app 重開都記得 */
export const DIAG_STORAGE_KEY = 'rgram.diag.v1';
const ON = '1';

/** 私密瀏覽、封鎖咗網站資料：讀唔到當閂 */
export const readDiagFlag = (): boolean => {
    try {
        return window.localStorage.getItem(DIAG_STORAGE_KEY) === ON;
    } catch {
        return false;
    }
};

/** 寫唔到就算：今次照開，下次開 app 唔記得 */
export const writeDiagFlag = (on: boolean): void => {
    try {
        if (on) window.localStorage.setItem(DIAG_STORAGE_KEY, ON);
        else window.localStorage.removeItem(DIAG_STORAGE_KEY);
    } catch {
        // 冇得存：只影響下次開 app
    }
};
