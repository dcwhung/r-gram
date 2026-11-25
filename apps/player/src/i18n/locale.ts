/** 有語言檔嘅語言。加語言 = 加一份語言檔 + 喺呢度加一個值（Functional Spec D29：首發只有繁體中文） */
export const LOCALES = ['zh-Hant'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'zh-Hant';

/** 瀏覽器語言標籤 → 語言檔。繁體地區（香港、台灣、澳門）同 `zh-Hant*` 都係繁體中文 */
const TRADITIONAL_CHINESE = /^zh-(Hant|HK|TW|MO)\b/i;

const localeFor = (tag: string): Locale | null =>
    TRADITIONAL_CHINESE.test(tag) ? 'zh-Hant' : null;

/**
 * 按用戶偏好次序（`navigator.languages`）揀第一個有語言檔嘅語言；冇對應就用預設。
 * 而家只有一份語言檔，所以結果一定係 `zh-Hant`；加語言時呢度唔使改。
 */
export const resolveLocale = (preferred: readonly string[]): Locale =>
    preferred.map(localeFor).find((locale) => locale !== null) ?? DEFAULT_LOCALE;
