import type { MvSnapshot } from '../mv/mvController';
import { tvView } from './tvView';

const VIDEO = document.createElement('video');
const COLOURS = { accent: '#c8442b', glow: '#ff8a6a' };
const TRACK = {
    id: 'room-01',
    title: 'Room 1',
    url: 'https://media.example/room/01.mp4',
    nowPlaying: { title: 'Room 1（MV）', album: 'ROOM', artwork: [] },
};

const snapshot = (overrides: Partial<MvSnapshot> = {}): MvSnapshot => ({
    phase: 'open',
    status: 'playing',
    track: TRACK,
    positionSec: 7,
    durationSec: 50,
    failed: false,
    volume: 1,
    muted: false,
    volumeSupported: true,
    ...overrides,
});

/* T-060：設計稿 tvSet()：著燈嘅掣 = 熄機中 ■、暫停 ❚❚、其餘 ▶；機身下面進度線同已播時間 */
describe('tvView', () => {
    it('should have no TV while it is put away', () => {
        expect(tvView(snapshot({ phase: 'closed', track: null }), COLOURS, VIDEO)).toBeNull();
    });

    it.each([
        ['loading', 'open', 'play'],
        ['playing', 'open', 'play'],
        ['paused', 'open', 'pause'],
        ['playing', 'closing', 'stop'],
    ] as const)('should light the right button when %s and %s', (status, phase, active) => {
        expect(tvView(snapshot({ status, phase }), COLOURS, VIDEO)?.active).toBe(active);
    });

    it('should light no button and say so when the MV failed to load', () => {
        const view = tvView(snapshot({ status: 'error', failed: true }), COLOURS, VIDEO);
        expect(view).toMatchObject({ active: null, failed: true });
    });

    it('should show the title, the elapsed time and the progress in the album colours', () => {
        expect(tvView(snapshot(), COLOURS, VIDEO)).toMatchObject({
            phase: 'open',
            title: 'Room 1',
            timeText: '0:07',
            progress: 7 / 50,
            accent: '#c8442b',
            glow: '#ff8a6a',
            video: VIDEO,
        });
    });

    it('should show no progress before the length is known', () => {
        const view = tvView(snapshot({ durationSec: null }), COLOURS, VIDEO);
        expect(view?.progress).toBe(0);
    });
});
