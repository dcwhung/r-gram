import { fireEvent, render, screen } from '@testing-library/react';
import type { TvView } from '../../app/tvView';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { Tv } from './Tv';

const view = (overrides: Partial<TvView> = {}): TvView => ({
    phase: 'open',
    title: 'Room 1',
    accent: '#c8442b',
    glow: '#ff8a6a',
    active: 'play',
    progress: 0.25,
    timeText: '0:30',
    failed: false,
    video: document.createElement('video'),
    volume: 0.5,
    muted: false,
    volumeSupported: true,
    positionSec: 30,
    durationSec: 200,
    ...overrides,
});

const handlers = () => ({
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onStop: vi.fn(),
    onVolume: vi.fn(),
    onToggleMute: vi.fn(),
    onSeekBy: vi.fn(),
    onSeekTo: vi.fn(),
});

/** 旋鈕中心喺 (100, 100)，半徑 40 px */
const CENTRE = { x: 100, y: 100 };
const RADIUS_PX = 40;
const at = (deg: number, pointerId = 1) => ({
    clientX: CENTRE.x + RADIUS_PX * Math.cos((deg * Math.PI) / 180),
    clientY: CENTRE.y + RADIUS_PX * Math.sin((deg * Math.PI) / 180),
    pointerId,
});

const renderKnobs = (tv: TvView = view(), on = handlers()) => {
    const result = render(<Tv layout={PHONE_LAYOUT} tv={tv} handlers={on} />);
    ['tv-volume-hit', 'tv-seek-hit'].forEach((name) => {
        const hit = result.container.querySelector(`[data-part="${name}"]`) as Element;
        hit.getBoundingClientRect = () =>
            ({
                left: CENTRE.x - RADIUS_PX,
                top: CENTRE.y - RADIUS_PX,
                width: RADIUS_PX * 2,
                height: RADIUS_PX * 2,
            }) as DOMRect;
    });
    const volume = screen.getByRole('slider', { name: 'MV 音量' });
    const seek = screen.getByRole('slider', { name: '快轉或倒轉' });
    return { ...result, on, volume, seek };
};

const turn = (knob: Element, from: number, to: number) => {
    fireEvent.pointerDown(knob, at(from));
    fireEvent.pointerMove(knob, at((from + to) / 2));
    fireEvent.pointerMove(knob, at(to));
    fireEvent.pointerUp(knob, at(to));
};

