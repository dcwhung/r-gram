import { FAVOURITES_ALBUM_ID } from '@r-gram/catalog';
import { makeAlbum, makeDocument, sampleDocument } from '../catalog/testing/catalogFixtures';
import { listView } from './listView';
import { IDLE_PLAYBACK, type PlaybackState } from './playbackState';
import { INITIAL_STAGE, type StageState } from './stageReducer';

const listOn = (viewAlbumId: string, selectedTrackId: string | null = null): StageState => ({
    ...INITIAL_STAGE,
    scene: 'list',
    viewAlbumId,
    selectedTrackId,
});

/* T-037：弧線歌單要嘅值（Functional Spec US-004、D11、D39、D60；設計稿第 18 版 listLayer()） */
describe('listView', () => {
    it('should have no list unless the list is open', () => {
        const stage = { ...listOn('room'), scene: 'home' } as const;
        expect(listView(sampleDocument(), stage)).toBeNull();
    });

    it('should list every track of the disc, grey when it has no audio, focused on the selection', () => {
        const view = listView(sampleDocument(), listOn('apollo-18', 'apollo-18-03'));
        expect(view?.albumId).toBe('apollo-18');
        expect(view?.accent).toBe('#c8442b');
        expect(view?.rows.map(({ number, playable }) => [number, playable])).toEqual([
            ['01', true],
            ['02', false],
            ['03', true],
        ]);
        expect(view?.focusIndex).toBe(2);
    });

    it('should focus the first row when nothing is selected', () => {
        expect(listView(sampleDocument(), listOn('apollo-18'))?.focusIndex).toBe(0);
    });

    // CR-006 D60：歌號跟 track.no，可以跳號（唔用位置）
    it('should show the real track number even when numbers skip', () => {
        const album = makeAlbum('komorebi', ['a.m4a', 'b.m4a']);
        album.tracks = album.tracks.map((track, index) => ({ ...track, no: index === 0 ? 3 : 12 }));
        const view = listView(makeDocument([album]), listOn('komorebi'));
        expect(view?.rows.map((row) => row.number)).toEqual(['03', '12']);
    });

    // D39：冇歌嘅專輯照開歌單，框入面一行「尚未有歌曲」；Favourites 碟冇收藏有自己一句
    it('should carry the empty text for a disc without tracks', () => {
        const empty = makeDocument([makeAlbum('room', [])]);
        expect(listView(empty, listOn('room'))).toMatchObject({
            rows: [],
            focusIndex: 0,
            emptyText: '尚未有歌曲',
        });
        expect(listView(empty, listOn(FAVOURITES_ALBUM_ID))?.emptyText).toBe('尚未收藏歌曲');
    });
});

/* 設計稿第 19 版 openListFloating()（B-086 ②）：由歌單欄開（顯示緊嘅碟未揀歌）= 歌名由歌單欄飄落弧線 */
describe('listView opened from the track column', () => {
    const loaded: PlaybackState = {
        ...IDLE_PLAYBACK,
        status: 'playing',
        albumId: 'apollo-18',
        trackId: 'apollo-18-01',
    };

    it.each([
        ['nothing is loaded', listOn('apollo-18'), IDLE_PLAYBACK, true],
        ['another disc is loaded (held disc)', listOn('room'), loaded, true],
        ['the disc is the loaded one', listOn('apollo-18'), loaded, false],
    ])('should tell whether it opens from the column when %s', (_c, stage, playback, expected) => {
        expect(listView(sampleDocument(), stage, playback)?.fromColumn).toBe(expected);
    });
});
