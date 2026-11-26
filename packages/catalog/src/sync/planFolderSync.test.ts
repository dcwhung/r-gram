import { parseAlbumInfo } from '../album-info/parseAlbumInfo';
import type { ScanFile } from '../scan/scanFiles';
import { checkOf, type Check } from './checks';
import { planFolderSync } from './planFolderSync';
import type { SyncAlbumState, SyncInfo, SyncInput, SyncTrackState } from './types';

const ALBUM = 'komorebi';
const FOLDER = 'album-11-komorebi';
const INFO_KEY = `${FOLDER}/info.txt`;

const key = (name: string) => `${FOLDER}/${name}`;
const file = (name: string, etag = `"${name}"`, bytes = 10): ScanFile => ({
    key: key(name),
    etag,
    bytes,
});

const readInfo = (text: string, etag = '"info"'): SyncInfo => ({
    kind: 'read',
    key: INFO_KEY,
    etag,
    info: parseAlbumInfo(text),
});

const INFO =
    '唱片名稱：Komorebi\n發行年份：2026\n曲目：\n1. 下一位參賽者\n2. 跟住去邊度\n3. 搲撈HK';

const album = (extra: Partial<SyncAlbumState> = {}): SyncAlbumState => ({
    title: 'Komorebi',
    year: 2026,
    infoEtag: '"info"',
    coverSourceEtag: null,
    cover2SourceEtag: null,
    hasCover: false,
    hasCover2: false,
    checks: [],
    ...extra,
});

const track = (no: number, extra: Partial<SyncTrackState> = {}): SyncTrackState => ({
    id: `${ALBUM}-${String(no).padStart(2, '0')}`,
    no,
    title: `歌${no}`,
    audioKey: null,
    mvKey: null,
    textKey: null,
    textSourceEtag: null,
    ...extra,
});

const plan = (input: Partial<SyncInput>) =>
    planFolderSync({
        albumId: ALBUM,
        files: [],
        info: readInfo(INFO),
        album: null,
        tracks: [],
        truncated: false,
        ...input,
    });

const codesOf = (checks: readonly Check[]) => checks.map(({ code, no }) => [code, no]);

