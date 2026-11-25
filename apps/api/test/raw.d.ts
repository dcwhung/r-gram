// Vite `?raw` import（vitest 支援）：檔案內容當字串，test 用嚟讀 repo 入面嘅設定範本
declare module '*?raw' {
    const content: string;
    export default content;
}
