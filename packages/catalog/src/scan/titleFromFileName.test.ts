import { TITLE_MAX_CHARS } from '../song-text/limits';
import { titleFromFileName } from './titleFromFileName';

describe('titleFromFileName', () => {
    it.each([
        ['album-11-komorebi/05 太平門.m4a', '太平門'],
        ['a/07. 我永遠記得.mp3', '我永遠記得'],
        ['a/03-Hero.m4a', 'Hero'],
        ['a/03_ _Hero .m4a', 'Hero'],
        ['a/12 Ciao (Live).m4a', 'Ciao (Live)'],
        ['a/1 One.Two.m4a', 'One.Two'],
    ])('should take the part after the number in %s', (key, title) => {
        expect(titleFromFileName(key)).toBe(title);
    });

    it('should fall back to the whole name without the extension', () => {
        expect(titleFromFileName('a/05.m4a')).toBe('05');
        expect(titleFromFileName('a/05 - .mp3')).toBe('05 -');
    });

    it('should compose decomposed characters (macOS file names)', () => {
        expect(titleFromFileName('a/01 Café.m4a')).toBe('Café');
    });

    it('should cut a long name to the title limit', () => {
        const long = 'あ'.repeat(TITLE_MAX_CHARS + 5);
        expect([...titleFromFileName(`a/01 ${long}.m4a`)]).toHaveLength(TITLE_MAX_CHARS);
    });
});
