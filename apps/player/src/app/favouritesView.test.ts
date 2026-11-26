import { type CatalogDocument, FAVOURITES_ALBUM_ID } from '@r-gram/catalog';
import { makeDocument, sampleDocument } from '../catalog/testing/catalogFixtures';
import { findAlbum } from '../catalog/selectors';
import { withFavourites } from '../favourites/favouritesAlbum';
import { t } from '../i18n/t';
import { albumSub, favouriteParts, originText } from './favouritesView';

const favourites = (ids: readonly string[]): CatalogDocument =>
    withFavourites(
        sampleDocument(),
        ids.map((trackId, index) => ({ trackId, addedAt: index })),
    );

const withYear = (): CatalogDocument => {
    const document = sampleDocument();
    const [apollo, room] = document.albums;
    return makeDocument([{ ...apollo!, title: 'Apollo 18', year: 2008 }, room!]);
};

describe('albumSub', () => {
    it('should show the year of a real album, or nothing when it has none', () => {
        expect(albumSub(findAlbum(withYear(), 'apollo-18'))).toBe('2008');
        expect(albumSub(findAlbum(sampleDocument(), 'room'))).toBe('');
        expect(albumSub(null)).toBe('');
    });

    it('should show the number of favourites on the Favourites disc, 0 when empty (§CR-002)', () => {
        const disc = (ids: readonly string[]) => findAlbum(favourites(ids), FAVOURITES_ALBUM_ID);
        expect(albumSub(disc(['room-01', 'apollo-18-02']))).toBe(
            t('album.trackCount', { count: 2 }),
        );
        expect(albumSub(disc([]))).toBe(t('album.trackCount', { count: 0 }));
    });
});

describe('originText', () => {
    it('should name the original album and its year (mockup TRACKS.favourites)', () => {
        const document = withFavourites(withYear(), [{ trackId: 'apollo-18-01', addedAt: 1 }]);
        expect(originText(document, 'apollo-18-01')).toBe(
            t('favourites.origin', { album: 'Apollo 18', year: '2008' }),
        );
    });

    it('should name only the album when it has no year, and nothing for an unknown track', () => {
        expect(originText(favourites(['room-01']), 'room-01')).toBe('ROOM');
        expect(originText(favourites([]), 'gone-01')).toBeNull();
    });
});

describe('favouriteParts', () => {
    const document = favourites(['room-01']);
    const ids = new Set(['room-01']);
    const room = findAlbum(document, 'room');
    const heart = findAlbum(document, FAVOURITES_ALBUM_ID);
    const track = room?.tracks[0] ?? null;

    it('should say whether the song in the info is a favourite', () => {
        expect(favouriteParts(document, room, track, ids).favourite).toBe(true);
        expect(favouriteParts(document, room, track, new Set()).favourite).toBe(false);
        expect(favouriteParts(document, room, null, ids).favourite).toBe(false);
    });

    it('should show the original album only for a song of the Favourites disc (D19)', () => {
        expect(favouriteParts(document, room, track, ids).origin).toBeNull();
        expect(favouriteParts(document, heart, track, ids).origin).toBe('ROOM');
        expect(favouriteParts(document, heart, null, ids).origin).toBeNull();
    });

    it('should carry the line under the album title', () => {
        expect(favouriteParts(document, heart, null, ids).albumSub).toBe(
            t('album.trackCount', { count: 1 }),
        );
    });

    it('should work without favourites in the document (plain catalog)', () => {
        const plain = makeDocument([]);
        expect(favouriteParts(plain, null, null, new Set())).toEqual({
            favourite: false,
            origin: null,
            albumSub: '',
        });
    });
});
