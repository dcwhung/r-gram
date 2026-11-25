import { FAVOURITES_ALBUM_ID } from '@r-gram/catalog';
import {
    albumTracks,
    dialAlbums,
    findAlbum,
    findTrack,
    isPlayable,
    playableTracks,
} from './selectors';
import { makeAlbum, makeDocument, sampleDocument } from './testing/catalogFixtures';

describe('catalog selectors', () => {
    const document = sampleDocument();

    describe('dialAlbums', () => {
        it('should keep the catalog order (the admin order)', () => {
            const ordered = makeDocument([makeAlbum('zebra', []), makeAlbum('apple', [])]);
            expect(dialAlbums(ordered).map((album) => album.id)).toEqual(['zebra', 'apple']);
        });

        it('should keep albums that have no tracks yet (D39)', () => {
            const withEmpty = makeDocument([makeAlbum('new-album', [])]);
            expect(dialAlbums(withEmpty).map((album) => album.id)).toEqual(['new-album']);
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
});
