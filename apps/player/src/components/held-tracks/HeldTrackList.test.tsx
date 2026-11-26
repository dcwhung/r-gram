import { act, fireEvent, render, screen } from '@testing-library/react';
import type { HeldTrackRow, HeldTracksView } from '../../app/heldTracksView';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { estimateTextWidth } from '../../utils/textMeasure';
import { HeldTrackList } from './HeldTrackList';

const ACCENT = '#c8442b';
const { top, pitch, dragThresholdPx } = PHONE_LAYOUT.heldTracks;
/** 測試冇 <Stage>：1 設計單位 = 1 px */
const UNIT = 1;

const row = (no: number, playable = true, title = `歌 ${no}`): HeldTrackRow => ({
    id: `room-${String(no).padStart(2, '0')}`,
    no,
    number: String(no).padStart(2, '0'),
    title,
    playable,
});

const held = (rows: readonly HeldTrackRow[], overrides: Partial<HeldTracksView> = {}) => ({
    albumId: 'room',
    accent: ACCENT,
    rows,
    emptyText: '尚未有歌曲',
    dialOpen: false,
    pressable: true,
    ...overrides,
});

const LONG = Array.from({ length: 30 }, (_, index) => row(index + 1));

const renderList = (view: HeldTracksView, onPlay = vi.fn()) => {
    const result = render(
        <svg>
            <HeldTrackList
                layout={PHONE_LAYOUT}
                held={view}
                albumTitle="ROOM"
                measure={estimateTextWidth}
                onPlay={onPlay}
            />
        </svg>,
    );
    const list = () => screen.getByRole('list', { name: 'ROOM 的歌曲' });
    const rowY = (name: string) =>
        Number(
            screen
                .getByRole('button', { name })
                .querySelector('[data-part="held-title"]')
                ?.getAttribute('y'),
        );
    return { ...result, onPlay, list, rowY };
};

