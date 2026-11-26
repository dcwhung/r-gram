/*
 * 量文字闊度（設計單位 = 字級嘅單位），畀 fitText() 用。
 * 瀏覽器用 OffscreenCanvas 嘅 measureText（字體由 tokens.css 嘅 `--font-*` 讀，同 SVG 文字一致）；
 * 冇 canvas（測試、舊瀏覽器）就用設計稿 textWidth() 嘅估算。字距 SVG 會加喺每個字後面，所以兩種都逐字加。
 */
export type FontFamily = 'slab' | 'cjk' | 'mixed';

export interface TextFont {
    family: FontFamily;
    size: number;
    weight: number;
    /** 字距（letter-spacing） */
    spacing: number;
}

export type TextMeasure = (text: string, font: TextFont) => number;

/** 設計稿 textWidth()：U+2E80 之後（中日韓）當一個字級，其他當 0.56 個字級 */
const CJK_FROM = 0x2e80;
const NARROW_EM = 0.56;

const charCount = (text: string) => Array.from(text).length;

export const estimateTextWidth: TextMeasure = (text, { size, spacing }) =>
    Array.from(text).reduce(
        (sum, char) => sum + ((char.codePointAt(0) ?? 0) >= CJK_FROM ? size : size * NARROW_EM),
        0,
    ) +
    spacing * charCount(text);

type MeasureContext = Pick<OffscreenCanvasRenderingContext2D, 'font' | 'measureText'>;

const canvasContext = (): MeasureContext | null => {
    if (typeof OffscreenCanvas === 'undefined') return null;
    return new OffscreenCanvas(1, 1).getContext('2d');
};

/**
 * 字體名由 `--font-*` 讀（主題改字體都跟到）。每個量字函數每款字只讀一次 getComputedStyle（review W-043：
 * 歌單欄一次量幾十行）；字體載入咗會換一個新嘅量字函數（useTextMeasure），所以唔會用舊值
 */
const fontStacks = () => {
    const stacks = new Map<FontFamily, string>();
    return (family: FontFamily): string => {
        const cached = stacks.get(family);
        if (cached !== undefined) return cached;
        const style = getComputedStyle(document.documentElement);
        const stack = style.getPropertyValue(`--font-${family}`).trim();
        stacks.set(family, stack);
        return stack;
    };
};

/** 揀量度方法：有 canvas 就真係量，冇就估 */
export const createTextMeasure = (): TextMeasure => {
    const context = canvasContext();
    if (!context) return estimateTextWidth;
    const stackOf = fontStacks();
    return (text, font) => {
        context.font = `${font.weight} ${font.size}px ${stackOf(font.family)}`;
        return context.measureText(text).width + font.spacing * charCount(text);
    };
};
