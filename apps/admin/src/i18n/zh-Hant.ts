/*
 * 管理端語言檔（繁體中文，書面語；Functional Spec FR-037）。元件唔寫死文字，一律經 `t()`。
 * 專輯名、歌名、資料夾名、檔名、錯誤碼係資料，唔翻譯
 */
export const zhHant = {
    app: {
        heading: 'R Gram 媒體同步',
        loading: '正在檢查登入狀態…',
        loadFailed: '未能連接伺服器（{code}）。',
    },
    login: {
        signIn: '以 Google 登入',
    },
    session: {
        signedInAs: '已登入：{email}',
        signOut: '登出',
        signOutFailed: '登出失敗（{code}）。',
    },
    sync: {
        start: '同步媒體資料夾',
        running: '同步中…',
        logHeading: '記錄',
        summaryHeading: '總結',
    },
    log: {
        started: '開始同步：共 {count} 個資料夾。',
        invalidFolder: '{folder}：資料夾名稱不符合格式，已略過（{code}）',
        duplicateId: '專輯編號 {id} 重複：{folders}',
        truncated: '媒體資料夾清單不完整：本次不列出已不在媒體資料夾的專輯。',
        retry: '{place}：第 {attempt} 次失敗（{code}），稍後重試',
        overviewPlace: '資料夾清單',
        folderDone: '{folder}：新增 {added}、更新 {updated}、沒有改動 {unchanged}',
        folderCreated: '{folder}：新專輯；新增 {added}、更新 {updated}、沒有改動 {unchanged}',
        failedTrack: '{folder}：第 {no} 首未能同步（{code}）',
        checks: '{folder}：檢查結果 {count} 項（{codes}）',
        folderProblem: '{folder}：問題（{code}）',
        coverDone: '{folder}：{slot}已處理{notes}',
        coverUpscaled: '；原圖小於 {side} 像素，已放大',
        coverNotSquare: '；原圖不是正方形，已置中裁切',
        coverProblem: '{folder}：{slot}問題（{code}）',
        removal: '待確認移除（未移除）：{folder} {what}',
        stopped: '同步已停止（{code}）。',
        finished: '同步完成。',
        listSeparator: '、',
    },
    removal: {
        album: '專輯「{title}」',
        track: '第 {no} 首「{title}」',
        audio: '音檔 {key}',
        mv: 'MV {key}',
        text: '歌曲文字 {key}',
        cover: '{slot}',
    },
    slots: {
        cover: '封面',
        cover2: '第二張封面',
    },
    summary: {
        albums: '專輯',
        tracks: '歌曲',
        audio: '有音檔的歌曲',
        lyrics: '有歌詞的歌曲',
        mv: '有 MV 的歌曲',
        covers: '已處理封面',
        coverProblems: '封面問題',
        checks: '檢查結果',
        removals: '待確認移除',
        failedFolders: '未完成的資料夾',
        statsUnavailable: '未能讀取統計。',
        removalsNote: '本頁不會移除任何資料；移除須在管理端逐項確認。',
    },
} as const;
