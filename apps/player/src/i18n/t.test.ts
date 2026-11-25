import { t } from './t';

describe('t', () => {
    it('should return the message for a key', () => {
        expect(t('favourites.title')).toBe('我的收藏');
    });

    it('should fill in a parameter', () => {
        expect(t('album.trackCount', { count: 8 })).toBe('8 首');
        expect(t('track.number', { no: '07' })).toBe('第 07 首');
    });

    it('should accept a message as the parameter of another message', () => {
        expect(t('mode.label', { mode: t('mode.shuffle') })).toBe('播放模式：隨機播放');
    });

    it('should accept a key chosen at run time from messages without parameters', () => {
        const modes = ['order', 'all', 'one', 'shuffle'] as const;
        expect(modes.map((mode) => t(`mode.${mode}`))).toEqual([
            '順序播放',
            '全部重複',
            '單曲重複',
            '隨機播放',
        ]);
    });

    // 型別擋唔到嘅情況（例如資料係 any）：佔位符原樣保留，喺畫面上見到漏咗
    it('should leave the placeholder when a parameter is missing at run time', () => {
        const untyped = t as (key: string, params?: Record<string, unknown>) => string;
        expect(untyped('app.version', {})).toBe('v{version}');
        expect(untyped('app.version')).toBe('v{version}');
    });

    it('should reject wrong keys and parameters at compile time', () => {
        // @ts-expect-error 冇呢個 key
        expect(() => t('favourites.titel')).toThrow(TypeError);
        // @ts-expect-error 呢句要 version
        t('app.version');
        // @ts-expect-error 參數名打錯
        t('app.version', { versoin: '1' });
        // @ts-expect-error 呢句冇參數
        t('playback.play', { junk: 1 });
        // @ts-expect-error key 要去到最尾一層
        expect(() => t('favourites')).toThrow(TypeError);
    });
});
