import { classifyFile } from '../scan/classifyFile';
import type { ScanFile } from '../scan/scanFiles';
import { SONG_TEXT_NAME_MAX_CHARS, songTextFileName, songTextTarget } from './songTextTarget';

const FOLDER = 'album-11-komorebi';
const key = (name: string) => `${FOLDER}/${name}`;
const file = (name: string): ScanFile => ({ key: key(name), etag: `"${name}"`, bytes: 10 });

const target = (files: ScanFile[], stored: { audioKey?: string; textKey?: string } = {}) =>
    songTextTarget({
        folder: FOLDER,
        no: 5,
        title: '太平門',
        files,
        stored: { audioKey: stored.audioKey ?? null, textKey: stored.textKey ?? null },
    });

describe('songTextFileName', () => {
    it('should put the two-digit number, a space and the title', () => {
        expect(songTextFileName(5, '太平門')).toBe('05 太平門.txt');
        expect(songTextFileName(123, 'Hero')).toBe('123 Hero.txt');
    });

    it('should drop characters that file names may not have, and control characters', () => {
        expect(songTextFileName(1, 'Re: Love/Hate *?"<>|#\\ \u0007song')).toBe(
            '01 Re LoveHate  song.txt',
        );
    });

    it(`should keep at most ${SONG_TEXT_NAME_MAX_CHARS} characters of the title, whole characters only`, () => {
        const name = songTextFileName(1, '𠀀'.repeat(SONG_TEXT_NAME_MAX_CHARS + 5));
        expect([...name.slice('01 '.length, -'.txt'.length)]).toHaveLength(
            SONG_TEXT_NAME_MAX_CHARS,
        );
    });

    it('should give a name with only the number when nothing of the title is left', () => {
        expect(songTextFileName(7, ' /?* ')).toBe('07.txt');
    });

    it.each(['太平門', 'info', '..', '2008 remaster', ' /?* ', '#1'])(
        'should always give a song text file of that number for %j',
        (title) => {
            expect(classifyFile(key(songTextFileName(42, title)))).toEqual({
                kind: 'text',
                no: 42,
            });
        },
    );
});

describe('songTextTarget', () => {
    it('should use the only song text file of the number', () => {
        const result = target([file('05 太平門.m4a'), file('05 Live.txt')]);
        expect(result).toEqual({
            audio: true,
            conflict: false,
            file: expect.objectContaining({ key: key('05 Live.txt') }),
            key: key('05 Live.txt'),
        });
    });

    it('should name a new file after the title when there is none', () => {
        const result = target([file('05 太平門.m4a'), file('06 x.txt')]);
        expect(result).toEqual({
            audio: true,
            conflict: false,
            file: null,
            key: key('05 太平門.txt'),
        });
    });

    it('should never take the stored key of a file outside the folder or of another number', () => {
        const stored = { textKey: 'album-02-other/05 太平門.txt' };
        expect(target([file('05 a.m4a')], stored).key).toBe(key('05 太平門.txt'));
        expect(target([file('05 a.m4a')], { textKey: key('04 x.txt') }).key).toBe(
            key('05 太平門.txt'),
        );
    });

    it('should keep the stored file of a conflict and report a conflict without it', () => {
        const files = [file('05 a.m4a'), file('05 a.txt'), file('05 b.txt')];
        expect(target(files, { textKey: key('05 b.txt') })).toMatchObject({
            conflict: false,
            key: key('05 b.txt'),
        });
        expect(target(files)).toMatchObject({ conflict: true, file: null });
    });

    it('should say there is no audio when the number has none or an unresolved conflict', () => {
        expect(target([file('05 a.txt')]).audio).toBe(false);
        const two = [file('05 a.m4a'), file('05 b.mp3')];
        expect(target(two).audio).toBe(false);
        expect(target(two, { audioKey: key('05 b.mp3') }).audio).toBe(true);
    });
});