/* T-061：電視兩粒大旋鈕（Functional Spec US-007：aria-label、鍵盤方向鍵；C9；D104） */
describe('Tv volume knob', () => {
    it('should be a slider that reads out the volume', () => {
        const { volume } = renderKnobs();
        expect(volume).toHaveAttribute('tabindex', '0');
        expect(volume).toHaveAttribute('aria-valuemin', '0');
        expect(volume).toHaveAttribute('aria-valuemax', '100');
        expect(volume).toHaveAttribute('aria-valuenow', '50');
        expect(volume).toHaveAttribute('aria-valuetext', '50%');
        expect(volume).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('should say when the MV is muted', () => {
        const { volume, container } = renderKnobs(view({ muted: true }));
        expect(volume).toHaveAttribute('aria-valuetext', '已靜音');
        expect(container.querySelector('[data-part="tv-volume-glyph"]')).toHaveAttribute(
            'data-muted',
            'true',
        );
    });

    it('should turn the volume with the arrow keys, Home and End', () => {
        const { volume, on } = renderKnobs();
        fireEvent.keyDown(volume, { key: 'ArrowUp' });
        fireEvent.keyDown(volume, { key: 'ArrowRight' });
        fireEvent.keyDown(volume, { key: 'ArrowDown' });
        fireEvent.keyDown(volume, { key: 'ArrowLeft' });
        fireEvent.keyDown(volume, { key: 'Home' });
        fireEvent.keyDown(volume, { key: 'End' });
        expect(on.onVolume.mock.calls.map(([level]) => level)).toEqual([
            0.55, 0.55, 0.45, 0.45, 0, 1,
        ]);
    });

    it('should mute and un-mute with Enter or Space', () => {
        const { volume, on } = renderKnobs();
        fireEvent.keyDown(volume, { key: 'Enter' });
        fireEvent.keyDown(volume, { key: ' ' });
        expect(on.onToggleMute).toHaveBeenCalledTimes(2);
    });

    it('should turn the volume up by dragging clockwise', () => {
        const { volume, on } = renderKnobs();
        turn(volume, -90, 0);
        expect(on.onVolume).toHaveBeenLastCalledWith(expect.closeTo(0.5 + 1 / 3, 3));
        expect(on.onToggleMute).not.toHaveBeenCalled();
    });

    it('should mute and un-mute with a tap on the knob', () => {
        const { volume, on } = renderKnobs();
        fireEvent.pointerDown(volume, at(-90));
        fireEvent.pointerUp(volume, at(-90));
        expect(on.onToggleMute).toHaveBeenCalledTimes(1);
        expect(on.onVolume).not.toHaveBeenCalled();
    });

    // D104：冇 Web Audio = 旋鈕停用（aria-disabled），MV 用系統音量
    it('should be disabled without Web Audio', () => {
        const { volume, on } = renderKnobs(view({ volumeSupported: false }));
        expect(volume).toHaveAttribute('aria-disabled', 'true');
        fireEvent.keyDown(volume, { key: 'ArrowUp' });
        fireEvent.keyDown(volume, { key: 'Enter' });
        turn(volume, -90, 0);
        expect(on.onVolume).not.toHaveBeenCalled();
        expect(on.onToggleMute).not.toHaveBeenCalled();
    });

    it('should point the grip at the volume', () => {
        const { container } = renderKnobs(view({ volume: 1 }));
        const grip = container.querySelector('[data-part="tv-volume"] [data-part="tv-dial-grip"]');
        expect(grip?.getAttribute('transform')).toContain('rotate(135)');
    });
});

describe('Tv seek knob', () => {
    it('should be a slider that reads out the time in the MV', () => {
        const { seek } = renderKnobs();
        expect(seek).toHaveAttribute('aria-valuemin', '0');
        expect(seek).toHaveAttribute('aria-valuemax', '200');
        expect(seek).toHaveAttribute('aria-valuenow', '30');
        expect(seek).toHaveAttribute('aria-valuetext', '0:30／3:20');
    });

    it('should fast-forward and rewind 10 seconds with the arrow keys', () => {
        const { seek, on } = renderKnobs();
        fireEvent.keyDown(seek, { key: 'ArrowRight' });
        fireEvent.keyDown(seek, { key: 'ArrowUp' });
        fireEvent.keyDown(seek, { key: 'ArrowLeft' });
        fireEvent.keyDown(seek, { key: 'ArrowDown' });
        expect(on.onSeekBy.mock.calls.map(([sec]) => sec)).toEqual([10, 10, -10, -10]);
    });

    // S-263：End 唔跳到最尾（播完 = 電視即刻收埋），跳到尾之前一格
    it('should go to the start with Home and one step before the end with End', () => {
        const { seek, on } = renderKnobs();
        fireEvent.keyDown(seek, { key: 'Home' });
        fireEvent.keyDown(seek, { key: 'End' });
        expect(on.onSeekTo.mock.calls.map(([sec]) => sec)).toEqual([0, 190]);
    });

    it('should not go before the start with End on a very short MV', () => {
        const { seek, on } = renderKnobs(view({ durationSec: 4 }));
        fireEvent.keyDown(seek, { key: 'End' });
        expect(on.onSeekTo).toHaveBeenCalledWith(0);
    });

    // 第二粒向右扭快轉、向左扭倒轉（§CR-002「MV 電視」）
    it('should fast-forward when turned right and rewind when turned left, a step every 30°', () => {
        const { seek, on } = renderKnobs();
        turn(seek, 0, 65);
        expect(on.onSeekBy.mock.calls.map(([sec]) => sec)).toEqual([10, 10]);
        on.onSeekBy.mockClear();
        turn(seek, 0, -35);
        expect(on.onSeekBy.mock.calls.map(([sec]) => sec)).toEqual([-10]);
    });

    it('should turn the grip as it is turned', () => {
        const { seek, container } = renderKnobs();
        const grip = () =>
            container.querySelector('[data-part="tv-seek"] [data-part="tv-dial-grip"]');
        const before = grip()?.getAttribute('transform');
        turn(seek, 0, 65);
        expect(grip()?.getAttribute('transform')).not.toBe(before);
    });

    it('should be disabled until the length of the MV is known', () => {
        const { seek, on } = renderKnobs(view({ durationSec: null }));
        expect(seek).toHaveAttribute('aria-disabled', 'true');
        fireEvent.keyDown(seek, { key: 'ArrowRight' });
        expect(on.onSeekBy).not.toHaveBeenCalled();
    });
});

describe('Tv knobs while switching off', () => {
    it('should lock both knobs', () => {
        const { volume, seek, on } = renderKnobs(view({ phase: 'closing', active: 'stop' }));
        expect(volume).toHaveAttribute('aria-disabled', 'true');
        expect(seek).toHaveAttribute('aria-disabled', 'true');
        fireEvent.keyDown(volume, { key: 'ArrowUp' });
        fireEvent.keyDown(seek, { key: 'ArrowRight' });
        expect(on.onVolume).not.toHaveBeenCalled();
        expect(on.onSeekBy).not.toHaveBeenCalled();
    });
});
