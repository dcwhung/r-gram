import { glowColor, NEUTRAL_ACCENT, type CatalogDocument } from '@r-gram/catalog';
import { COVER_VARIANT } from '../catalog/coverVariants';
import {
    makeAlbum,
    makeDocument,
    sampleDocument,
    withSecondCover,
} from '../catalog/testing/catalogFixtures';
import { armPose, homeView, listFocusTrackId, spindleMode } from './homeView';
import { IDLE_PLAYBACK, type PlaybackState } from './playbackState';
import { INITIAL_STAGE, type StageState } from './stageReducer';

const home = (overrides: Partial<StageState> = {}): StageState => ({
    ...INITIAL_STAGE,
    scene: 'home',
    viewAlbumId: 'apollo-18',
    ...overrides,
});
const playback = (overrides: Partial<PlaybackState> = {}): PlaybackState => ({
    ...IDLE_PLAYBACK,
    status: 'playing',
    albumId: 'apollo-18',
    trackId: 'apollo-18-01',
    ...overrides,
});
const userPaused = playback({ status: 'paused', pauseReason: 'user' });

/* Functional Spec FR-040、CR-003 決定 11、D36；Technical Spec「唱臂姿勢」 */
describe('armPose', () => {
    it('should park the arm when no song is loaded', () => {
        expect(armPose(home(), IDLE_PLAYBACK)).toBe('parked');
    });

    it('should lower the needle while playing the disc on screen', () => {
        expect(armPose(home(), playback())).toBe('playing');
    });

    it('should lift the needle over the disc when the user paused', () => {
        expect(armPose(home(), userPaused)).toBe('lifted');
    });

    it.each([
        ['the MV is showing', home({ overlay: 'mv' }), playback()],
        ['the MV was closed', home(), playback({ status: 'paused', pauseReason: 'mv' })],
        ['the song was restored', home(), playback({ status: 'paused', pauseReason: 'restore' })],
        ['another disc is on screen', home({ viewAlbumId: 'room' }), userPaused],
    ])('should park the arm when %s', (_case, stage, state) => {
        expect(armPose(stage, state)).toBe('parked');
    });
});

describe('spindleMode', () => {
    it('should open the list when no song of this disc is loaded', () => {
        expect(spindleMode(home(), IDLE_PLAYBACK)).toBe('idle');
        expect(spindleMode(home({ viewAlbumId: 'room' }), playback())).toBe('idle');
    });

    it('should show play in the list, pause while playing and play while paused', () => {
        expect(spindleMode(home({ scene: 'list' }), playback())).toBe('list');
        expect(spindleMode(home(), playback())).toBe('playing');
        expect(spindleMode(home(), userPaused)).toBe('paused');
        expect(spindleMode(home(), playback({ status: 'paused', pauseReason: 'mv' }))).toBe(
            'paused',
        );
    });
});

describe('listFocusTrackId', () => {
    const document = sampleDocument();

    it('should keep the track already focused in the list', () => {
        expect(listFocusTrackId(document, home({ selectedTrackId: 'apollo-18-03' }))).toBe(
            'apollo-18-03',
        );
    });

    // US-004：歌單打開時預先揀中第一首（播得嘅）
    it('should focus the first playable track otherwise', () => {
        const skipsSilent = makeDocument([makeAlbum('room', [null, 'room/02.m4a'])]);
        expect(listFocusTrackId(document, home())).toBe('apollo-18-01');
        expect(listFocusTrackId(skipsSilent, home({ viewAlbumId: 'room' }))).toBe('room-02');
    });

    it('should focus nothing when the disc has no playable track', () => {
        const silent = makeDocument([makeAlbum('room', [null])]);
        expect(listFocusTrackId(silent, home({ viewAlbumId: 'room' }))).toBeNull();
    });
});

