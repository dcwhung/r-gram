import { matchCredits } from './matchCredits';
import { seedToCatalog, trackIdFor } from './seedToCatalog';
import type { SeedCredits, SeedCreditTrack, SeedDiscography } from './types';

const creditRow = (overrides: Partial<SeedCreditTrack>): SeedCreditTrack => ({
    no: 1,
    title: 'Hero',
    missing: false,
    composer: '阿正',
    lyricist: '6號',
    arranger: 'RubberBand',
    producer: '—',
    lyricsUrl: 'https://lyrics.example/hero',
    note: 'Apollo 18 track 2',
    ...overrides,
});

const DISCOGRAPHY: SeedDiscography = {
    albums: [
        {
            order: 0,
            id: 'apollo-18',
            wheelKey: 'A',
            title: 'Apollo 18',
            releaseDate: '2008-09-26',
            year: 2008,
            type: '錄音室專輯',
            label: '金牌娛樂',
            tracks: [
                { no: 1, title: 'Hero', subtitle: null },
                { no: 2, title: '遊車河', subtitle: 'Bonus' },
            ],
        },
        {
            order: 1,
            id: 'beaming',
            wheelKey: 'B',
            title: 'Beaming',
            releaseDate: null,
            year: null,
            type: '精選',
            label: '',
            tracks: [
                { no: 5, title: 'Hero', subtitle: null },
                { no: 6, title: '冇資料嘅歌', subtitle: null },
            ],
        },
    ],
};

const CREDITS: SeedCredits = {
    albums: [
        {
            albumId: 'apollo-18',
            tracks: [creditRow({}), creditRow({ no: 2, title: '遊車河', missing: true })],
        },
        {
            albumId: 'beaming',
            // 歌號啱但歌名唔同：唔可以當直接配對
            tracks: [creditRow({ no: 6, title: '另一首歌' })],
        },
    ],
};

describe('matchCredits', () => {
    const { byTrackId, stats } = matchCredits(DISCOGRAPHY, CREDITS);

    it('should use the row with the same album, number and title', () => {
        expect(byTrackId['apollo-18-01']).toEqual({
            source: 'direct',
            credits: { composer: '阿正', lyricist: '6號', arranger: 'RubberBand', producer: null },
            lyricsUrl: 'https://lyrics.example/hero',
            note: 'Apollo 18 track 2',
        });
    });

    it('should borrow the credits of a same-titled song on another album', () => {
        expect(byTrackId['beaming-05']).toMatchObject({
            source: 'byTitle',
            credits: { composer: '阿正', lyricist: '6號', arranger: 'RubberBand', producer: null },
        });
    });

    it('should leave a song without credits when the row is marked missing', () => {
        expect(byTrackId['apollo-18-02']).toBeUndefined();
    });

    it('should not match on the track number alone', () => {
        expect(byTrackId['beaming-06']).toBeUndefined();
    });

    it('should count each outcome', () => {
        expect(stats).toEqual({ direct: 1, byTitle: 1, missing: 2 });
    });

    it('should treat a row whose fields are all dashes as having no credits', () => {
        const dashes = creditRow({ composer: '—', lyricist: '—', arranger: '—', producer: '—' });
        const result = matchCredits(DISCOGRAPHY, {
            albums: [{ albumId: 'apollo-18', tracks: [dashes] }],
        });
        expect(result.stats).toEqual({ direct: 0, byTitle: 0, missing: 4 });
    });
});

describe('trackIdFor', () => {
    it.each([
        [1, 'apollo-18-01'],
        [15, 'apollo-18-15'],
        [120, 'apollo-18-120'],
    ])('should pad track %i to two digits', (no, expected) => {
        expect(trackIdFor('apollo-18', no)).toBe(expected);
    });
});

describe('seedToCatalog', () => {
    const options = {
        generatedAt: '2026-11-25T00:00:00.000Z',
        mediaBase: 'https://media.example/',
        imageBase: 'https://api.example/img/',
        lyricsBase: 'https://api.example/lyrics/',
    };

    it('should keep album order and copy the display fields', () => {
        const document = seedToCatalog(DISCOGRAPHY, CREDITS, options);
        expect(document.albums.map((album) => album.id)).toEqual(['apollo-18', 'beaming']);
        expect(document.albums[1]).toMatchObject({
            title: 'Beaming',
            wheelKey: 'B',
            year: null,
            cover: null,
        });
    });

    it('should attach matched credits and leave the rest null', () => {
        const [first] = seedToCatalog(DISCOGRAPHY, CREDITS, options).albums;
        expect(first?.tracks).toEqual([
            {
                id: 'apollo-18-01',
                no: 1,
                title: 'Hero',
                subtitle: null,
                credits: {
                    composer: '阿正',
                    lyricist: '6號',
                    arranger: 'RubberBand',
                    producer: null,
                },
                audio: null,
                mv: null,
                lyrics: null,
            },
            {
                id: 'apollo-18-02',
                no: 2,
                title: '遊車河',
                subtitle: 'Bonus',
                credits: null,
                audio: null,
                mv: null,
                lyrics: null,
            },
        ]);
    });

    it('should use the given accent and fall back to the neutral one', () => {
        const document = seedToCatalog(DISCOGRAPHY, CREDITS, {
            ...options,
            accents: { beaming: '#d49b00' },
        });
        expect(document.albums.map((album) => album.accent)).toEqual(['#6e6e6e', '#d49b00']);
    });

    it('should let the caller attach media to a track', () => {
        const document = seedToCatalog(DISCOGRAPHY, CREDITS, {
            ...options,
            mediaFor: (albumId, track) => ({ audio: `${albumId}/${track.no}.m4a`, mv: null }),
        });
        expect(document.albums[1]?.tracks[0]).toMatchObject({ audio: 'beaming/5.m4a', mv: null });
    });
});
