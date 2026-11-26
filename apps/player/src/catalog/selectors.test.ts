import { FAVOURITES_ALBUM_ID } from '@r-gram/catalog';
import { COVER_VARIANT } from './coverVariants';
import {
    albumArt,
    albumTracks,
    dialAlbums,
    findAlbum,
    findTrack,
    isPlayable,
    otherArt,
    playableTracks,
} from './selectors';
import {
    makeAlbum,
    makeDocument,
    sampleDocument,
    withSecondCover,
} from './testing/catalogFixtures';

describe('catalog selectors', () => {
    const document = sampleDocument();

    describe('dialAlbums', () => {
        it('should keep the catalog order (the admin order)', () => {
            const ordered = makeDocument([makeAlbum('zebra', []), makeAlbum('apple', [])]);
            expect(dialAlbums(ordered).map((album) => album.id)).toEqual(['zebra', 'apple']);
        });

        it('should keep albums that have no tracks yet (CR-003 decision 7: nothing is hidden)', () => {
            const withEmpty = makeDocument([makeAlbum('new-album', [])]);
            expect(dialAlbums(withEmpty).map((album) => album.id)).toEqual(['new-album']);
        });

        it('should leave out the Favourites disc (the heart is always the last position, T-070)', () => {
            const withHeart = makeDocument([
                makeAlbum('zebra', []),
                { ...makeAlbum('heart', []), id: FAVOURITES_ALBUM_ID },
            ]);
            expect(dialAlbums(withHeart).map((album) => album.id)).toEqual(['zebra']);
        });
    });

    describe('findAlbum', () => {
        it('should find an album by id', () => {
            expect(findAlbum(document, 'room')?.title).toBe('ROOM');
        });

        it.each(['missing', FAVOURITES_ALBUM_ID])('should return null for %s', (albumId) => {
            expect(findAlbum(document, albumId)).toBeNull();
        });
    });

    describe('albumTracks', () => {
        it('should list every track of the album in order, with or without audio', () => {
            expect(albumTracks(document, 'apollo-18').map((track) => track.no)).toEqual([1, 2, 3]);
        });

        it('should return no tracks for an unknown album', () => {
            expect(albumTracks(document, 'missing')).toEqual([]);
        });
    });

    describe('findTrack', () => {
        it('should find a track together with its album', () => {
            const found = findTrack(document, 'room-01');
            expect(found?.album.id).toBe('room');
            expect(found?.track.no).toBe(1);
        });

        it('should return null for a track that was deleted', () => {
            expect(findTrack(document, 'apollo-18-99')).toBeNull();
        });
    });

    describe('playable tracks', () => {
        it('should treat a track without audio as not playable (grey row, D11)', () => {
            const [first, second] = albumTracks(document, 'apollo-18');
            expect(first && isPlayable(first)).toBe(true);
            expect(second && isPlayable(second)).toBe(false);
        });

        it('should keep only playable tracks in order', () => {
            const tracks = albumTracks(document, 'apollo-18');
            expect(playableTracks(tracks).map((track) => track.no)).toEqual([1, 3]);
        });
    });

    /* Functional Spec D56、FR-042：揀中嗰張封面連佢自己嘅縮圖 */
    describe('albumArt', () => {
        const double = withSecondCover(makeAlbum('komorebi', []));

        it('should give the first cover with its thumbnail', () => {
            expect(albumArt(double, COVER_VARIANT.FIRST)).toEqual({
                cover: 'komorebi-cover.webp',
                thumb: 'komorebi-thumb.webp',
            });
        });

        it('should give the second cover with its own thumbnail', () => {
            expect(albumArt(double, COVER_VARIANT.SECOND)).toEqual({
                cover: 'komorebi-cover2.webp',
                thumb: 'komorebi-thumb2.webp',
            });
        });

        it('should fall back to the first cover when the album has no second cover', () => {
            const single = { ...makeAlbum('room', []), cover: 'room.webp', thumb: 'room-t.webp' };
            expect(albumArt(single, COVER_VARIANT.SECOND)).toEqual({
                cover: 'room.webp',
                thumb: 'room-t.webp',
            });
        });

        it('should give no art for an album without a cover', () => {
            expect(albumArt(makeAlbum('room', []), COVER_VARIANT.FIRST)).toEqual({
                cover: null,
                thumb: null,
            });
        });
    });

    describe('otherArt', () => {
        it('should give the cover that is not shown', () => {
            const double = withSecondCover(makeAlbum('komorebi', []));
            expect(otherArt(double, COVER_VARIANT.FIRST)?.cover).toBe('komorebi-cover2.webp');
            expect(otherArt(double, COVER_VARIANT.SECOND)?.thumb).toBe('komorebi-thumb.webp');
        });

        it('should give nothing for an album with a single cover', () => {
            expect(otherArt(makeAlbum('room', []), COVER_VARIANT.FIRST)).toBeNull();
        });
    });
});