describe('homeView', () => {
    const withCover = (cover: string | null, mv: string | null = null): CatalogDocument => {
        const document = sampleDocument();
        const [album] = document.albums;
        if (!album?.tracks[0]) throw new Error('fixture changed');
        album.cover = cover;
        album.tracks[0].mv = mv;
        return document;
    };

    it('should show the disc on screen with its colours and cover', () => {
        const view = homeView(withCover('apollo 18.jpg'), home(), IDLE_PLAYBACK);
        expect(view.album?.id).toBe('apollo-18');
        expect(view.accent).toBe('#c8442b');
        expect(view.glow).toBe(glowColor('#c8442b'));
        expect(view.coverUrl).toBe('https://api.example/catalog/v1/img/apollo%2018.jpg');
        expect(view).toMatchObject({ track: null, hasSong: false, hasMv: false, playing: false });
    });

    it('should show the loaded song of this disc with its number and time', () => {
        const view = homeView(
            withCover(null, 'apollo-18/01.mp4'),
            home(),
            playback({ positionSec: 41, durationSec: 205 }),
        );
        expect(view.track?.id).toBe('apollo-18-01');
        expect(view).toMatchObject({ hasSong: true, hasMv: true, playing: true, coverUrl: null });
        expect(view.timeText).toBe('0:41');
        expect(view.progress).toBeCloseTo(0.2);
    });

    // CR-005 D56：開 app 時揀中嘅封面；專輯色永遠跟第一張
    it('should show the cover picked for this launch, keeping the accent of the first cover', () => {
        const document = makeDocument([withSecondCover(makeAlbum('apollo-18', []))]);
        const covers = new Map([['apollo-18', COVER_VARIANT.SECOND]]);
        const view = homeView(document, home(), IDLE_PLAYBACK, covers);
        expect(view.coverUrl).toBe('https://api.example/catalog/v1/img/apollo-18-cover2.webp');
        expect(view.accent).toBe('#c8442b');
    });

    it('should show the first cover when no pick was made for the disc', () => {
        const document = makeDocument([withSecondCover(makeAlbum('apollo-18', []))]);
        const view = homeView(document, home(), IDLE_PLAYBACK, new Map());
        expect(view.coverUrl).toBe('https://api.example/catalog/v1/img/apollo-18-cover.webp');
    });

    it('should use the neutral colours when no disc is on screen', () => {
        const view = homeView(sampleDocument(), home({ viewAlbumId: null }), IDLE_PLAYBACK);
        expect(view.album).toBeNull();
        expect(view.accent).toBe(NEUTRAL_ACCENT);
        expect(view.progress).toBe(0);
    });

    it('should report which overlay is open', () => {
        expect(homeView(sampleDocument(), home({ overlay: 'booklet' }), userPaused)).toMatchObject({
            bookletOpen: true,
            mvOpen: false,
            listOpen: false,
        });
        expect(homeView(sampleDocument(), home({ scene: 'list' }), IDLE_PLAYBACK).listOpen).toBe(
            true,
        );
    });
});

/*
 * T-036：揀碟（Functional Spec D52、CR-005 第 18 版確認；Technical Spec「播緊時揀碟」「補充：第 18 版」）。
 * 載入嘅碟 = 播放狀態嘅 albumId；顯示嘅碟 = viewAlbumId；兩個唔同就係拎住另一隻碟（holding）
 */
describe('homeView while choosing a disc', () => {
    const document = sampleDocument();
    const choosing = (overrides: Partial<StageState> = {}) =>
        home({ scene: 'discChange', ...overrides });

    it('should fade out the tonearm and small buttons while the dial is open, even with no song', () => {
        expect(homeView(document, choosing(), IDLE_PLAYBACK).chromeHidden).toBe(true);
        expect(homeView(document, home(), IDLE_PLAYBACK).chromeHidden).toBe(false);
    });

    it('should fade out the song part of the info while a song is loaded and the dial is open', () => {
        const view = homeView(document, choosing(), playback());
        expect(view).toMatchObject({ chromeHidden: true, songHidden: true });
        expect(homeView(document, home(), playback()).songHidden).toBe(false);
    });

    it('should stop the disc turning while the dial is open, even on the playing disc', () => {
        expect(homeView(document, home(), playback()).spinning).toBe(true);
        expect(homeView(document, choosing(), playback()).spinning).toBe(false);
        expect(homeView(document, home(), userPaused).spinning).toBe(false);
    });

    it('should know which disc is loaded in the turntable', () => {
        expect(homeView(document, home(), IDLE_PLAYBACK).loadedAlbumId).toBeNull();
        const view = homeView(document, choosing({ viewAlbumId: 'room' }), userPaused);
        expect(view.loadedAlbumId).toBe('apollo-18');
    });

    it.each([
        ['the dial points at another disc', choosing({ viewAlbumId: 'room' }), playback(), true],
        ['released on another disc', home({ viewAlbumId: 'room' }), userPaused, true],
        ['back on the loaded disc', choosing(), playback(), false],
        ['no song is loaded', choosing({ viewAlbumId: 'room' }), IDLE_PLAYBACK, false],
        [
            'the list of another disc is open',
            home({ scene: 'list', viewAlbumId: 'room' }),
            playback(),
            false,
        ],
    ])('should tell whether another disc is held when %s', (_case, stage, state, holding) => {
        expect(homeView(document, stage, state).holding).toBe(holding);
    });

    it('should keep the song part and the tonearm hidden while holding another disc', () => {
        const view = homeView(document, home({ viewAlbumId: 'room' }), playback());
        expect(view).toMatchObject({ chromeHidden: true, songHidden: true, spinning: false });
    });

    it('should hand the dial to the scene', () => {
        const view = homeView(document, choosing({ viewAlbumId: 'room' }), IDLE_PLAYBACK);
        expect(view.dial).toMatchObject({ open: true, current: 1 });
    });
});

