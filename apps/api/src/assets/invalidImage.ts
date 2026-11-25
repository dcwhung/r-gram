/* 圖檔頭 parser（webp.ts、png.ts、jpeg.ts）共用：讀到嘅闊高 + 「唔係合規圖檔」嘅錯誤 */

export interface ImageSize {
    width: number;
    height: number;
}

/**
 * 檔頭 magic 啱但結構唔合規（chunk / segment、長度、闊高）。message 係英文診斷字串，只喺 test 用；
 * 回應用語言檔嘅句子，唔會將 message 畀 client，亦唔會寫入 log
 */
export class InvalidImageError extends Error {
    override readonly name = 'InvalidImageError';
}
