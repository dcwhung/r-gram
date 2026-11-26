import { FAVOURITES_ALBUM_ID } from '@r-gram/catalog';
import { makeAlbum, makeDocument, sampleDocument } from '../catalog/testing/catalogFixtures';
import { heldTracksView } from './heldTracksView';
import { INITIAL_STAGE, type StageState } from './stageReducer';

const stageOn = (viewAlbumId: string, scene: StageState['scene'] = 'home'): StageState => ({
    ...INITIAL_STAGE,
    scene,
    viewAlbumId,
});

/* T-049：拎住嘅碟嘅歌單欄要嘅值（Functional Spec FR-044、D11、D39、D60、D70） */
describe('heldTracksView', () => {
    it('should have no column when no other disc is held', () => {
        expect(heldTracksView(sampleDocument(), stageOn('room'), false)).toBeNull();
    });

    it('should list every track of the held disc, grey when it has no audio', () => {
        const view = heldTracksView(sampleDocument(), stageOn('apollo-18'), true);
        expect(view?.albumId).toBe('apollo-18');
        expect(view?.accent).toBe('#c8442b');
        expect(view?.rows.map(({ number, playable }) => [number, playable])).toEqual([
            ['01', true],
            ['02', false],
            ['03', true],
        ]);
        expect(view?.rows[0]).toMatchObject({ id: 'apollo-18-01', no: 1, title: 'apollo-18 1' });
    });

    // CR-006 D60：歌號跟 track.no，可以跳號（唔用位置）
    it('should show the real track number even when numbers skip', () => {
        const album = makeAlbum('komorebi', ['a.m4a', 'b.m4a']);
        album.tracks = album.tracks.map((track, index) => ({ ...track, no: index === 0 ? 3 : 12 }));
        const view = heldTracksView(makeDocument([album]), stageOn('komorebi'), true);
        expect(view?.rows.map((row) => row.number)).toEqual(['03', '12']);
    });

    it('should let rows be pressed only once the dial is released', () => {
        expect(heldTracksView(sampleDocument(), stageOn('room'), true)).toMatchObject({
            pressable: true,
            dialOpen: false,
        });
        expect(heldTracksView(sampleDocument(), stageOn('room', 'discChange'), true)).toMatchObject(
            { pressable: false, dialOpen: true },
        );
    });

    // D39；Favourites 碟冇收藏（收藏係 T-070）
    it('should give the empty text of an album without tracks and of the Favourites disc', () => {
        const empty = makeDocument([makeAlbum('blank', [])]);
        expect(heldTracksView(empty, stageOn('blank'), true)).toMatchObject({
            rows: [],
            emptyText: '尚未有歌曲',
        });
        expect(heldTracksView(empty, stageOn(FAVOURITES_ALBUM_ID), true)).toMatchObject({
            rows: [],
            emptyText: '尚未收藏歌曲',
        });
    });
});
