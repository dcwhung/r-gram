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
                discChangeFrom: null,
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
            { type: 'openList', loadedAlbumId: null },
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
                { type: 'openList', loadedAlbumId: null },
                { type: 'focusTrack', trackId: 'komorebi-07' },
                { type: 'closeList' },
                { type: 'openDiscChange' },
                { type: 'selectAlbum', albumId: 'hours' },
            );
            expect(state).toMatchObject({ viewAlbumId: 'hours', selectedTrackId: null });
        });

        it('should keep the selected track when the same album is chosen again', () => {
            const state = after(
                { type: 'openList', loadedAlbumId: null },
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
                { type: 'openList', loadedAlbumId: null },
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
            const list = after({ type: 'openList', loadedAlbumId: null });
            expect(stageReducer(mv, { type: 'openDiscChange' })).toBe(mv);
            expect(stageReducer(list, { type: 'openDiscChange' })).toBe(list);
        });

        it('should ignore selectAlbum outside disc change', () => {
            const state = home();
            const list = after(
                { type: 'openList', loadedAlbumId: null },
                { type: 'focusTrack', trackId: 'komorebi-07' },
            );
            expect(stageReducer(state, { type: 'selectAlbum', albumId: 'hours' })).toBe(state);
            expect(stageReducer(list, { type: 'selectAlbum', albumId: 'hours' })).toBe(list);
        });

        // S-154：Esc = 取消：返主頁，還原開始揀碟嗰陣嘅碟、之前嗰隻碟同揀中嘅歌
        it('should go back to the disc shown when choosing started on cancel', () => {
            const before = after(
                { type: 'openList', loadedAlbumId: null },
                { type: 'focusTrack', trackId: 'komorebi-07' },
                { type: 'closeList' },
            );
            const turnAndCancel: StageAction[] = [
                { type: 'openDiscChange' },
                { type: 'selectAlbum', albumId: 'hours' },
                { type: 'selectAlbum', albumId: 'i' },
                { type: 'cancelDiscChange' },
            ];
            const state = turnAndCancel.reduce(stageReducer, before);
            expect(state).toEqual(before);
        });

        it('should keep the chosen disc once closed, with nothing left to cancel', () => {
            const closed = after(
                { type: 'openDiscChange' },
                { type: 'selectAlbum', albumId: 'hours' },
                { type: 'closeDiscChange' },
            );
            expect(closed.discChangeFrom).toBeNull();
            expect(stageReducer(closed, { type: 'cancelDiscChange' })).toBe(closed);
        });

        it('should ignore closeDiscChange outside disc change', () => {
            const states = [
                INITIAL_STAGE,
                home(),
                after({ type: 'openList', loadedAlbumId: null }),
                after({ type: 'toggleBooklet', hasSong: true }),
                after({ type: 'openMv', hasMv: true }),
            ];
            for (const state of states) {
                expect(stageReducer(state, { type: 'closeDiscChange' })).toBe(state);
                expect(stageReducer(state, { type: 'cancelDiscChange' })).toBe(state);
            }
        });
    });

    describe('track list', () => {
        it('should open from home and close without changing the album (D25)', () => {
            const open = after({ type: 'openList', loadedAlbumId: null });
            expect(open.scene).toBe('list');
            expect(stageReducer(open, { type: 'closeList' })).toMatchObject({
                scene: 'home',
                viewAlbumId: 'komorebi',
            });
        });

        it('should remember the focused track', () => {
            const state = after(
                { type: 'openList', loadedAlbumId: null },
                { type: 'focusTrack', trackId: 'komorebi-03' },
            );
            expect(state.selectedTrackId).toBe('komorebi-03');
        });

        // S-037：捲動歌單時同一首歌會重覆報：冇變就回傳同一個物件，唔使 re-render
        it('should return the same state when the focused track does not change', () => {
            const state = after(
                { type: 'openList', loadedAlbumId: null },
                { type: 'focusTrack', trackId: 'komorebi-03' },
            );
            expect(stageReducer(state, { type: 'focusTrack', trackId: 'komorebi-03' })).toBe(state);
        });

        it('should go home when the focused track is played', () => {
            const state = after(
                { type: 'openList', loadedAlbumId: null },
                { type: 'focusTrack', trackId: 'komorebi-03' },
                { type: 'playSelected' },
            );
            expect(state).toMatchObject({ scene: 'home', selectedTrackId: 'komorebi-03' });
        });

        it('should stay in the list when there is no focused track to play', () => {
            const list = after({ type: 'openList', loadedAlbumId: null });
            expect(stageReducer(list, { type: 'playSelected' })).toBe(list);
        });

        it('should close the booklet when the list opens', () => {
            const state = after(
                { type: 'toggleBooklet', hasSong: true },
                { type: 'openList', loadedAlbumId: null },
            );
            expect(state).toMatchObject({ scene: 'list', overlay: null });
        });

        it('should not open while the MV is showing', () => {
            const mv = after({ type: 'openMv', hasMv: true });
            expect(stageReducer(mv, { type: 'openList', loadedAlbumId: null })).toBe(mv);
        });

        it('should ignore focusTrack and playSelected outside the list', () => {
            const state = home();
            expect(stageReducer(state, { type: 'focusTrack', trackId: 'x' })).toBe(state);
            expect(stageReducer(state, { type: 'playSelected' })).toBe(state);
        });

        it('should ignore closeList outside the list', () => {
            const states = [
                INITIAL_STAGE,
                home(),
                after({ type: 'openDiscChange' }),
                after({ type: 'toggleBooklet', hasSong: true }),
                after({ type: 'openMv', hasMv: true }),
            ];
            for (const state of states) {
                expect(stageReducer(state, { type: 'closeList' })).toBe(state);
            }
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
                { type: 'openList', loadedAlbumId: null },
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
            const list = after({ type: 'openList', loadedAlbumId: null });
            const mv = after({ type: 'openMv', hasMv: true });
            expect(stageReducer(list, { type: 'toggleFavourites' })).toBe(list);
            expect(stageReducer(mv, { type: 'toggleFavourites' })).toBe(mv);
        });
    });

    /*
     * T-048：拎住另一隻碟（Functional Spec FR-043、D52、D58；Technical Spec「補充：第 18 版」）。
     * 載入嘅碟（播放狀態嘅 albumId）由發出動作嗰邊帶入嚟；呢度 `komorebi` 係載入嘅碟
     */
    describe('holding another disc', () => {
        const LOADED = 'komorebi';
        const turnedTo = (albumId: string) =>
            after({ type: 'openDiscChange' }, { type: 'selectAlbum', albumId });
        const holding = (albumId = 'hours') =>
            stageReducer(turnedTo(albumId), { type: 'closeDiscChange' });

        it('should not open the arc list while another disc is held', () => {
            const held = holding();
            const turning = turnedTo('hours');
            expect(stageReducer(held, { type: 'openList', loadedAlbumId: LOADED })).toBe(held);
            expect(stageReducer(turning, { type: 'openList', loadedAlbumId: LOADED })).toBe(
                turning,
            );
        });

        it('should still open the list on the loaded disc or when no song is loaded', () => {
            expect(after({ type: 'openList', loadedAlbumId: LOADED }).scene).toBe('list');
            const other = holding();
            expect(stageReducer(other, { type: 'openList', loadedAlbumId: null }).scene).toBe(
                'list',
            );
        });

        it('should put the held disc back and show the loaded disc on returnToLoaded', () => {
            const back = stageReducer(holding(), { type: 'returnToLoaded', loadedAlbumId: LOADED });
            expect(back).toMatchObject({ scene: 'home', overlay: null, viewAlbumId: LOADED });
        });

        it('should close the dial when returning while it is open', () => {
            const back = stageReducer(turnedTo('hours'), {
                type: 'returnToLoaded',
                loadedAlbumId: LOADED,
            });
            expect(back).toMatchObject({
                scene: 'home',
                viewAlbumId: LOADED,
                discChangeFrom: null,
            });
        });

        it.each([
            ['no song is loaded', holding(), null],
            ['the loaded disc is already on screen', after(), LOADED],
            ['the list is open', after({ type: 'openList', loadedAlbumId: null }), 'hours'],
            ['the MV is showing', after({ type: 'openMv', hasMv: true }), 'hours'],
            ['still on Preload', INITIAL_STAGE, LOADED],
        ])('should ignore returnToLoaded when %s', (_case, state, loadedAlbumId) => {
            expect(stageReducer(state, { type: 'returnToLoaded', loadedAlbumId })).toBe(state);
        });

        // D58 ④：拎住期間 ♥ = 轉去 ♥ 格（拎住 Favourites 碟）；再㩒返去拎住之前嗰隻碟
        it('should hold the favourites disc on the heart and go back to the held disc again', () => {
            const favourites = stageReducer(holding(), { type: 'toggleFavourites' });
            expect(favourites).toMatchObject({ viewAlbumId: FAVOURITES, previousAlbumId: 'hours' });
            expect(stageReducer(favourites, { type: 'toggleFavourites' }).viewAlbumId).toBe(
                'hours',
            );
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
                after({ type: 'openList', loadedAlbumId: null }),
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
            const list = after({ type: 'openList', loadedAlbumId: null });
            expect(stageReducer(disc, { type: 'openMv', hasMv: true })).toBe(disc);
            expect(stageReducer(list, { type: 'openMv', hasMv: true })).toBe(list);
        });

        it('should ignore closeMv when the MV is not showing', () => {
            const booklet = after({ type: 'toggleBooklet', hasSong: true });
            expect(stageReducer(booklet, { type: 'closeMv' })).toBe(booklet);
        });
    });

    // S-037：型別以外嘅動作（由 JS 發出、打錯 type）當唔合規，唔可以 throw
    it.each(['somethingElse', 'toString', 'constructor', '__proto__'])(
        'should ignore the unknown action type %j',
        (type) => {
            const state = home();
            expect(stageReducer(state, { type } as unknown as StageAction)).toBe(state);
        },
    );

    /*
     * 窮舉（S-036）：由 INITIAL_STAGE 開始，用下面每一個動作做 BFS，行晒所有可到達嘅狀態，
     * 逐個驗不變量。取代之前只行一條固定次序嘅測試。
     */
    describe('every reachable state', () => {
        const ACTIONS: StageAction[] = [
            { type: 'preloadDone', albumId: 'komorebi' },
            { type: 'openDiscChange' },
            { type: 'selectAlbum', albumId: 'hours' },
            { type: 'selectAlbum', albumId: FAVOURITES },
            { type: 'closeDiscChange' },
            { type: 'cancelDiscChange' },
            { type: 'openList', loadedAlbumId: null },
            { type: 'openList', loadedAlbumId: 'komorebi' },
            { type: 'returnToLoaded', loadedAlbumId: 'komorebi' },
            { type: 'focusTrack', trackId: 'track-a' },
            { type: 'focusTrack', trackId: 'track-b' },
            { type: 'playSelected' },
            { type: 'closeList' },
            { type: 'toggleFavourites' },
            { type: 'toggleBooklet', hasSong: true },
            { type: 'toggleBooklet', hasSong: false },
            { type: 'openMv', hasMv: true },
            { type: 'openMv', hasMv: false },
            { type: 'closeMv' },
        ];
        const key = (state: StageState) =>
            [
                state.scene,
                state.overlay,
                state.viewAlbumId,
                state.previousAlbumId,
                state.selectedTrackId,
                JSON.stringify(state.discChangeFrom),
            ].join('|');
        const isPlainHome = (state: StageState) => state.scene === 'home' && state.overlay === null;

        const reachable = (): StageState[] => {
            const seen = new Set([key(INITIAL_STAGE)]);
            const queue = [INITIAL_STAGE];
            // 一路行一路加：queue 入面每個狀態只會出現一次
            for (const state of queue) {
                for (const action of ACTIONS) {
                    const next = stageReducer(state, action);
                    if (seen.has(key(next))) continue;
                    seen.add(key(next));
                    queue.push(next);
                }
            }
            return queue;
        };
        const states = reachable();

        it('should reach every scene and both overlays', () => {
            expect(new Set(states.map((state) => state.scene))).toEqual(
                new Set(['preload', 'home', 'discChange', 'list']),
            );
            expect(new Set(states.map((state) => state.overlay))).toEqual(
                new Set([null, 'booklet', 'mv']),
            );
        });

        it('should only show an overlay on the home scene', () => {
            const offenders = states.filter(
                (state) => state.overlay !== null && state.scene !== 'home',
            );
            expect(offenders).toEqual([]);
        });

        it('should have an album to show everywhere except preload, which is only the start', () => {
            const preload = states.filter((state) => state.scene === 'preload');
            const albumless = states.filter(
                (state) => state.scene !== 'preload' && state.viewAlbumId === null,
            );
            expect(preload).toEqual([INITIAL_STAGE]);
            expect(albumless).toEqual([]);
        });

        // S-154：開始揀碟嗰陣嘅狀態只喺揀碟期間記住
        it('should remember where choosing started only while choosing', () => {
            const offenders = states.filter(
                (state) => (state.discChangeFrom !== null) !== (state.scene === 'discChange'),
            );
            expect(offenders).toEqual([]);
        });

        // S-037：動作冇改到任何嘢就回傳同一個物件（reference 相同），元件唔會白白 re-render
        it('should return the very same state whenever an action changes nothing', () => {
            const copies = states.flatMap((state) =>
                ACTIONS.filter((action) => {
                    const next = stageReducer(state, action);
                    return next !== state && key(next) === key(state);
                }).map((action) => ({ state, action })),
            );
            expect(copies).toEqual([]);
        });

        // 冇卡死嘅狀態：每個狀態最多一個動作就返到淨主頁（冇 overlay 嘅 home）
        it('should be at most one action away from the plain home scene', () => {
            const stuck = states.filter(
                (state) =>
                    !isPlainHome(state) &&
                    !ACTIONS.some((action) => isPlainHome(stageReducer(state, action))),
            );
            expect(stuck).toEqual([]);
        });
    });
});