describe('planFolderSync', () => {
    describe('a new album with info.txt', () => {
        const files = [
            file('info.txt', '"info"'),
            file('01 下一位參賽者.m4a'),
            file('01 下一位參賽者.txt', '"t1"', 99),
            file('03 搲撈HK.mp3'),
            file('03 搲撈HK.mp4'),
            file('cover.jpg', '"c1"', 5000),
        ];

        it('should take the title, year and track list from info.txt', () => {
            const result = plan({ files });
            expect(result.album).toEqual({ title: 'Komorebi', year: 2026 });
            expect(result.tracks.map(({ no, title }) => [no, title])).toEqual([
                [1, '下一位參賽者'],
                [2, '跟住去邊度'],
                [3, '搲撈HK'],
            ]);
            expect(result.checks).toEqual([]);
            expect(result.infoSettled).toBe(true);
        });

        it('should anchor song text and MV on the audio and keep a track without audio greyed', () => {
            const [first, second, third] = plan({ files }).tracks;
            expect(first).toEqual({
                no: 1,
                trackId: null,
                title: '下一位參賽者',
                titleSource: 'info',
                audioKey: key('01 下一位參賽者.m4a'),
                mvKey: null,
                textKey: key('01 下一位參賽者.txt'),
                read: { key: key('01 下一位參賽者.txt'), etag: '"t1"', bytes: 99 },
                compareTitle: '下一位參賽者',
                changed: true,
            });
            expect(second).toMatchObject({
                audioKey: null,
                mvKey: null,
                textKey: null,
                read: null,
            });
            expect(third).toMatchObject({
                audioKey: key('03 搲撈HK.mp3'),
                mvKey: key('03 搲撈HK.mp4'),
            });
        });

        it('should ask for the cover to be processed', () => {
            expect(plan({ files }).coverJobs).toEqual([
                { slot: 'cover', key: key('cover.jpg'), etag: '"c1"', bytes: 5000 },
            ]);
        });

        it('should have nothing to remove', () => {
            expect(plan({ files }).pendingRemovals).toEqual([]);
        });
    });

    describe('a folder without info.txt', () => {
        const files = [file('02 Hero.m4a'), file('05 太平門.mp3'), file('05 太平門.txt', '"t5"')];

        it('should use the album id as title and the audio numbers as the track list', () => {
            const result = plan({ files, info: { kind: 'none' } });
            expect(result.album).toEqual({ title: ALBUM, year: null });
            expect(
                result.tracks.map(({ no, title, titleSource }) => [no, title, titleSource]),
            ).toEqual([
                [2, 'Hero', 'file'],
                [5, '太平門', 'file'],
            ]);
            expect(result.tracks[1]?.compareTitle).toBe('太平門');
            expect(result.checks).toEqual([checkOf('NO_INFO', {}, { title: ALBUM })]);
            expect(result.infoSettled).toBe(false);
        });

        it('should keep the stored title of a track whose song text is not read again', () => {
            const tracks = [
                track(5, {
                    title: '太平門（現場）',
                    audioKey: key('05 太平門.mp3'),
                    textKey: key('05 太平門.txt'),
                    textSourceEtag: '"t5"',
                }),
            ];
            const [, fifth] = plan({
                files,
                info: { kind: 'none' },
                tracks,
                album: album(),
            }).tracks;
            expect(fifth).toMatchObject({ title: '太平門（現場）', read: null, changed: false });
        });

        it('should read song text again when the audio file it is compared with is renamed', () => {
            const tracks = [
                track(5, {
                    title: '太平門',
                    audioKey: key('05 太平門 (Live).mp3'),
                    textKey: key('05 太平門.txt'),
                    textSourceEtag: '"t5"',
                }),
            ];
            const result = plan({ files, info: { kind: 'none' }, tracks, album: album() });
            expect(result.tracks[1]).toMatchObject({ compareTitle: '太平門', changed: true });
            expect(result.tracks[1]?.read).toMatchObject({ key: key('05 太平門.txt') });
        });

        it('should fall back the same way when info.txt cannot be used', () => {
            const tooLarge = {
                kind: 'read' as const,
                key: INFO_KEY,
                etag: '"big"',
                info: {
                    usable: false,
                    title: null,
                    year: null,
                    tracks: [],
                    checks: [checkOf('INFO_TOO_LARGE')],
                },
            };
            const result = plan({ files: [file('info.txt', '"big"'), ...files], info: tooLarge });
            expect(result.tracks.map(({ no }) => no)).toEqual([2, 5]);
            expect(codesOf(result.checks)).toEqual([['INFO_TOO_LARGE', undefined]]);
            expect(result.checks[0]?.key).toBe(INFO_KEY);
            expect(result.infoSettled).toBe(false);
        });
    });

    describe('info.txt that cannot be used after a usable one (S-164)', () => {
        const badEncoding: SyncInfo = {
            kind: 'read',
            key: INFO_KEY,
            etag: '"bad"',
            info: {
                usable: false,
                title: null,
                year: null,
                tracks: [],
                checks: [checkOf('INFO_BAD_ENCODING')],
            },
        };
        const tracks = [
            track(1, { title: '下一位參賽者', audioKey: key('01 a.m4a') }),
            track(2, { title: '跟住去邊度' }),
        ];

        it('should keep the stored title, year and track list and list no track for removal', () => {
            const files = [file('info.txt', '"bad"'), file('01 a.m4a'), file('03 c.m4a')];
            const stored = album({ title: 'K', year: 1999, checks: [] });
            const result = plan({ files, info: badEncoding, tracks, album: stored });
            expect(result.album).toEqual({ title: 'K', year: 1999 });
            expect(result.tracks.map(({ no, title }) => [no, title])).toEqual([
                [1, '下一位參賽者'],
                [2, '跟住去邊度'],
            ]);
            expect(result.pendingRemovals).toEqual([]);
            expect(result.infoSettled).toBe(false);
            expect(codesOf(result.checks)).toEqual([
                ['INFO_BAD_ENCODING', undefined],
                ['AUDIO_NOT_LISTED', 3],
            ]);
        });

        it('should not carry the checks of the earlier info.txt', () => {
            const stored = album({
                checks: [checkOf('INFO_UNKNOWN_LINE', { key: INFO_KEY, line: 7 })],
            });
            const result = plan({ info: badEncoding, tracks, album: stored });
            expect(codesOf(result.checks)).toEqual([['INFO_BAD_ENCODING', undefined]]);
        });

        it('should fall back to the audio files when no info.txt was ever used', () => {
            const files = [file('01 a.m4a'), file('03 c.m4a')];
            const never = album({ infoEtag: null });
            const result = plan({ files, info: badEncoding, tracks, album: never });
            expect(result.tracks.map(({ no }) => no)).toEqual([1, 3]);
            expect(result.album).toEqual({ title: ALBUM, year: null });
        });
    });

    describe('info.txt not read again (same ETag)', () => {
        const tracks = [track(1, { title: '下一位參賽者' }), track(4, { title: '毒蟲圖鑑' })];
        const unchanged: SyncInfo = { kind: 'unchanged', key: INFO_KEY, etag: '"info"' };

        it('should keep the stored album fields and use the stored tracks as the track list', () => {
            const result = plan({
                info: unchanged,
                album: album({ title: 'K', year: 1999 }),
                tracks,
            });
            expect(result.album).toEqual({ title: 'K', year: 1999 });
            expect(result.tracks.map(({ no, trackId, changed }) => [no, trackId, changed])).toEqual(
                [
                    [1, 'komorebi-01', false],
                    [4, 'komorebi-04', false],
                ],
            );
            expect(result.pendingRemovals).toEqual([]);
            expect(result.infoSettled).toBe(true);
        });

        it('should keep the stored checks of info.txt', () => {
            const stored = [
                checkOf('INFO_UNKNOWN_LINE', { key: INFO_KEY, line: 7 }),
                checkOf('AUDIO_NOT_LISTED', { key: key('13 x.m4a'), no: 13 }, { no: 13 }),
            ];
            const result = plan({ info: unchanged, album: album({ checks: stored }), tracks });
            expect(result.checks).toEqual([stored[0]]);
        });
    });

    describe('checks', () => {
        it('should report audio whose number is not in info.txt and attach the info.txt key', () => {
            const result = plan({ info: readInfo(`${INFO}\n???`), files: [file('13 Bonus.m4a')] });
            expect(result.tracks.map(({ no }) => no)).toEqual([1, 2, 3]);
            expect(result.checks).toEqual([
                checkOf('INFO_UNKNOWN_LINE', { key: INFO_KEY, line: 7 }),
                checkOf('AUDIO_NOT_LISTED', { key: key('13 Bonus.m4a'), no: 13 }, { no: 13 }),
            ]);
        });

        it('should hint that song text and MV of a track without audio are not imported', () => {
            const files = [file('02 跟住去邊度.txt'), file('02 跟住去邊度.mp4')];
            expect(plan({ files }).checks).toEqual([
                checkOf('NO_AUDIO', { key: key('02 跟住去邊度.mp4'), no: 2 }, { no: 2 }),
                checkOf('NO_AUDIO', { key: key('02 跟住去邊度.txt'), no: 2 }, { no: 2 }),
            ]);
        });

        it('should report song text and MV files whose number is not a track', () => {
            const files = [file('09 x.txt'), file('09 x.m4v')];
            expect(codesOf(plan({ files }).checks)).toEqual([
                ['FILE_WITHOUT_TRACK', 9],
                ['FILE_WITHOUT_TRACK', 9],
            ]);
        });

        it('should report a title that differs from the audio file name, ignoring width and file-name characters', () => {
            const info = readInfo('唱片名稱：K\n1. 太平門\n2. Re: Love\n3. ＨＫ');
            const files = [file('01 太平門 (Live).m4a'), file('02 Re Love.m4a'), file('03 hk.m4a')];
            expect(plan({ info, files }).checks).toEqual([
                checkOf(
                    'TITLE_MISMATCH',
                    { key: key('01 太平門 (Live).m4a'), no: 1 },
                    { no: 1, title: '太平門', other: '太平門 (Live)' },
                ),
            ]);
        });

        it('should report several audio files for one number and pick none for a new track', () => {
            const files = [file('01 a.m4a'), file('01 b.mp3')];
            const result = plan({ files });
            expect(result.tracks[0]).toMatchObject({ audioKey: null });
            expect(codesOf(result.checks)).toEqual([
                ['AUDIO_CONFLICT', 1],
                ['AUDIO_CONFLICT', 1],
            ]);
        });

        it('should keep the linked audio of a conflict while it is still there', () => {
            const files = [file('01 a.m4a'), file('01 b.mp3')];
            const tracks = [track(1, { title: '下一位參賽者', audioKey: key('01 b.mp3') })];
            const [first] = plan({ files, tracks, album: album() }).tracks;
            expect(first).toMatchObject({ audioKey: key('01 b.mp3') });
        });

        it('should report two info.txt files', () => {
            const files = [file('Info.txt', '"info"'), file('info.txt', '"x"')];
            expect(plan({ files }).checks).toEqual([
                checkOf('INFO_CONFLICT', { key: key('info.txt') }),
            ]);
        });

        it('should report two cover files and process neither', () => {
            const files = [file('cover.jpg'), file('cover.png')];
            const result = plan({ files });
            expect(result.coverJobs).toEqual([]);
            expect(result.checks).toEqual([
                checkOf('COVER_CONFLICT', { key: key('cover.jpg') }, { slot: 'cover' }),
                checkOf('COVER_CONFLICT', { key: key('cover.png') }, { slot: 'cover' }),
            ]);
        });

        it('should not process a second cover without a first one', () => {
            const result = plan({ files: [file('cover2.png')] });
            expect(result.coverJobs).toEqual([]);
            expect(result.checks).toEqual([checkOf('NO_FIRST_COVER', { key: key('cover2.png') })]);
        });
    });

    describe('changes against the database', () => {
        const stored = () => [
            track(1, {
                title: '下一位參賽者',
                audioKey: key('01 a.m4a'),
                textKey: key('01 a.txt'),
                textSourceEtag: '"t1"',
            }),
            track(2, { title: '跟住去邊度' }),
            track(3, { title: '搲撈HK' }),
        ];

        it('should leave an unchanged folder alone', () => {
            const files = [file('01 a.m4a'), file('01 a.txt', '"t1"')];
            const result = plan({ files, tracks: stored(), album: album() });
            expect(result.tracks.map(({ changed, read }) => [changed, read])).toEqual([
                [false, null],
                [false, null],
                [false, null],
            ]);
            expect(result.coverJobs).toEqual([]);
        });

        it('should read song text again when its ETag, its key or the title changes', () => {
            const changedText = plan({
                files: [file('01 a.m4a'), file('01 a.txt', '"t2"')],
                tracks: stored(),
                album: album(),
            });
            expect(changedText.tracks[0]?.read).toMatchObject({ etag: '"t2"' });
            const renamed = plan({
                files: [file('01 a.m4a'), file('01 b.txt', '"t1"')],
                tracks: stored(),
                album: album(),
            });
            expect(renamed.tracks[0]).toMatchObject({ textKey: key('01 b.txt'), changed: true });
            expect(renamed.tracks[0]?.read).not.toBeNull();
            const retitled = plan({
                info: readInfo(INFO.replace('下一位參賽者', '下一位')),
                files: [file('01 a.m4a'), file('01 a.txt', '"t1"')],
                tracks: stored(),
                album: album(),
            });
            expect(retitled.tracks[0]).toMatchObject({ title: '下一位', changed: true });
            expect(retitled.tracks[0]?.read).not.toBeNull();
        });

        it('should follow a new audio file and a renamed one', () => {
            const files = [file('01 b.m4a'), file('02 c.m4a')];
            const [first, second] = plan({ files, tracks: stored(), album: album() }).tracks;
            expect(first).toMatchObject({ audioKey: key('01 b.m4a'), changed: true });
            expect(second).toMatchObject({ audioKey: key('02 c.m4a'), changed: true });
        });

        it('should keep the stored ids', () => {
            const ids = plan({ tracks: stored(), album: album() }).tracks.map(
                ({ trackId }) => trackId,
            );
            expect(ids).toEqual(['komorebi-01', 'komorebi-02', 'komorebi-03']);
        });

        it('should ask for the cover again only when its ETag changed', () => {
            const files = [file('cover.jpg', '"c1"'), file('cover2.png', '"c2"')];
            const same = album({ coverSourceEtag: '"c1"', hasCover: true });
            expect(plan({ files, album: same }).coverJobs.map(({ slot }) => slot)).toEqual([
                'cover2',
            ]);
            const done = album({
                coverSourceEtag: '"c1"',
                cover2SourceEtag: '"c2"',
                hasCover: true,
                hasCover2: true,
            });
            expect(plan({ files, album: done }).coverJobs).toEqual([]);
        });

        it('should keep the stored checks of a cover that is not processed again', () => {
            const notSquare = checkOf('COVER_NOT_SQUARE', { key: key('cover.jpg') });
            const files = [file('cover.jpg', '"c1"')];
            const same = album({ coverSourceEtag: '"c1"', hasCover: true, checks: [notSquare] });
            expect(plan({ files, album: same }).checks).toEqual([notSquare]);
            expect(plan({ files, album: album({ checks: [notSquare] }) }).checks).toEqual([]);
        });
    });

    describe('removals (listed, never applied here)', () => {
        it('should list a stored track that info.txt no longer lists and not settle info.txt', () => {
            const tracks = [track(1), track(7, { title: '舊歌' })];
            const result = plan({ tracks, album: album() });
            expect(result.pendingRemovals).toEqual([
                { kind: 'track', albumId: ALBUM, trackId: 'komorebi-07', no: 7, title: '舊歌' },
            ]);
            expect(result.tracks.map(({ no }) => no)).toEqual([1, 2, 3]);
            expect(result.infoSettled).toBe(false);
        });

        it('should keep the links of files that are gone and list them', () => {
            const tracks = [
                track(1, { title: '下一位參賽者', audioKey: key('01 a.m4a') }),
                track(2, {
                    title: '跟住去邊度',
                    audioKey: key('02 b.m4a'),
                    mvKey: key('02 b.mp4'),
                    textKey: key('02 b.txt'),
                }),
            ];
            const result = plan({ files: [file('02 b.m4a')], tracks, album: album() });
            expect(result.tracks[0]).toMatchObject({ audioKey: key('01 a.m4a'), changed: false });
            expect(result.tracks[1]).toMatchObject({
                mvKey: key('02 b.mp4'),
                textKey: key('02 b.txt'),
                changed: false,
            });
            expect(result.pendingRemovals).toEqual([
                {
                    kind: 'audio',
                    albumId: ALBUM,
                    trackId: 'komorebi-01',
                    key: key('01 a.m4a'),
                    no: 1,
                    title: '下一位參賽者',
                },
                {
                    kind: 'mv',
                    albumId: ALBUM,
                    trackId: 'komorebi-02',
                    key: key('02 b.mp4'),
                    no: 2,
                    title: '跟住去邊度',
                },
                {
                    kind: 'text',
                    albumId: ALBUM,
                    trackId: 'komorebi-02',
                    key: key('02 b.txt'),
                    no: 2,
                    title: '跟住去邊度',
                },
            ]);
        });

        it('should list only the audio when the audio of a track with MV and text is gone', () => {
            const tracks = [
                track(1, {
                    title: '下一位參賽者',
                    audioKey: key('01 a.m4a'),
                    mvKey: key('01 a.mp4'),
                }),
            ];
            const result = plan({ files: [file('01 a.mp4')], tracks, album: album() });
            expect(result.pendingRemovals.map(({ kind }) => kind)).toEqual(['audio']);
        });

        it('should keep the MV and song text links of a track whose audio is gone until it is confirmed', () => {
            const tracks = [
                track(1, {
                    title: '下一位參賽者',
                    audioKey: key('01 a.m4a'),
                    mvKey: key('01 a.mp4'),
                    textKey: key('01 a.txt'),
                    textSourceEtag: '"t1"',
                }),
            ];
            const files = [file('01 a.mp4'), file('01 a.txt', '"t9"')];
            const [first] = plan({ files, tracks, album: album() }).tracks;
            expect(first).toMatchObject({
                audioKey: key('01 a.m4a'),
                mvKey: key('01 a.mp4'),
                textKey: key('01 a.txt'),
                read: null,
                changed: false,
            });
        });

        it('should list covers that are gone', () => {
            const stored = album({
                hasCover: true,
                coverSourceEtag: '"c1"',
                hasCover2: true,
                cover2SourceEtag: '"c2"',
            });
            expect(plan({ album: stored }).pendingRemovals).toEqual([
                { kind: 'cover', albumId: ALBUM, slot: 'cover' },
                { kind: 'cover', albumId: ALBUM, slot: 'cover2' },
            ]);
        });

        it('should list nothing when the listing is incomplete', () => {
            const tracks = [track(7, { audioKey: key('07 x.m4a') })];
            const result = plan({ tracks, album: album({ hasCover: true }), truncated: true });
            expect(result.pendingRemovals).toEqual([]);
            expect(result.infoSettled).toBe(false);
        });
    });
});
