/*
 * 超長文字（Functional Spec FR-036、D23；Technical Spec「文字長度」）：決定用幾大個字、使唔使截短。純函數，量度由外面注入。
 * 1. 放得落：原樣
 * 2. 放唔落：縮字，最細縮到 minSize
 * 3. 縮到最細都放唔落：喺 minSize 截短，用「…」收尾（D23 冇講到嘅最後手段：例如 200 字嘅歌名）
 * 歌書歌詞行嘅規則唔同（D22：跑馬燈、唔可以截短），唔用呢個函數。
 */
export const ELLIPSIS = '…';

export interface FitOptions {
    /** 原本字級 */
    size: number;
    /** 最細縮到幾多 */
    minSize: number;
    /** 可用闊度（同 measure 同一個單位） */
    maxWidth: number;
    /** 文字喺某個字級嘅闊度 */
    measure: (text: string, size: number) => number;
}

export interface FittedText {
    text: string;
    size: number;
}

/** 放得落嘅最大字級（整數，唔細過 minSize）；最細都放唔落就 null */
const shrunkSize = (text: string, { size, minSize, maxWidth, measure }: FitOptions) => {
    // 闊度大致同字級成正比：先按比例估，字距唔跟字級縮，所以再逐級試細
    const estimate = Math.floor((size * maxWidth) / measure(text, size));
    for (let candidate = Math.max(minSize, Math.min(size, estimate)); candidate >= minSize;) {
        if (measure(text, candidate) <= maxWidth) return candidate;
        candidate -= 1;
    }
    return null;
};

/** 喺 minSize 放得落嘅最長開頭 + 「…」（按 code point 截，唔會切開 emoji） */
const truncated = (text: string, { minSize, maxWidth, measure }: FitOptions): string => {
    const chars = Array.from(text);
    const fits = (count: number) =>
        measure(chars.slice(0, count).join('') + ELLIPSIS, minSize) <= maxWidth;
    let [low, high] = [0, chars.length];
    while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        if (fits(middle)) low = middle;
        else high = middle - 1;
    }
    return chars.slice(0, low).join('') + ELLIPSIS;
};

export const fitText = (text: string, options: FitOptions): FittedText => {
    if (options.measure(text, options.size) <= options.maxWidth) {
        return { text, size: options.size };
    }
    const size = shrunkSize(text, options);
    if (size !== null) return { text, size };
    return { text: truncated(text, options), size: options.minSize };
};
