import { candidateNames, COVER_NAMES, folderFileUrl } from './candidates';

describe('candidateNames', () => {
    it('should try the two-digit number first, then the plain number, for each audio extension', () => {
        expect(candidateNames({ no: 3, title: '搲撈HK' }, 'audio')).toEqual([
            '03 搲撈HK.m4a',
            '03 搲撈HK.mp3',
            '3 搲撈HK.m4a',
            '3 搲撈HK.mp3',
        ]);
    });

    it('should not repeat names when the number already has two digits', () => {
        expect(candidateNames({ no: 11, title: 'G’night' }, 'mv')).toEqual([
            '11 G’night.mp4',
            '11 G’night.m4v',
        ]);
    });

    it('should look for a jpg cover before a png one', () => {
        expect(COVER_NAMES).toEqual(['cover.jpg', 'cover.png']);
    });
});

describe('folderFileUrl', () => {
    const base = 'https://media.test/';

    it('should percent-encode spaces and CJK characters in the file name', () => {
        expect(folderFileUrl(base, 'album-11-komorebi', '01 下一位.m4a')).toBe(
            'https://media.test/album-11-komorebi/01%20%E4%B8%8B%E4%B8%80%E4%BD%8D.m4a',
        );
    });

    it('should encode brackets, hash and question marks so they stay part of the name', () => {
        expect(folderFileUrl(base, 'a', '02 [Live] #1?.mp3')).toBe(
            'https://media.test/a/02%20%5BLive%5D%20%231%3F.mp3',
        );
    });

    it('should keep round brackets and the curly apostrophe readable by the server', () => {
        expect(folderFileUrl(base, 'a', '11 G’night (Live).mp4')).toBe(
            'https://media.test/a/11%20G%E2%80%99night%20(Live).mp4',
        );
    });
});
