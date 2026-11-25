import { DEFAULT_LOCALE, resolveLocale } from './locale';

describe('resolveLocale', () => {
    it('should default to Traditional Chinese', () => {
        expect(DEFAULT_LOCALE).toBe('zh-Hant');
    });

    it.each([
        [['zh-HK', 'en'], 'zh-Hant'],
        [['zh-TW'], 'zh-Hant'],
        [['zh-Hant-HK'], 'zh-Hant'],
        // 未有其他語言檔：英文、簡體都退返預設
        [['en-GB'], 'zh-Hant'],
        [['zh-CN'], 'zh-Hant'],
        [[], 'zh-Hant'],
    ])('should resolve %j to %s (the only locale so far)', (preferred, expected) => {
        expect(resolveLocale(preferred)).toBe(expected);
    });
});
