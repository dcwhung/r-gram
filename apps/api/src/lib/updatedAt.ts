/*
 * updated_at 兼做 If-Match 版本（Technical Spec「API 設計 → 並發」）：每次寫都要一個新值，
 * 同一 ms 內寫兩次都唔可以撞（撞咗會令舊表單嘅 If-Match 仍然對得上）。移植自 903-player content/etag.ts
 */

/** 新 updated_at：一定大過舊嗰個（同一 ms 就 +1 ms）；舊值讀唔到就用而家 */
export const nextUpdatedAt = (previous: string | undefined, now: Date = new Date()): string => {
    const previousMs = previous === undefined ? Number.NaN : Date.parse(previous);
    const ms = Number.isNaN(previousMs) ? now.getTime() : Math.max(now.getTime(), previousMs + 1);
    return new Date(ms).toISOString();
};
