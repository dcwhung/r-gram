import { FAVOURITES_ALBUM_ID } from '@r-gram/catalog';
import {
    makeAlbum,
    makeDocument,
    makeTrack,
    sampleDocument,
} from '../catalog/testing/catalogFixtures';
import { albumTracks, dialAlbums, findAlbum, findTrack } from '../catalog/selectors';
import { t } from '../i18n/t';
import {
    FAVOURITES_ACCENT,
    FAVOURITES_WHEEL_KEY,
    favouritesAlbum,
    withFavourites,
    withKept,
} from './favouritesAlbum';
import type { FavouriteEntry } from './store';

const entry = (trackId: string, addedAt: number): FavouriteEntry => ({ trackId, addedAt });

describe('favouritesAlbum', () => {
    it('should be a disc of its own: reserved id, title, heart key, red accent, no cover, no year', () => {
        const album = favouritesAlbum(sampleDocument(), []);
        expect(album).toMatchObject({
            id: FAVOURITES_ALBUM_ID,
            title: t('favourites.title'),
            wheelKey: FAVOURITES_WHEEL_KEY,
            accent: FAVOURITES_ACCENT,
            year: null,
            cover: null,
            thumb: null,
            tracks: [],
        });
        expect(FAVOURITES_ACCENT).toBe('#d7263d');
    });

    it('should list the favourites in favourite order, numbered by that order (D19)', () => {
        const entries = [entry('room-01', 1), entry('apollo-18-03', 2), entry('apollo-18-01', 3)];
        const tracks = favouritesAlbum(sampleDocument(), entries).tracks;
        expect(tracks.map(({ id, no }) => [id, no])).toEqual([
            ['room-01', 1],
            ['apollo-18-03', 2],
            ['apollo-18-01', 3],
        ]);
    });

    it('should keep the track data (title, audio, MV, lyrics) of the original album', () => {
        const [track] = favouritesAlbum(sampleDocument(), [entry('apollo-18-02', 1)]).tracks;
        expect(track).toMatchObject({ id: 'apollo-18-02', title: 'apollo-18 2', audio: null });
    });

    it('should not show favourites whose track is no longer in the catalog', () => {
        const entries = [entry('gone-01', 1), entry('room-01', 2)];
        const ids = favouritesAlbum(sampleDocument(), entries).tracks.map((track) => track.id);
        expect(ids).toEqual(['room-01']);
    });
});

describe('withFavourites', () => {
    const document = withFavourites(sampleDocument(), [entry('room-01', 1)]);

    it('should make the Favourites disc findable like any album', () => {
        expect(findAlbum(document, FAVOURITES_ALBUM_ID)?.title).toBe(t('favourites.title'));
        expect(albumTracks(document, FAVOURITES_ALBUM_ID).map((track) => track.id)).toEqual([
            'room-01',
        ]);
    });

    it('should keep the real albums on the dial (the heart is added by the dial itself)', () => {
        expect(dialAlbums(document).map((album) => album.id)).toEqual(['apollo-18', 'room']);
    });

    it('should still find the original album of a favourite track', () => {
        expect(findTrack(document, 'room-01')?.album.id).toBe('room');
    });

    it('should replace an older Favourites disc instead of adding a second one', () => {
        const again = withFavourites(document, []);
        expect(again.albums.filter((album) => album.id === FAVOURITES_ALBUM_ID)).toHaveLength(1);
        expect(albumTracks(again, FAVOURITES_ALBUM_ID)).toEqual([]);
    });

    it('should leave a catalog without albums with just the Favourites disc', () => {
        expect(withFavourites(makeDocument([]), []).albums.map((album) => album.id)).toEqual([
            FAVOURITES_ALBUM_ID,
        ]);
    });

    it('should number a favourite by favourite order, not by its number on its album (D60)', () => {
        const album = { ...makeAlbum('gap', []), tracks: [makeTrack('gap', 5, 'gap/05.m4a')] };
        const tracks = favouritesAlbum(makeDocument([album]), [entry('gap-05', 1)]).tracks;
        expect(tracks.map(({ id, no }) => [id, no])).toEqual([['gap-05', 1]]);
    });
});

describe('withKept', () => {
    const entries = [entry('a-01', 10), entry('c-03', 30)];

    it('should put the kept entry back at its favourite-time position', () => {
        expect(withKept(entries, entry('b-02', 20)).map((kept) => kept.trackId)).toEqual([
            'a-01',
            'b-02',
            'c-03',
        ]);
    });

    it('should change nothing without a kept entry or when it is still a favourite', () => {
        expect(withKept(entries, null)).toBe(entries);
        expect(withKept(entries, entry('a-01', 10))).toBe(entries);
    });
});