/* T-049：拎住嘅碟嘅歌單欄（Functional Spec FR-044、D57；設計稿第 18 版 trackPanel()） */
describe('HeldTrackList', () => {
    it('should list the rows under the album title as buttons named by number and title', () => {
        const { list } = renderList(held([row(1), row(2)]));
        expect(list()).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
        expect(screen.getByRole('button', { name: '播放第 1 首：歌 1' })).toHaveAttribute(
            'tabindex',
            '0',
        );
    });

    it('should place the rows at the mockup positions with the number in the album colour', () => {
        const { container, rowY } = renderList(held([row(1), row(2)]));
        expect(rowY('播放第 2 首：歌 2')).toBe(top + pitch * 1.5);
        const number = container.querySelector('[data-part="held-number"]');
        expect(number).toHaveAttribute('fill', ACCENT);
        expect(number).toHaveTextContent('01');
        expect(number).toHaveAttribute('x', '74');
        expect(container.querySelector('[data-part="held-title"]')).toHaveAttribute('x', '130');
    });

    it('should play the pressed row by click or by keyboard', () => {
        const { onPlay } = renderList(held([row(1), row(2)]));
        fireEvent.click(screen.getByRole('button', { name: '播放第 2 首：歌 2' }));
        fireEvent.keyDown(screen.getByRole('button', { name: '播放第 1 首：歌 1' }), {
            key: 'Enter',
        });
        expect(onPlay.mock.calls).toEqual([['room-02'], ['room-01']]);
    });

    // D11、D70：冇音檔 = 灰色、唔係掣
    it('should grey out a track without audio and not let it be pressed', () => {
        const { container, onPlay } = renderList(held([row(1, false), row(2)]));
        expect(screen.getAllByRole('button')).toHaveLength(1);
        const grey = screen.getByRole('listitem', { name: '第 1 首：歌 1（未有音檔）' });
        expect(grey).toHaveAttribute('data-playable', 'false');
        expect(container.querySelector('[data-part="held-number"]')).not.toHaveAttribute(
            'fill',
            ACCENT,
        );
        fireEvent.click(grey);
        expect(onPlay).not.toHaveBeenCalled();
    });

    it('should not let rows be pressed while the dial is open', () => {
        const { onPlay } = renderList(held([row(1)], { dialOpen: true, pressable: false }));
        const button = screen.getByRole('button', { name: '播放第 1 首：歌 1' });
        expect(button).toHaveAttribute('aria-disabled', 'true');
        expect(button).toHaveAttribute('tabindex', '-1');
        fireEvent.click(button);
        expect(onPlay).not.toHaveBeenCalled();
    });

    it('should end a title that does not fit with an ellipsis', () => {
        const title = '一首非常非常非常非常非常非常長的歌名不會放得下';
        const { container } = renderList(held([row(1, true, title)]));
        const shown = container.querySelector('[data-part="held-title"]')?.textContent ?? '';
        expect(shown.endsWith('…')).toBe(true);
        expect(shown.length).toBeLessThan(title.length);
        // 讀屏照讀全名
        expect(screen.getByRole('button', { name: `播放第 1 首：${title}` })).toBeInTheDocument();
    });

    it('should show the empty text of a disc without tracks', () => {
        const { container } = renderList(held([], { emptyText: '尚未收藏歌曲' }));
        expect(container.querySelector('[data-part="held-empty"]')).toHaveTextContent(
            '尚未收藏歌曲',
        );
        expect(screen.queryByRole('listitem')).toBeNull();
    });

    it('should fade nothing and show no position bar when every row fits', () => {
        const { list, container } = renderList(held([row(1), row(2)]));
        expect(list()).toHaveAttribute('data-fade-top', 'false');
        expect(list()).toHaveAttribute('data-fade-bottom', 'false');
        expect(container.querySelector('[data-part="held-bar"]')).toBeNull();
    });

    it('should show the position bar on the left and fade the bottom of a long list', () => {
        const { list, container } = renderList(held(LONG));
        expect(list()).toHaveAttribute('data-fade-top', 'false');
        expect(list()).toHaveAttribute('data-fade-bottom', 'true');
        const thumb = container.querySelector('[data-part="held-bar-thumb"]');
        expect(thumb).toHaveAttribute('x', '44');
        expect(thumb).toHaveAttribute('y', String(top));
        expect(thumb).toHaveAttribute('fill', ACCENT);
    });

    it('should scroll with the mouse wheel and fade the top once scrolled', () => {
        const { list, rowY } = renderList(held(LONG));
        fireEvent.wheel(list(), { deltaY: pitch });
        expect(rowY('播放第 1 首：歌 1')).toBe(top + pitch * 0.5 - pitch);
        expect(list()).toHaveAttribute('data-fade-top', 'true');
    });

    // 滑鼠滾輪可以用「行」或者「版」做單位（WheelEvent.deltaMode）
    it('should scroll a row per wheel line and a column per wheel page', () => {
        const { list, rowY } = renderList(held(LONG));
        fireEvent.wheel(list(), { deltaY: 1, deltaMode: 1 });
        expect(rowY('播放第 1 首：歌 1')).toBe(top - pitch * 0.5);
        fireEvent.wheel(list(), { deltaY: -1, deltaMode: 2 });
        expect(rowY('播放第 1 首：歌 1')).toBe(top + pitch * 0.5);
    });

    it('should page through the list with Page Down and Page Up', () => {
        const { list, rowY } = renderList(held(LONG));
        const room = PHONE_LAYOUT.heldTracks.bottomHeld - top;
        const most = LONG.length * pitch - room;
        fireEvent.keyDown(list(), { key: 'PageDown' });
        expect(rowY('播放第 1 首：歌 1')).toBe(top + pitch * 0.5 - Math.min(room - pitch, most));
        fireEvent.keyDown(list(), { key: 'PageUp' });
        fireEvent.keyDown(list(), { key: 'ArrowUp' });
        fireEvent.keyDown(list(), { key: 'a' });
        expect(rowY('播放第 1 首：歌 1')).toBe(top + pitch * 0.5);
    });

    it('should scroll by keyboard and stop at both ends', () => {
        const { list, rowY } = renderList(held(LONG));
        fireEvent.keyDown(list(), { key: 'ArrowDown' });
        expect(rowY('播放第 1 首：歌 1')).toBe(top - pitch * 0.5);
        fireEvent.keyDown(list(), { key: 'End' });
        expect(list()).toHaveAttribute('data-fade-bottom', 'false');
        fireEvent.keyDown(list(), { key: 'Home' });
        expect(rowY('播放第 1 首：歌 1')).toBe(top + pitch * 0.5);
    });

    it('should scroll a row into view when it gets the focus', () => {
        const { rowY } = renderList(held(LONG));
        const last = screen.getByRole('button', { name: '播放第 30 首：歌 30' });
        act(() => last.focus());
        const bottom = PHONE_LAYOUT.heldTracks.bottomHeld;
        expect(rowY('播放第 30 首：歌 30')).toBe(bottom - pitch * 0.5);
    });

    // D57：拖過唔當㩒
    it('should scroll by dragging and not play the row the drag ended on', () => {
        const { onPlay, rowY } = renderList(held(LONG));
        const button = screen.getByRole('button', { name: '播放第 3 首：歌 3' });
        const startY = 600;
        fireEvent.pointerDown(button, { pointerId: 1, clientY: startY });
        fireEvent.pointerMove(button, { pointerId: 1, clientY: startY - pitch * UNIT });
        fireEvent.pointerUp(button, { pointerId: 1, clientY: startY - pitch * UNIT });
        fireEvent.click(button);
        expect(onPlay).not.toHaveBeenCalled();
        expect(rowY('播放第 3 首：歌 3')).toBe(top + pitch * 1.5);
        fireEvent.click(button);
        expect(onPlay).toHaveBeenCalledWith('room-03');
    });

    it('should treat a small wobble as a tap', () => {
        const { onPlay } = renderList(held(LONG));
        const button = screen.getByRole('button', { name: '播放第 3 首：歌 3' });
        fireEvent.pointerDown(button, { pointerId: 1, clientY: 600 });
        fireEvent.pointerMove(button, { pointerId: 1, clientY: 600 - (dragThresholdPx - 1) });
        fireEvent.pointerUp(button, { pointerId: 1, clientY: 600 });
        fireEvent.click(button);
        expect(onPlay).toHaveBeenCalledWith('room-03');
    });

    it('should make the column shorter while the dial is open', () => {
        const open = renderList(held(LONG, { dialOpen: true, pressable: false }));
        const clip = (container: HTMLElement) =>
            Number(container.querySelector('[data-part="held-clip"] rect')?.getAttribute('height'));
        expect(clip(open.container)).toBe(PHONE_LAYOUT.heldTracks.bottomOpen - top);
        open.unmount();
        const released = renderList(held(LONG));
        expect(clip(released.container)).toBe(PHONE_LAYOUT.heldTracks.bottomHeld - top);
    });
});
