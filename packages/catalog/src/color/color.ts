/*
 * 顏色：專輯色（由封面抽）同著燈色。由設計稿 v16 移植：
 * `_mockups_/r-gram/src/anim.js` glowColor()、`_mockups_/r-gram/src/tools/template.html` dominantColor()。
 */
type Rgb = [number, number, number];

const HEX_COLOUR = /^#[0-9a-f]{6}$/i;
const CHANNEL_MAX = 255;
const RGBA_CHANNELS = 4;
const HUE_SECTORS = 6;
const TURN = 2 * Math.PI;

/** 著燈色：專輯色嘅色相推到最鮮最亮（HANDOFF §3） */
const GLOW_SATURATION = 0.95;
const GLOW_LIGHTNESS = 0.56;
/** 色度低過呢個值當灰色，冇色相可言 */
const GLOW_MIN_CHROMA = 0.05;
export const NEUTRAL_GLOW = '#eceef2';

/** 專輯色：封面最鮮艷嘅色相，亮度限喺白底睇得清嘅範圍 */
const HUE_BUCKETS = 12;
const MIN_COLOURFUL_SHARE = 0.05;
const ACCENT_MIN_LIGHTNESS = 0.34;
const ACCENT_MAX_LIGHTNESS = 0.5;
const ACCENT_MIN_SATURATION = 0.45;
export const NEUTRAL_ACCENT = '#6e6e6e';

const hexToRgb = (hex: string): Rgb => {
    if (!HEX_COLOUR.test(hex)) throw new RangeError(`Not a #rrggbb colour: ${JSON.stringify(hex)}`);
    const channel = (start: number) => parseInt(hex.slice(start, start + 2), 16);
    return [channel(1), channel(3), channel(5)];
};

const rgbToHex = (rgb: Rgb): string =>
    `#${rgb.map((value) => value.toString(16).padStart(2, '0')).join('')}`;

/**
 * h、s、l 都係 0–1。標準 HSL → RGB 公式（CSS Color 4 §7.1）：入面嘅 12、3、9 同 0／8／4 係公式本身嘅常數
 *（色環分 12 格，紅綠藍各偏移 0、8、4 格），同設計稿逐字一致，所以唔另外改名。
 */
const hslToRgb = (h: number, s: number, l: number): Rgb => {
    const channel = (n: number) => {
        const k = (n + h * 12) % 12;
        return Math.round(
            CHANNEL_MAX * (l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1))),
        );
    };
    return [channel(0), channel(8), channel(4)];
};

interface Hsl {
    /** 0–1；灰色（chroma = 0）係 0 */
    h: number;
    s: number;
    l: number;
    chroma: number;
}

/** r、g、b 係 0–255 */
const rgbToHsl = (red: number, green: number, blue: number): Hsl => {
    const [r, g, b] = [red / CHANNEL_MAX, green / CHANNEL_MAX, blue / CHANNEL_MAX];
    const max = Math.max(r, g, b);
    const chroma = max - Math.min(r, g, b);
    const l = max - chroma / 2;
    if (chroma === 0) return { h: 0, s: 0, l, chroma };
    const sector =
        max === r
            ? ((g - b) / chroma + HUE_SECTORS) % HUE_SECTORS
            : max === g
              ? (b - r) / chroma + 2
              : (r - g) / chroma + 4;
    return { h: sector / HUE_SECTORS, s: chroma / (1 - Math.abs(2 * l - 1)), l, chroma };
};

/** 專輯色 → 著燈色（掣嘅光圈、指示燈）：同一個色相，飽和同亮度推高；灰色專輯用中性白光 */
export const glowColor = (accent: string): string => {
    const { h, chroma } = rgbToHsl(...hexToRgb(accent));
    if (chroma < GLOW_MIN_CHROMA) return NEUTRAL_GLOW;
    return rgbToHex(hslToRgb(h, GLOW_SATURATION, GLOW_LIGHTNESS));
};

interface HueBucket {
    weight: number;
    x: number;
    y: number;
    s: number;
    l: number;
}

interface HueHistogram {
    buckets: HueBucket[];
    /** 不透明 pixel 數 */
    count: number;
    /** 所有不透明 pixel 嘅色度總和 */
    chroma: number;
}

/** 將 pixel 按色相分 12 格；權重 = 色度平方（鮮艷嘅色主導，灰白黑幾乎唔計） */
const hueHistogram = (pixels: ArrayLike<number>): HueHistogram => {
    const buckets = Array.from({ length: HUE_BUCKETS }, () => ({
        weight: 0,
        x: 0,
        y: 0,
        s: 0,
        l: 0,
    }));
    const histogram: HueHistogram = { buckets, count: 0, chroma: 0 };
    for (let p = 0; p + RGBA_CHANNELS <= pixels.length; p += RGBA_CHANNELS) {
        if (pixels[p + 3] === 0) continue; // 全透明：唔係封面嘅一部分
        const { h, s, l, chroma } = rgbToHsl(
            pixels[p] ?? 0,
            pixels[p + 1] ?? 0,
            pixels[p + 2] ?? 0,
        );
        const weight = chroma * chroma;
        const bucket = buckets[Math.min(HUE_BUCKETS - 1, Math.floor(h * HUE_BUCKETS))];
        if (!bucket) continue;
        bucket.weight += weight;
        bucket.x += Math.cos(h * TURN) * weight;
        bucket.y += Math.sin(h * TURN) * weight;
        bucket.s += s * weight;
        bucket.l += l * weight;
        histogram.count += 1;
        histogram.chroma += chroma;
    }
    return histogram;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * 由封面 pixel（RGBA，每粒 4 個 0–255 嘅值，例如 canvas `getImageData().data`）抽專輯色。
 * 幾乎冇顏色嘅封面（黑白相）回中性灰。輸入細圖就夠（設計稿用 24 × 24）。
 */
export const dominantColor = (pixels: ArrayLike<number>): string => {
    const { buckets, count, chroma } = hueHistogram(pixels);
    if (count === 0 || chroma / count < MIN_COLOURFUL_SHARE) return NEUTRAL_ACCENT;
    const best = buckets.reduce((a, b) => (b.weight > a.weight ? b : a));
    const hue = (Math.atan2(best.y, best.x) / TURN + 1) % 1;
    const saturation = clamp(best.s / best.weight, ACCENT_MIN_SATURATION, 1);
    const lightness = clamp(best.l / best.weight, ACCENT_MIN_LIGHTNESS, ACCENT_MAX_LIGHTNESS);
    return rgbToHex(hslToRgb(hue, saturation, lightness));
};
