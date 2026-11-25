import { matchMediaFiles, type ScanTrack } from './matchMediaFiles';

const TRACKS: ScanTrack[] = [
    { id: 'apollo-18-01', no: 1, title: '一早地下鐵' },
    { id: 'apollo-18-02', no: 2, title: 'Hero' },
    { id: 'apollo-18-03', no: 3, title: '遊車河' },
];

describe('matchMediaFiles', () => {
    it('should match audio and MV files by the leading track number', () => {
        const result = matchMediaFiles(
            ['apollo-18/01 一早地下鐵.m4a', 'apollo-18/01 一早地下鐵.mp4', 'apollo-18/02 Hero.mp3'],
            TRACKS,
        );
        expect(result.matched).toEqual([
            { trackId: 'apollo-18-01', no: 1, kind: 'audio', key: 'apollo-18/01 一早地下鐵.m4a' },
            { trackId: 'apollo-18-01', no: 1, kind: 'mv', key: 'apollo-18/01 一早地下鐵.mp4' },
            { trackId: 'apollo-18-02', no: 2, kind: 'audio', key: 'apollo-18/02 Hero.mp3' },
        ]);
        expect(result.conflicts).toEqual([]);
        expect(result.unmatchedFiles).toEqual([]);
    });

    it('should list tracks that end up without audio', () => {
        const result = matchMediaFiles(['apollo-18/01 a.m4a', 'apollo-18/02 Hero.mp4'], TRACKS);
        expect(result.tracksWithoutAudio).toEqual([
            { trackId: 'apollo-18-02', no: 2, title: 'Hero' },
            { trackId: 'apollo-18-03', no: 3, title: '遊車河' },
        ]);
    });

    it('should read one to three leading digits and ignore the folder name', () => {
        const tracks: ScanTrack[] = [
            { id: 'a-7', no: 7, title: 'x' },
            { id: 'a-120', no: 120, title: 'y' },
        ];
        const result = matchMediaFiles(['2008 album/7.m4a', '2008 album/120-live.M4V'], tracks);
        expect(result.matched).toEqual([
            { trackId: 'a-7', no: 7, kind: 'audio', key: '2008 album/7.m4a' },
            { trackId: 'a-120', no: 120, kind: 'mv', key: '2008 album/120-live.M4V' },
        ]);
    });

    it('should treat the extension case-insensitively', () => {
        const result = matchMediaFiles(['apollo-18/01 a.M4A', 'apollo-18/02 b.Mp3'], TRACKS);
        expect(result.matched.map((file) => file.kind)).toEqual(['audio', 'audio']);
    });

    it('should report files it cannot use, with the reason', () => {
        const result = matchMediaFiles(
            [
                'apollo-18/cover.jpg',
                'apollo-18/Hero.m4a',
                'apollo-18/09 extra.m4a',
                'apollo-18/01 a.flac',
            ],
            TRACKS,
        );
        expect(result.matched).toEqual([]);
        expect(result.unmatchedFiles).toEqual([
            { key: 'apollo-18/cover.jpg', reason: 'UNKNOWN_EXTENSION' },
            { key: 'apollo-18/Hero.m4a', reason: 'NO_TRACK_NUMBER' },
            { key: 'apollo-18/09 extra.m4a', reason: 'NO_SUCH_TRACK' },
            { key: 'apollo-18/01 a.flac', reason: 'UNKNOWN_EXTENSION' },
        ]);
    });

    it('should not pick between two files of the same kind for one track', () => {
        const result = matchMediaFiles(
            ['apollo-18/03 a.m4a', 'apollo-18/03 b.mp3', 'apollo-18/03 c.mp4'],
            TRACKS,
        );
        expect(result.conflicts).toEqual([
            { no: 3, kind: 'audio', keys: ['apollo-18/03 a.m4a', 'apollo-18/03 b.mp3'] },
        ]);
        expect(result.matched).toEqual([
            { trackId: 'apollo-18-03', no: 3, kind: 'mv', key: 'apollo-18/03 c.mp4' },
        ]);
        expect(result.tracksWithoutAudio.map((track) => track.no)).toEqual([1, 2, 3]);
    });

    // W-002：副檔名撞正 Object.prototype 嘅 property 名（constructor、__proto__…）唔可以當係媒體檔
    it.each(['constructor', '__proto__', 'toString', 'hasOwnProperty'])(
        'should treat the extension .%s as unknown',
        (extension) => {
            const key = `apollo-18/01 x.${extension}`;
            const result = matchMediaFiles([key], TRACKS);
            expect(result.matched).toEqual([]);
            expect(result.unmatchedFiles).toEqual([{ key, reason: 'UNKNOWN_EXTENSION' }]);
        },
    );

    it('should skip folder marker keys', () => {
        const result = matchMediaFiles(['apollo-18/', 'apollo-18/01 a.m4a'], TRACKS);
        expect(result.unmatchedFiles).toEqual([]);
        expect(result.matched).toHaveLength(1);
    });

    it('should not read a four-digit prefix as a track number', () => {
        const result = matchMediaFiles(['apollo-18/2008 remaster.m4a'], TRACKS);
        expect(result.unmatchedFiles).toEqual([
            { key: 'apollo-18/2008 remaster.m4a', reason: 'NO_TRACK_NUMBER' },
        ]);
    });
});
