import { classifyFile, fileNameOf } from './classifyFile';

describe('fileNameOf', () => {
    it('should drop the folder part of a key', () => {
        expect(fileNameOf('album-01-apollo-18/01 一早地下鐵.m4a')).toBe('01 一早地下鐵.m4a');
        expect(fileNameOf('cover.jpg')).toBe('cover.jpg');
    });
});

describe('classifyFile', () => {
    it.each([
        ['01 一早地下鐵.m4a', 'audio', 1],
        ['2 Hero.mp3', 'audio', 2],
        ['015 認錯.M4A', 'audio', 15],
        ['01 一早地下鐵.mp4', 'mv', 1],
        ['07 MV.m4v', 'mv', 7],
        ['05 太平門.txt', 'text', 5],
        ['12.TXT', 'text', 12],
    ])('should read %s as %s number %i', (name, kind, no) => {
        expect(classifyFile(`album-01-apollo-18/${name}`)).toEqual({ kind, no });
    });

    it.each([
        ['cover.jpg', 'cover'],
        ['COVER.PNG', 'cover'],
        ['cover2.jpg', 'cover2'],
        ['Cover2.png', 'cover2'],
    ])('should read %s as the %s source', (name, kind) => {
        expect(classifyFile(`album-01-apollo-18/${name}`)).toEqual({ kind });
    });

    it.each([
        'cover.jpeg',
        'cover.webp',
        '01 a.lrc',
        'booklet.pdf',
        '.DS_Store',
        'README',
        'cover3.jpg',
    ])('should not use %s (unknown extension)', (name) => {
        expect(classifyFile(`a/${name}`)).toEqual({
            kind: 'unmatched',
            reason: 'UNKNOWN_EXTENSION',
        });
    });

    it.each(['一早地下鐵.m4a', 'intro.txt', '2008 remaster.mp3', '000 zero.m4a', '1000 a.m4a'])(
        'should not find a track number in %s',
        (name) => {
            expect(classifyFile(`a/${name}`)).toEqual({
                kind: 'unmatched',
                reason: 'NO_TRACK_NUMBER',
            });
        },
    );
});
