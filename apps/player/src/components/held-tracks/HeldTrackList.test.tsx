import { act, createEvent, fireEvent, render, screen } from '@testing-library/react';
import type { HeldTrackRow, HeldTracksView } from '../../app/heldTracksView';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { estimateTextWidth, type TextMeasure } from '../../utils/textMeasure';
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

const renderList = (
    view: HeldTracksView,
    onPlay = vi.fn(),
    measure: TextMeasure = estimateTextWidth,
) => {
    const result = render(
        <svg>
            <HeldTrackList
                layout={PHONE_LAYOUT}
                held={view}
                albumTitle="ROOM"
                measure={measure}
                onPlay={onPlay}
            />
        </svg>,
    );
    const list = () => screen.getByRole('list', { name: 'ROOM 的歌曲' });
    /** 行喺畫面上嘅中線：行嘅 y（未捲）+ 成欄捲動嘅 translate */
    const rowY = (name: string) => {
        const title = screen
            .getByRole('button', { name })
            .querySelector('[data-part="held-title"]');
        const shift = title?.closest('[data-part="held-scroll"]')?.getAttribute('transform') ?? '';
        const [, dy = '0'] = /translate\(0 (-?[\d.]+)\)/.exec(shift) ?? [];
        return Number(title?.getAttribute('y')) + Number(dy);
    };
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

    // W-044：D57「由畫面左邊起成行都㩒得」：感應範圍由 x 0 起，去到 right + rowReach
    it('should make the whole row pressable from the left edge of the screen', () => {
        const { container } = renderList(held([row(1)]));
        const hit = container.querySelector('[data-part="held-hit"]');
        expect(hit).toHaveAttribute('x', '0');
        const { right, rowReach } = PHONE_LAYOUT.heldTracks;
        expect(hit).toHaveAttribute('width', String(right + rowReach));
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

    // S-177：欄食咗滾輪（頁面唔捲、唔回彈）；短歌單冇嘢捲，欄唔入 Tab 次序
    it('should keep the wheel from scrolling the page', () => {
        const { list } = renderList(held(LONG));
        const wheel = createEvent.wheel(list(), { deltaY: pitch });
        fireEvent(list(), wheel);
        expect(wheel.defaultPrevented).toBe(true);
    });

    it('should only put a column that can scroll in the Tab order', () => {
        const short = renderList(held([row(1), row(2)]));
        expect(short.list()).not.toHaveAttribute('tabindex');
        short.unmount();
        expect(renderList(held(LONG)).list()).toHaveAttribute('tabindex', '0');
    });

    // S-179：欄本身 focus 得（長歌單）先有外框，同行嘅感應範圍一樣闊、同欄一樣高；淨係畫面
    it('should have a focus frame around a column that can take the focus', () => {
        const long = renderList(held(LONG));
        const frame = long.container.querySelector('[data-part="held-frame"]');
        const { right, rowReach, bottomHeld } = PHONE_LAYOUT.heldTracks;
        expect(frame).toHaveAttribute('x', '0');
        expect(frame).toHaveAttribute('y', String(top));
        expect(frame).toHaveAttribute('width', String(right + rowReach));
        expect(frame).toHaveAttribute('height', String(bottomHeld - top));
        expect(frame).toHaveAttribute('fill', 'none');
        expect(frame).toHaveAttribute('aria-hidden', 'true');
        long.unmount();
        const short = renderList(held([row(1)]));
        expect(short.container.querySelector('[data-part="held-frame"]')).toBeNull();
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

    /*
     * W-042：focus 喺行時，方向鍵、Page Up／Down、Home／End 移 focus 去另一行（跳過灰色行），
     * 嗰行捲入欄；focus 喺欄本身先純捲（上面幾個測試）
     */
    describe('keyboard on a focused row', () => {
        const MANY = Array.from({ length: 41 }, (_, index) => row(index + 1));
        const bottom = PHONE_LAYOUT.heldTracks.bottomHeld;
        const name = (no: number) => `播放第 ${no} 首：歌 ${no}`;
        const focused = () => document.activeElement;
        const expectFocusedVisible = (no: number, rowY: (name: string) => number) => {
            expect(focused()).toBe(screen.getByRole('button', { name: name(no) }));
            const centre = rowY(name(no));
            expect(centre - pitch / 2).toBeGreaterThanOrEqual(top);
            expect(centre + pitch / 2).toBeLessThanOrEqual(bottom);
        };
        const press = (key: string) => {
            const target = focused();
            if (target) fireEvent.keyDown(target, { key });
        };

        it('should move the focus down a row with ArrowDown and to the last row with End', () => {
            const { rowY } = renderList(held(MANY));
            act(() => screen.getByRole('button', { name: name(1) }).focus());
            ['ArrowDown', 'ArrowDown', 'ArrowDown'].forEach(press);
            expectFocusedVisible(4, rowY);
            press('End');
            expectFocusedVisible(41, rowY);
            press('ArrowUp');
            expectFocusedVisible(40, rowY);
            press('Home');
            expectFocusedVisible(1, rowY);
        });

        it('should move the focus a page away with Page Down and Page Up', () => {
            const { rowY } = renderList(held(MANY));
            const room = bottom - top;
            const perPage = Math.floor((room - pitch) / pitch);
            act(() => screen.getByRole('button', { name: name(1) }).focus());
            press('PageDown');
            expectFocusedVisible(1 + perPage, rowY);
            press('PageDown');
            press('PageUp');
            expectFocusedVisible(1 + perPage, rowY);
            press('PageUp');
            expectFocusedVisible(1, rowY);
        });

        it('should skip grey rows and stay on the last row at the end', () => {
            const rows = [row(1), row(2, false), row(3), row(4, false)];
            renderList(held(rows));
            act(() => screen.getByRole('button', { name: name(1) }).focus());
            press('ArrowDown');
            expect(focused()).toBe(screen.getByRole('button', { name: name(3) }));
            press('ArrowDown');
            press('End');
            expect(focused()).toBe(screen.getByRole('button', { name: name(3) }));
            press('ArrowUp');
            expect(focused()).toBe(screen.getByRole('button', { name: name(1) }));
        });
    });

    // W-043：歌名只喺行、量字函數、闊度變先截短；捲動（滾輪、拖動）唔再量字
    it('should not measure any title again when the column scrolls', () => {
        const longTitle = '(Just Like) Starting Over (Live Version) Extended';
        const rows = Array.from({ length: 41 }, (_, index) =>
            row(index + 1, true, index % 2 === 0 ? longTitle : `歌 ${index + 1}`),
        );
        const measure = vi.fn(estimateTextWidth);
        const { list } = renderList(held(rows), vi.fn(), measure);
        const before = measure.mock.calls.length;
        expect(before).toBeGreaterThan(0);
        fireEvent.wheel(list(), { deltaY: pitch });
        fireEvent.keyDown(list(), { key: 'PageDown' });
        expect(measure.mock.calls.length - before).toBe(0);
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
