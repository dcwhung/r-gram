import { planScan, type ScanAlbumState, type ScanInput, type ScanTrackState } from './planScan';

const FOLDER = 'album-11-komorebi';
const ALBUM_ID = 'komorebi';

const file = (name: string, bytes = 100) => ({
    key: `${FOLDER}/${name}`,
    bytes,
    etag: `"${name}"`,
});

const track = (no: number, extra: Partial<ScanTrackState> = {}): ScanTrackState => ({
    id: `${ALBUM_ID}-${String(no).padStart(2, '0')}`,
    no,
    title: `Song ${no}`,
    audioKey: null,
    audioManual: false,
    mvKey: null,
    mvManual: false,
    textSourceEtag: null,
    ...extra,
});

const NO_COVERS: ScanAlbumState = {
    coverSourceEtag: null,
    cover2SourceEtag: null,
    hasCover: false,
    hasCover2: false,
};

const plan = (
    names: (string | ReturnType<typeof file>)[],
    tracks: ScanTrackState[] = [],
    extra: Partial<ScanInput> = {},
) =>
    planScan({
        albumId: ALBUM_ID,
        files: names.map((name) => (typeof name === 'string' ? file(name) : name)),
        tracks,
        album: NO_COVERS,
        takenIds: new Set(),
        ...extra,
    });

const key = (name: string) => `${FOLDER}/${name}`;

describe('planScan: new tracks (audio is the anchor)', () => {
    it('should propose a new track for every audio number the album does not have', () => {
        const result = plan(['01 a.m4a', '02 b.mp3', '05 太平門.m4a']);
        expect(result.newTracks.map(({ no, trackId }) => [no, trackId])).toEqual([
            [1, 'komorebi-01'],
            [2, 'komorebi-02'],
            [5, 'komorebi-05'],
        ]);
    });

    it('should carry the audio, the MV, the song text and the file-name title', () => {
        const [created] = plan(['05 太平門.m4a', '05 太平門.mp4', '05 太平門.txt']).newTracks;
        expect(created).toEqual({
            no: 5,
            trackId: 'komorebi-05',
            audio: { key: key('05 太平門.m4a'), bytes: 100 },
            mv: { key: key('05 太平門.mp4'), bytes: 100 },
            text: { key: key('05 太平門.txt'), etag: '"05 太平門.txt"', bytes: 100 },
            fileTitle: '太平門',
        });
    });

    it('should leave the id empty when the numbered id is already used', () => {
        const result = plan(['05 a.m4a'], [], { takenIds: new Set(['komorebi-05']) });
        expect(result.newTracks[0]?.trackId).toBeNull();
    });

    it('should skip song texts and MVs whose number has no audio', () => {
        const result = plan(['01 a.m4a', '04 a.txt', '04 a.mp4']);
        expect(result.newTracks.map(({ no }) => no)).toEqual([1]);
        expect(result.skipped).toEqual([
            { key: key('04 a.txt'), no: 4, kind: 'text', reason: 'NO_AUDIO' },
            { key: key('04 a.mp4'), no: 4, kind: 'mv', reason: 'NO_AUDIO' },
        ]);
    });

    it('should not create a track whose audio is ambiguous', () => {
        const result = plan(['03 a.m4a', '03 b.mp3', '03 a.txt']);
        expect(result.newTracks).toEqual([]);
        expect(result.conflicts).toEqual([
            { no: 3, kind: 'audio', keys: [key('03 a.m4a'), key('03 b.mp3')] },
        ]);
        expect(result.skipped).toEqual([
            { key: key('03 a.txt'), no: 3, kind: 'text', reason: 'AUDIO_CONFLICT' },
        ]);
    });

    it('should create a track without MV or text when those are ambiguous', () => {
        const result = plan(['03 a.m4a', '03 a.mp4', '03 b.m4v', '03 a.txt', '03 b.txt']);
        expect(result.newTracks[0]).toMatchObject({ no: 3, mv: null, text: null });
        expect(result.conflicts.map(({ kind }) => kind)).toEqual(['mv', 'text']);
    });
});

