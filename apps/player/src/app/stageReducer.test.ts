import { INITIAL_STAGE, stageReducer, type StageAction, type StageState } from './stageReducer';

const FAVOURITES = 'favourites';

/** 由 Preload 完成之後嘅主頁開始，再順序做幾個動作 */
const after = (...actions: StageAction[]): StageState => actions.reduce(stageReducer, home());

const home = (albumId = 'komorebi'): StageState =>
    stageReducer(INITIAL_STAGE, { type: 'preloadDone', albumId });

describe('stageReducer', () => {
    describe('preload', () => {
        it('should start on the preload scene with nothing selected', () => {
            expect(INITIAL_STAGE).toEqual({
                scene: 'preload',
                overlay: null,
                viewAlbumId: null,
                previousAlbumId: null,
                selectedTrackId: null,
            });
        });

        it('should go home showing the given album when loading is done', () => {
            expect(home('apollo-18')).toMatchObject({ scene: 'home', viewAlbumId: 'apollo-18' });
        });

        it('should restore the selected track when resuming', () => {
            const state = stageReducer(INITIAL_STAGE, {
                type: 'preloadDone',
                albumId: 'komorebi',
                trackId: 'komorebi-07',
            });
            expect(state.selectedTrackId).toBe('komorebi-07');
        });

        it.each<StageAction>([
            { type: 'openDiscChange' },
            { type: 'openList' },
            { type: 'toggleBooklet', hasSong: true },
            { type: 'openMv', hasMv: true },
            { type: 'toggleFavourites' },
        ])('should ignore $type before loading is done', (action) => {
            expect(stageReducer(INITIAL_STAGE, action)).toBe(INITIAL_STAGE);
        });

        it('should ignore a second preloadDone', () => {
            const state = home();
            expect(stageReducer(state, { type: 'preloadDone', albumId: 'i' })).toBe(state);
        });
    });

    describe('disc change', () => {
        it('should open from home and close back to home', () => {
            const open = after({ type: 'openDiscChange' });
            expect(open.scene).toBe('discChange');
            expect(stageReducer(open, { type: 'closeDiscChange' }).scene).toBe('home');
        });

        it('should show the chosen album and clear the selected track', () => {
            const state = after(
                { type: 'openList' },
                { type: 'focusTrack', trackId: 'komorebi-07' },
                { type: 'closeList' },
                { type: 'openDiscChange' },
                { type: 'selectAlbum', albumId: 'hours' },
            );
            expect(state).toMatchObject({ viewAlbumId: 'hours', selectedTrackId: null });
        });

        it('should keep the selected track when the same album is chosen again', () => {
            const state = after(
                { type: 'openList' },
                { type: 'focusTrack', trackId: 'komorebi-07' },
                { type: 'closeList' },
                { type: 'openDiscChange' },
                { type: 'selectAlbum', albumId: 'komorebi' },
            );
            expect(state.selectedTrackId).toBe('komorebi-07');
        });

        // D27：再扭旋鈕 = 留喺揀咗嗰隻碟返主頁
        it('should stay on the chosen album when closing', () => {
            const state = after(
                { type: 'openDiscChange' },
                { type: 'selectAlbum', albumId: 'hours' },
                { type: 'closeDiscChange' },
            );
            expect(state).toMatchObject({ scene: 'home', viewAlbumId: 'hours' });
        });

        // D27：㩒碟面 = 入嗰隻碟嘅歌單
        it('should open the track list of the chosen album straight from disc change', () => {
            const state = after(
                { type: 'openDiscChange' },
                { type: 'selectAlbum', albumId: 'hours' },
                { type: 'openList' },
            );
            expect(state).toMatchObject({ scene: 'list', viewAlbumId: 'hours' });
        });

        it('should close the booklet when disc change opens', () => {
            const state = after(
                { type: 'toggleBooklet', hasSong: true },
                { type: 'openDiscChange' },
            );
            expect(state).toMatchObject({ scene: 'discChange', overlay: null });
        });

        it('should not open while the MV is showing or from the track list', () => {
            const mv = after({ type: 'openMv', hasMv: true });
            const list = after({ type: 'openList' });
            expect(stageReducer(mv, { type: 'openDiscChange' })).toBe(mv);
            expect(stageReducer(list, { type: 'openDiscChange' })).toBe(list);
        });

        it('should ignore selectAlbum outside disc change', () => {
            const state = home();
            expect(stageReducer(state, { type: 'selectAlbum', albumId: 'hours' })).toBe(state);
        });
    });

    describe('track list', () => {
        it('should open from home and close without changing the album (D25)', () => {
            const open = after({ type: 'openList' });
            expect(open.scene).toBe('list');
            expect(stageReducer(open, { type: 'closeList' })).toMatchObject({
                scene: 'home',
                viewAlbumId: 'komorebi',
            });
        });

        it('should remember the focused track', () => {
            const state = after(
                { type: 'openList' },
                { type: 'focusTrack', trackId: 'komorebi-03' },
            );
            expect(state.selectedTrackId).toBe('komorebi-03');
        });

        it('should go home when the focused track is played', () => {
            const state = after(
                { type: 'openList' },
                { type: 'focusTrack', trackId: 'komorebi-03' },
                { type: 'playSelected' },
            );
            expect(state).toMatchObject({ scene: 'home', selectedTrackId: 'komorebi-03' });
        });

        it('should stay in the list when there is no focused track to play', () => {
            const list = after({ type: 'openList' });
            expect(stageReducer(list, { type: 'playSelected' })).toBe(list);
        });

        it('should close the booklet when the list opens', () => {
            const state = after({ type: 'toggleBooklet', hasSong: true }, { type: 'openList' });
            expect(state).toMatchObject({ scene: 'list', overlay: null });
        });

        it('should not open while the MV is showing', () => {
            const mv = after({ type: 'openMv', hasMv: true });
            expect(stageReducer(mv, { type: 'openList' })).toBe(mv);
        });

        it('should ignore focusTrack and playSelected outside the list', () => {
            const state = home();
            expect(stageReducer(state, { type: 'focusTrack', trackId: 'x' })).toBe(state);
            expect(stageReducer(state, { type: 'playSelected' })).toBe(state);
        });
    });

    describe('favourites', () => {
        it('should jump to the favourites disc and back to the previous album', () => {
            const there = after({ type: 'toggleFavourites' });
            expect(there).toMatchObject({ viewAlbumId: FAVOURITES, previousAlbumId: 'komorebi' });
            expect(stageReducer(there, { type: 'toggleFavourites' })).toMatchObject({
                viewAlbumId: 'komorebi',
            });
        });

        it('should work while changing disc and keep that scene', () => {
            const state = after({ type: 'openDiscChange' }, { type: 'toggleFavourites' });
            expect(state).toMatchObject({ scene: 'discChange', viewAlbumId: FAVOURITES });
        });

        it('should clear the selected track and close the booklet', () => {
            const state = after(
                { type: 'openList' },
                { type: 'focusTrack', trackId: 'komorebi-07' },
                { type: 'playSelected' },
                { type: 'toggleBooklet', hasSong: true },
                { type: 'toggleFavourites' },
            );
            expect(state).toMatchObject({ overlay: null, selectedTrackId: null });
        });

        it('should stay on favourites when there is no previous album to return to', () => {
            const state = stageReducer(INITIAL_STAGE, { type: 'preloadDone', albumId: FAVOURITES });
            expect(stageReducer(state, { type: 'toggleFavourites' })).toBe(state);
        });

        it('should remember the album left behind when reached through disc change', () => {
            const state = after(
                { type: 'openDiscChange' },
                { type: 'selectAlbum', albumId: FAVOURITES },
                { type: 'toggleFavourites' },
            );
            expect(state.viewAlbumId).toBe('komorebi');
        });

        it('should not react in the track list or while the MV is showing', () => {
            const list = after({ type: 'openList' });
            const mv = after({ type: 'openMv', hasMv: true });
            expect(stageReducer(list, { type: 'toggleFavourites' })).toBe(list);
            expect(stageReducer(mv, { type: 'toggleFavourites' })).toBe(mv);
        });
    });

    describe('booklet', () => {
        it('should open and close on the home scene when a song is loaded', () => {
            const open = after({ type: 'toggleBooklet', hasSong: true });
            expect(open.overlay).toBe('booklet');
            expect(stageReducer(open, { type: 'toggleBooklet', hasSong: true }).overlay).toBeNull();
        });

        // D24：冇歌時 i 掣㩒唔到
        it('should not open without a song', () => {
            const state = home();
            expect(stageReducer(state, { type: 'toggleBooklet', hasSong: false })).toBe(state);
        });

        it('should still close after the song is gone', () => {
            const open = after({ type: 'toggleBooklet', hasSong: true });
            expect(
                stageReducer(open, { type: 'toggleBooklet', hasSong: false }).overlay,
            ).toBeNull();
        });

        it('should not open while changing disc, in the list or over the MV', () => {
            const states = [
                after({ type: 'openDiscChange' }),
                after({ type: 'openList' }),
                after({ type: 'openMv', hasMv: true }),
            ];
            for (const state of states) {
                expect(stageReducer(state, { type: 'toggleBooklet', hasSong: true })).toBe(state);
            }
        });
    });

    describe('MV', () => {
        it('should open over the home scene and close back to it', () => {
            const open = after({ type: 'openMv', hasMv: true });
            expect(open).toMatchObject({ scene: 'home', overlay: 'mv' });
            expect(stageReducer(open, { type: 'closeMv' }).overlay).toBeNull();
        });

        it('should not open when the song has no MV', () => {
            const state = home();
            expect(stageReducer(state, { type: 'openMv', hasMv: false })).toBe(state);
        });

        it('should replace the booklet (the two never show together)', () => {
            const state = after(
                { type: 'toggleBooklet', hasSong: true },
                { type: 'openMv', hasMv: true },
            );
            expect(state.overlay).toBe('mv');
        });

        it('should not open while changing disc or in the list', () => {
            const disc = after({ type: 'openDiscChange' });
            const list = after({ type: 'openList' });
            expect(stageReducer(disc, { type: 'openMv', hasMv: true })).toBe(disc);
            expect(stageReducer(list, { type: 'openMv', hasMv: true })).toBe(list);
        });

        it('should ignore closeMv when the MV is not showing', () => {
            const booklet = after({ type: 'toggleBooklet', hasSong: true });
            expect(stageReducer(booklet, { type: 'closeMv' })).toBe(booklet);
        });
    });

    it('should never show an overlay outside the home scene', () => {
        const actions: StageAction[] = [
            { type: 'toggleBooklet', hasSong: true },
            { type: 'openDiscChange' },
            { type: 'toggleFavourites' },
            { type: 'openList' },
            { type: 'closeList' },
            { type: 'openMv', hasMv: true },
            { type: 'openList' },
            { type: 'closeMv' },
            { type: 'openList' },
        ];
        let state = home();
        for (const action of actions) {
            state = stageReducer(state, action);
            if (state.scene !== 'home') expect(state.overlay).toBeNull();
        }
        expect(state.scene).toBe('list');
    });
});
