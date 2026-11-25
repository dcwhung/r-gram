/* 測試用 catalog 自己都要過到 validator：之後播放端嘅測試（T-046 隨機封面）靠佢砌兩張封面嘅碟 */
import { parseCatalogDocument } from '@r-gram/catalog';
import { makeAlbum, makeDocument, sampleDocument, withSecondCover } from './catalogFixtures';

describe('catalog fixtures', () => {
    it('should build a sample document that passes the validator', () => {
        expect(parseCatalogDocument(sampleDocument()).ok).toBe(true);
    });

    it('should give an album a first and a second cover that pass the validator', () => {
        const album = withSecondCover(makeAlbum('room', ['room/01.m4a']));
        expect(album).toMatchObject({
            cover: 'room-cover.webp',
            thumb: 'room-thumb.webp',
            cover2: 'room-cover2.webp',
            thumb2: 'room-thumb2.webp',
        });
        expect(parseCatalogDocument(makeDocument([album])).ok).toBe(true);
    });

    it('should keep a first cover the album already has', () => {
        const album = withSecondCover({
            ...makeAlbum('room', []),
            cover: 'a.webp',
            thumb: 'b.webp',
        });
        expect(album).toMatchObject({ cover: 'a.webp', thumb: 'b.webp' });
    });
});
