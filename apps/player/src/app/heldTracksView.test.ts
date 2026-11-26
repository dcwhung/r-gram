import { FAVOURITES_ALBUM_ID } from '@r-gram/catalog';
import { makeAlbum, makeDocument, sampleDocument } from '../catalog/testing/catalogFixtures';
import { trackColumnView } from './heldTracksView';
import { IDLE_PLAYBACK, type PlaybackState } from './playbackState';
import { INITIAL_STAGE, type StageState } from './stageReducer';

const stageOn = (viewAlbumId: string, scene: StageState['scene'] = 'home'): StageState => ({
    ...INITIAL_STAGE,
    scene,
    viewAlbumId,
});
const ROOM_PLAYING: PlaybackState = {
    ...IDLE_PLAYBACK,
    status: 'playing',
    albumId: 'room',
    trackId: 'room-01',
};

/*
 * 歌單欄要嘅值（設計稿第 19 版 showsColumn()、trackPanel()；backlog B-086；Functional Spec FR-044、D11、D39、D60、D70）。
 * 一條規則：字母盤開住，或者顯示緊嘅碟未揀歌（冇歌載入、拎住另一隻碟）= 有歌單欄；弧線歌單、MV 開住時冇
 */
describe('trackColumnView', () => {
    it.each([
        ['launch, nothing loaded', stageOn('room'), IDLE_PLAYBACK, true],
        ['nothing loaded, dial open', stageOn('room', 'discChange'), IDLE_PLAYBACK, true],
        ['the loaded disc on screen, dial closed', stageOn('room'), ROOM_PLAYING, false],
        ['the loaded disc, dial open', stageOn('room', 'discChange'), ROOM_PLAYING, true],
        ['holding another disc', stageOn('apollo-18'), ROOM_PLAYING, true],
        ['holding another disc, dial open', stageOn('apollo-18', 'discChange'), ROOM_PLAYING, true],
        ['the arc list is open', stageOn('apollo-18', 'list'), IDLE_PLAYBACK, false],
        ['still on Preload', stageOn('apollo-18', 'preload'), IDLE_PLAYBACK, false],
        ['the MV is open', { ...stageOn('room'), overlay: 'mv' }, ROOM_PLAYING, false],
    ] as const)('should decide whether the column shows when %s', (_case, stage, playback, shown) => {
        const view = trackColumnView(sampleDocument(), stage, playback);
        expect(view !== null).toBe(shown);
    });

    it('should list every track of the disc on screen, grey when it has no audio', () => {
        const view = trackColumnView(sampleDocument(), stageOn('apollo-18'), IDLE_PLAYBACK);
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
        const view = trackColumnView(makeDocument([album]), stageOn('komorebi'), IDLE_PLAYBACK);
        expect(view?.rows.map((row) => row.number)).toEqual(['03', '12']);
    });

    it('should tell whether the dial is open', () => {
        const document = sampleDocument();
        expect(trackColumnView(document, stageOn('room'), IDLE_PLAYBACK)).toMatchObject({
            dialOpen: false,
        });
        expect(
            trackColumnView(document, stageOn('room', 'discChange'), IDLE_PLAYBACK),
        ).toMatchObject({ dialOpen: true });
    });

    // D39；Favourites 碟冇收藏（收藏係 T-070）
    it('should give the empty text of an album without tracks and of the Favourites disc', () => {
        const empty = makeDocument([makeAlbum('blank', [])]);
        expect(trackColumnView(empty, stageOn('blank'), IDLE_PLAYBACK)).toMatchObject({
            rows: [],
            emptyText: '尚未有歌曲',
        });
        expect(trackColumnView(empty, stageOn(FAVOURITES_ALBUM_ID), IDLE_PLAYBACK)).toMatchObject(
            { rows: [], emptyText: '尚未收藏歌曲' },
        );
    });
});