describe('planScan: existing tracks', () => {
    it('should match the audio and MV of a track by number with their change', () => {
        const tracks = [
            track(1, { audioKey: key('01 a.m4a') }),
            track(2, { audioKey: key('02 old.m4a'), mvKey: key('02 b.mp4') }),
            track(3),
        ];
        const result = plan(['01 a.m4a', '02 b.m4a', '02 b.mp4', '03 c.mp3'], tracks);
        expect(result.matched.map(({ no, kind, change }) => [no, kind, change])).toEqual([
            [1, 'audio', 'same'],
            [2, 'audio', 'replace'],
            [2, 'mv', 'same'],
            [3, 'audio', 'new'],
        ]);
        expect(result.newTracks).toEqual([]);
        expect(result.audioMissing).toEqual([]);
    });

    it('should list a remembered audio that left the folder, never deleting the track', () => {
        const tracks = [track(9, { audioKey: key('09 一杯.m4a'), mvKey: key('09 一杯.mp4') })];
        const result = plan(['01 a.m4a'], tracks);
        expect(result.audioMissing).toEqual([
            {
                trackId: 'komorebi-09',
                no: 9,
                title: 'Song 9',
                key: key('09 一杯.m4a'),
                mvKey: key('09 一杯.mp4'),
            },
        ]);
    });

    it('should keep the MV out of audioMissing when the MV file is still there', () => {
        const tracks = [track(9, { audioKey: key('09 a.m4a'), mvKey: key('09 a.mp4') })];
        const result = plan(['09 a.mp4'], tracks);
        expect(result.audioMissing[0]?.mvKey).toBeNull();
        expect(result.skipped).toEqual([
            { key: key('09 a.mp4'), no: 9, kind: 'mv', reason: 'NO_AUDIO' },
        ]);
    });

    it('should never touch manual assignments and count a manual audio as the anchor', () => {
        const tracks = [
            track(2, {
                audioKey: 'album-02-beaming/05 Hero.m4a',
                audioManual: true,
                mvKey: 'other/x.mp4',
                mvManual: true,
            }),
        ];
        const result = plan(['02 Hero.m4a', '02 Hero.mp4', '02 Hero.txt'], tracks);
        expect(result.matched).toEqual([]);
        expect(result.manualKept).toEqual([
            { trackId: 'komorebi-02', kind: 'audio', key: 'album-02-beaming/05 Hero.m4a' },
            { trackId: 'komorebi-02', kind: 'mv', key: 'other/x.mp4' },
        ]);
        expect(result.songTexts.map(({ trackId }) => trackId)).toEqual(['komorebi-02']);
        expect(result.skipped).toEqual([]);
    });

    it('should list song texts of anchored tracks, marking the unchanged ones', () => {
        const tracks = [track(1, { textSourceEtag: '"01 a.txt"' }), track(2)];
        const result = plan(['01 a.m4a', '01 a.txt', '02 b.m4a', '02 b.txt'], tracks);
        expect(result.songTexts).toEqual([
            {
                trackId: 'komorebi-01',
                no: 1,
                key: key('01 a.txt'),
                etag: '"01 a.txt"',
                bytes: 100,
                unchanged: true,
            },
            {
                trackId: 'komorebi-02',
                no: 2,
                key: key('02 b.txt'),
                etag: '"02 b.txt"',
                bytes: 100,
                unchanged: false,
            },
        ]);
    });

    it('should skip the song text of a track without audio', () => {
        const result = plan(['04 a.txt'], [track(4)]);
        expect(result.songTexts).toEqual([]);
        expect(result.skipped[0]).toMatchObject({ no: 4, kind: 'text', reason: 'NO_AUDIO' });
        expect(result.tracksWithoutAudio).toEqual([
            { trackId: 'komorebi-04', no: 4, title: 'Song 4' },
        ]);
    });
});

describe('planScan: covers', () => {
    it('should report the cover source with its change against the stored etag', () => {
        const album = { ...NO_COVERS, hasCover: true, coverSourceEtag: '"old"' };
        const result = plan(['cover.jpg', 'cover2.png'], [], { album });
        expect(result.cover).toEqual({
            key: key('cover.jpg'),
            etag: '"cover.jpg"',
            bytes: 100,
            change: 'replace',
            hasCover: true,
        });
        expect(result.cover2).toMatchObject({ key: key('cover2.png'), change: 'new' });
    });

    it('should call an unchanged cover same', () => {
        const album = { ...NO_COVERS, coverSourceEtag: '"cover.png"' };
        expect(plan(['cover.png'], [], { album }).cover?.change).toBe('same');
    });

    it('should not pick between cover.jpg and cover.png', () => {
        const result = plan(['cover.jpg', 'cover.png']);
        expect(result.cover).toBeNull();
        expect(result.conflicts).toEqual([
            { kind: 'cover', keys: [key('cover.jpg'), key('cover.png')] },
        ]);
    });

    it('should skip a second cover when there is no first cover at all', () => {
        const result = plan(['cover2.jpg']);
        expect(result.cover2).toBeNull();
        expect(result.skipped).toEqual([
            { key: key('cover2.jpg'), kind: 'cover2', reason: 'NO_FIRST_COVER' },
        ]);
    });

    it('should accept a second cover when the album already has a first cover', () => {
        const album = { ...NO_COVERS, hasCover: true };
        expect(plan(['cover2.jpg'], [], { album }).cover2?.key).toBe(key('cover2.jpg'));
    });
});

describe('planScan: other files', () => {
    it('should list files it cannot use with the reason and ignore folder markers', () => {
        const result = plan([
            `booklet.pdf`,
            'intro.m4a',
            { key: `${FOLDER}/`, bytes: 0, etag: '""' },
        ]);
        expect(result.unmatchedFiles).toEqual([
            { key: key('booklet.pdf'), reason: 'UNKNOWN_EXTENSION' },
            { key: key('intro.m4a'), reason: 'NO_TRACK_NUMBER' },
        ]);
    });
});
