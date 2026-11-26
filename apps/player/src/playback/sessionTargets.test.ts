import { createMediaSession, type MediaSessionHandlers } from './mediaSession';
import { createSessionTargets } from './sessionTargets';
import { asMetadata, asSession, FakeMediaSession, FakeMetadata } from './testing/fakeMediaSession';

const ART: MediaImage[] = [{ src: 'https://img.example/room.webp', sizes: '320x320' }];
const RECORD = { title: 'Room 1', album: 'ROOM', artwork: ART };
const MV = { title: 'Room 1（MV）', album: 'ROOM', artwork: ART };

const handlers = (): MediaSessionHandlers & { previous: () => void; next: () => void } => ({
    play: vi.fn(),
    pause: vi.fn(),
    previous: vi.fn(),
    next: vi.fn(),
    seekTo: vi.fn(),
});

const setup = () => {
    const fake = new FakeMediaSession();
    const targets = createSessionTargets(
        createMediaSession(asSession(fake), asMetadata(FakeMetadata)),
    );
    const record = handlers();
    const mv = { play: vi.fn(), pause: vi.fn(), seekTo: vi.fn() };
    targets.record?.bind(record);
    targets.mv?.bind(mv);
    return { fake, targets, record, mv };
};

/* Technical Spec「Media Session → MV 開住」：一個「目標」record／mv；電視收埋轉返 record（T-060） */
describe('sessionTargets', () => {
    it('should be null without a Media Session', () => {
        const targets = createSessionTargets(null);
        expect(targets.record).toBeNull();
        expect(targets.mv).toBeNull();
        expect(() => targets.use('mv')).not.toThrow();
    });

    it('should let the record write to the lock screen until the MV takes over', () => {
        const { fake, targets, record, mv } = setup();
        targets.record?.setNowPlaying(RECORD);
        targets.record?.setState('playing');
        targets.mv?.setNowPlaying(MV);
        expect(fake.metadata?.title).toBe('Room 1');
        expect(fake.playbackState).toBe('playing');
        fake.trigger('play');
        expect(record.play).toHaveBeenCalledTimes(1);
        expect(mv.play).not.toHaveBeenCalled();
    });

    it('should show the MV and send the buttons to it while the TV is open', () => {
        const { fake, targets, record, mv } = setup();
        targets.record?.setNowPlaying(RECORD);
        targets.use('mv');
        targets.mv?.setNowPlaying(MV);
        targets.mv?.setState('playing');
        // 唱片停（pause 事件遲啲先到）唔可以蓋過電視
        targets.record?.setState('paused');
        expect(fake.metadata).toMatchObject({ title: 'Room 1（MV）', artist: 'RubberBand' });
        expect(fake.playbackState).toBe('playing');
        fake.trigger('pause');
        fake.trigger('seekto', { seekTime: 12 });
        expect(mv.pause).toHaveBeenCalledTimes(1);
        expect(mv.seekTo).toHaveBeenCalledExactlyOnceWith(12);
        expect(record.pause).not.toHaveBeenCalled();
        // MV 冇上一首／下一首
        expect(fake.handlers.get('previoustrack')).toBeNull();
        expect(fake.handlers.get('nexttrack')).toBeNull();
    });

    it('should give the lock screen back to the record when the TV is put away', () => {
        const { fake, targets, record } = setup();
        targets.record?.setNowPlaying(RECORD);
        targets.record?.setState('playing');
        targets.use('mv');
        targets.mv?.setNowPlaying(MV);
        targets.record?.setState('paused');
        targets.record?.setPosition(30, 200);
        targets.use('record');
        expect(fake.metadata?.title).toBe('Room 1');
        expect(fake.playbackState).toBe('paused');
        expect(fake.lastPosition).toEqual({ duration: 200, position: 30, playbackRate: 1 });
        fake.trigger('nexttrack');
        expect(record.next).toHaveBeenCalledTimes(1);
    });

    it('should not register the handlers again when the target does not change', () => {
        const { fake, targets } = setup();
        targets.use('record');
        expect(fake.registrations.get('play')).toBe(1);
    });
});
