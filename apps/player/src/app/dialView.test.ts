import { FAVOURITES_ALBUM_ID } from '@r-gram/catalog';
import { COVER_VARIANT } from '../catalog/coverVariants';
import { sampleDocument, withSecondCover } from '../catalog/testing/catalogFixtures';
import { dialView, HEART_KEY } from './dialView';
import { INITIAL_STAGE, type StageState } from './stageReducer';

const stage = (overrides: Partial<StageState> = {}): StageState => ({
    ...INITIAL_STAGE,
    scene: 'home',
    viewAlbumId: 'apollo-18',
    ...overrides,
});

/* Functional Spec US-003、D28、D47；Technical Spec「刻度同字母盤」：格數 = 專輯數 + 1（♥），次序跟 catalog */
describe('dialView', () => {
    it('should give one position per album in catalog order, then ♥', () => {
        const dial = dialView(sampleDocument(), stage());
        expect(dial.entries.map((entry) => [entry.albumId, entry.key])).toEqual([
            ['apollo-18', 'A'],
            ['room', 'R'],
            [FAVOURITES_ALBUM_ID, HEART_KEY],
        ]);
    });

    it.each([
        ['apollo-18', 0],
        ['room', 1],
        [FAVOURITES_ALBUM_ID, 2],
    ])('should point at %s (position %d)', (albumId, position) => {
        expect(dialView(sampleDocument(), stage({ viewAlbumId: albumId })).current).toBe(position);
    });

    it('should point at the first disc when no disc is on screen', () => {
        expect(dialView(sampleDocument(), stage({ viewAlbumId: null })).current).toBe(0);
    });

    it('should open while choosing a disc only', () => {
        expect(dialView(sampleDocument(), stage()).open).toBe(false);
        expect(dialView(sampleDocument(), stage({ scene: 'discChange' })).open).toBe(true);
    });

    // CR-005 D56：轉盤嘅碟用今次開 app 揀中嗰張嘅縮圖
    it('should use the picked cover and its own thumbnail for every disc', () => {
        const document = sampleDocument();
        document.albums = document.albums.map(withSecondCover);
        const covers = new Map([['room', COVER_VARIANT.SECOND]]);
        const [apollo, room, heart] = dialView(document, stage(), covers).entries;
        expect(apollo?.thumbUrl).toBe('https://api.example/catalog/v1/img/apollo-18-thumb.webp');
        expect(room?.coverUrl).toBe('https://api.example/catalog/v1/img/room-cover2.webp');
        expect(room?.thumbUrl).toBe('https://api.example/catalog/v1/img/room-thumb2.webp');
        expect(heart).toMatchObject({ coverUrl: null, thumbUrl: null });
    });

    it('should leave the images empty and keep the album colour when an album has no cover', () => {
        const [apollo] = dialView(sampleDocument(), stage()).entries;
        expect(apollo).toMatchObject({ coverUrl: null, thumbUrl: null, accent: '#c8442b' });
    });
});
