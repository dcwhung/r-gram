import { t } from './t';

describe('t', () => {
    it('should return the message for a key', () => {
        expect(t('favourites.title')).toBe('我的收藏');
    });

    it('should fill in parameters', () => {
        expect(t('album.trackCount', { count: 8 })).toBe('8 首');
        expect(t('track.number', { no: '07' })).toBe('第 07 首');
    });

    it('should leave an unknown placeholder untouched', () => {
        expect(t('app.version', {})).toBe('v{version}');
    });

    it('should fill several parameters in one message', () => {
        expect(t('mode.label', { mode: t('mode.shuffle') })).toBe('播放模式：隨機播放');
    });
});
