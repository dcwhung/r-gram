import { NO_COVER_PICKS } from '../catalog/coverVariants';
import { makeAlbum, makeDocument } from '../catalog/testing/catalogFixtures';
import { playbackSource } from './playbackSource';

const withCover = () => {
    const album = makeAlbum('apollo-18', ['apollo 18/01 a.m4a', null, 'apollo 18/03.m4a']);
    return makeDocument([
        { ...album, cover: 'apollo-18-cover.webp', thumb: 'apollo-18-thumb.webp' },
    ]);
};

describe('playbackSource', () => {
    it('should list only the playable tracks with encoded audio URLs (D11)', () => {
        const source = playbackSource(withCover(), 'apollo-18', NO_COVER_PICKS);
        expect(source).toMatchObject({ albumId: 'apollo-18', albumTitle: 'APOLLO-18' });
        expect(source?.tracks).toEqual([
            {
                id: 'apollo-18-01',
                title: 'apollo-18 1',
                url: 'https://media.example/apollo%2018/01%20a.m4a',
            },
            {
                id: 'apollo-18-03',
                title: 'apollo-18 3',
                url: 'https://media.example/apollo%2018/03.m4a',
            },
        ]);
    });

    // T-011 報告 §2.6：封面 thumb（320）+ cover（1200），連 sizes、type
    it('should give the lock screen the thumbnail and the large cover', () => {
        const source = playbackSource(withCover(), 'apollo-18', NO_COVER_PICKS);
        expect(source?.artwork).toEqual([
            {
                src: 'https://api.example/catalog/v1/img/apollo-18-thumb.webp',
                sizes: '320x320',
                type: 'image/webp',
            },
            {
                src: 'https://api.example/catalog/v1/img/apollo-18-cover.webp',
                sizes: '1200x1200',
                type: 'image/webp',
            },
        ]);
    });

    it('should have no artwork without a cover and no source for an unknown album', () => {
        const document = makeDocument([makeAlbum('room', ['room/01.m4a'])]);
        expect(playbackSource(document, 'room', NO_COVER_PICKS)?.artwork).toEqual([]);
        expect(playbackSource(document, 'nope', NO_COVER_PICKS)).toBeNull();
    });
});
