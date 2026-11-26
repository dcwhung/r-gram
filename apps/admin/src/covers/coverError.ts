/* 封面處理失敗：code 喺記錄入面原樣顯示（同 Worker 嘅錯誤碼一樣係資料，唔翻譯） */
export type CoverErrorCode =
    | 'COVER_FETCH_FAILED'
    | 'COVER_SOURCE_TOO_LARGE'
    | 'COVER_DECODE_FAILED'
    | 'COVER_ENCODE_FAILED'
    | 'COVER_OUTPUT_TOO_LARGE';

export class CoverError extends Error {
    override readonly name = 'CoverError';

    /** detail：補充（例如 HTTP status、NETWORK） */
    constructor(
        readonly code: CoverErrorCode,
        readonly detail?: string,
    ) {
        super(detail ? `${code} ${detail}` : code);
    }
}