/*
 * T-048：拎住另一隻碟時右上角嘅細唱片機（Functional Spec FR-043、D58；Technical Spec「補充：第 18 版」）。
 * 細唱片機跟載入嘅碟：封面、歌名、唱臂姿勢（同大唱片機同一套規則，D58 ①）、轉唔轉
 */
describe('homeView mini turntable', () => {
    const document = makeDocument([
        withSecondCover(makeAlbum('apollo-18', ['apollo-18/01.m4a'])),
        makeAlbum('room', ['room/01.m4a']),
    ]);
    const holdingRoom = home({ viewAlbumId: 'room' });
    const mini = (stage: StageState, state: PlaybackState) =>
        homeView(document, stage, state, new Map([['apollo-18', COVER_VARIANT.SECOND]])).mini;

    it('should have no mini turntable when no song is loaded', () => {
        expect(mini(holdingRoom, IDLE_PLAYBACK)).toBeNull();
    });

    it('should show the loaded disc playing while another disc is held', () => {
        expect(mini(holdingRoom, playback())).toMatchObject({
            shown: true,
            title: 'apollo-18 1',
            paused: false,
            armPose: 'playing',
            spinning: true,
            accent: '#c8442b',
            glow: glowColor('#c8442b'),
            coverUrl: 'https://api.example/catalog/v1/img/apollo-18-cover2.webp',
            thumbUrl: 'https://api.example/catalog/v1/img/apollo-18-thumb2.webp',
        });
    });

    it('should show the paused label, a lifted needle and a still disc when the user paused', () => {
        expect(mini(holdingRoom, userPaused)).toMatchObject({
            shown: true,
            paused: true,
            armPose: 'lifted',
            spinning: false,
        });
    });

    // D58 ①：唔係播緊一律「已暫停」；泊位情況（熄咗 MV、重開 app）唱臂喺泊位
    it.each(['mv', 'restore'] as const)(
        'should park the arm of the mini turntable when paused for %s',
        (pauseReason) => {
            const paused = playback({ status: 'paused', pauseReason });
            expect(mini(holdingRoom, paused)).toMatchObject({ paused: true, armPose: 'parked' });
        },
    );

    it('should hide the mini turntable, and stop its disc, while the loaded disc is on screen', () => {
        expect(mini(home(), playback())).toMatchObject({ shown: false, spinning: false });
        expect(mini(home({ scene: 'discChange' }), playback())?.shown).toBe(false);
    });

    it('should show it while the dial points at another disc', () => {
        expect(mini(home({ scene: 'discChange', viewAlbumId: 'room' }), playback())?.shown).toBe(
            true,
        );
    });

    // 由 Favourites 碟播緊：碟面用 ♥ 格（T-070 之前係中性色）；歌名照搵得到
    it('should show the favourites disc when the song was started from it', () => {
        const fromFavourites = playback({ albumId: 'favourites', trackId: 'room-01' });
        expect(mini(holdingRoom, fromFavourites)).toMatchObject({
            title: 'room 1',
            accent: NEUTRAL_ACCENT,
            coverUrl: null,
        });
    });

    it('should leave the title empty when the loaded track is not in the catalog', () => {
        expect(mini(holdingRoom, playback({ trackId: 'gone-01' }))?.title).toBe('');
    });

    it('should keep the big tonearm parked behind the fade while another disc is held', () => {
        expect(homeView(document, holdingRoom, playback()).armPose).toBe('parked');
    });
});
