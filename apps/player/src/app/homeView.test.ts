import { glowColor, NEUTRAL_ACCENT, type CatalogDocument } from '@r-gram/catalog';
import { makeAlbum, makeDocument, sampleDocument } from '../catalog/testing/catalogFixtures';
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
