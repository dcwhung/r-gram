import { hasWords, parseLyricsJson } from './lyricsJson';

/* Technical Spec API-072（CR-003 D32）：歌詞檔 `{ synced, lines }`；佔位文字，唔係真歌詞 */
describe('parseLyricsJson', () => {
    it('should read timed lyrics', () => {
        const json = {
            synced: true,
            lines: [
                { t: 1200, text: '佔位一' },
                { t: 3400, text: '' },
            ],
        };
        expect(parseLyricsJson(json)).toEqual(json);
    });

    it('should sort timed lines that arrive out of order, keeping equal times in order', () => {
        const json = {
            synced: true,
            lines: [
                { t: 3000, text: '三' },
                { t: 1000, text: '一' },
                { t: 3000, text: '四' },
            ],
        };
        expect(parseLyricsJson(json)?.lines.map((line) => line.text)).toEqual(['一', '三', '四']);
    });

    it('should read plain lyrics and keep the blank lines', () => {
        const json = {
            synced: false,
            lines: [{ text: '佔位一' }, { text: '' }, { text: '佔位二' }],
        };
        expect(parseLyricsJson(json)).toEqual(json);
    });

    it.each([
        ['not an object', 'lyrics'],
        ['no lines', { synced: true }],
        ['no synced flag', { lines: [] }],
        ['a timed line without a time', { synced: true, lines: [{ text: '一' }] }],
        ['a negative time', { synced: true, lines: [{ t: -1, text: '一' }] }],
        ['a time that is not a number', { synced: true, lines: [{ t: '1', text: '一' }] }],
        ['a line without text', { synced: false, lines: [{}] }],
        ['a line that is not an object', { synced: false, lines: ['一'] }],
    ])('should refuse %s', (_case, value) => {
        expect(parseLyricsJson(value)).toBeNull();
    });
});

describe('hasWords', () => {
    it('should tell lyrics with words from blank ones', () => {
        expect(hasWords({ synced: false, lines: [{ text: '' }, { text: ' 一 ' }] })).toBe(true);
        expect(hasWords({ synced: true, lines: [{ t: 0, text: '  ' }] })).toBe(false);
        expect(hasWords({ synced: false, lines: [] })).toBe(false);
    });
});
