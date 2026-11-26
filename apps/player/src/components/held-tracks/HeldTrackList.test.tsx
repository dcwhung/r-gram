import { act, createEvent, fireEvent, render, screen } from '@testing-library/react';
import type { HeldTrackRow, TrackColumnView } from '../../app/heldTracksView';
import { MOTION } from '../../config/motion';
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

const held = (rows: readonly HeldTrackRow[], overrides: Partial<TrackColumnView> = {}) => ({
    albumId: 'room',
    accent: ACCENT,
    rows,
    emptyText: '尚未有歌曲',
    dialOpen: false,
    ...overrides,
});

const LONG = Array.from({ length: 30 }, (_, index) => row(index + 1));
const name = (no: number) => `第 ${no} 首：歌 ${no}`;

const renderList = (view: TrackColumnView, measure: TextMeasure = estimateTextWidth) => {
    const result = render(
        <svg>
            <HeldTrackList layout={PHONE_LAYOUT} held={view} albumTitle="ROOM" measure={measure} />
        </svg>,
    );
    const list = () => screen.getByRole('list', { name: 'ROOM 的歌曲' });
    /** 行喺畫面上嘅中線：行嘅 y（未捲）+ 成欄捲動嘅 translate */
    const rowY = (label: string) => {
        const title = screen
            .getByRole('listitem', { name: label })
            .querySelector('[data-part="held-title"]');
        const shift = title?.closest('[data-part="held-scroll"]')?.getAttribute('transform') ?? '';
        const [, dy = '0'] = /translate\(0 (-?[\d.]+)\)/.exec(shift) ?? [];
        return Number(title?.getAttribute('y')) + Number(dy);
    };
    const room = () =>
        Number(
            result.container.querySelector('[data-part="held-clip"] rect')?.getAttribute('height'),
        );
    return { ...result, list, rowY, room };
};

/*
 * 歌單欄（設計稿第 19 版 trackPanel()；backlog B-086 ①）：純睇。行唔係掣、唔入 Tab 次序、㩒落冇反應；
 * 只可以捲（拖動、滾輪、欄本身攞到 focus 時用鍵盤）
 */
describe('HeldTrackList', () => {
    it('should list the rows as plain list items named by number and title', () => {
        const { list, container } = renderList(held([row(1), row(2)]));
        expect(list()).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
        expect(screen.getByRole('listitem', { name: name(1) })).toBeInTheDocument();
        expect(screen.queryByRole('button')).toBeNull();
        expect(container.querySelector('[tabindex]')).toBeNull();
        expect(container.querySelector('.pressable')).toBeNull();
    });

    it('should place the rows at the mockup positions with the number in the album colour', () => {
        const { container, rowY } = renderList(held([row(1), row(2)]));
        expect(rowY(name(2))).toBe(top + pitch * 1.5);
        const number = container.querySelector('[data-part="held-number"]');
        expect(number).toHaveAttribute('fill', ACCENT);
        expect(number).toHaveTextContent('01');
        expect(number).toHaveAttribute('x', '74');
        expect(container.querySelector('[data-part="held-title"]')).toHaveAttribute('x', '130');
    });

    // B-086 ①：㩒落歌單欄嘅位唔算㩒碟面：每行有一條透明範圍由畫面左邊起蓋住下面嘅碟面
    it('should cover each row from the left edge of the screen so a tap stays on the column', () => {
        const { container } = renderList(held([row(1)]));
        const hit = container.querySelector('[data-part="held-hit"]');
        expect(hit).toHaveAttribute('x', '0');
        const { right, rowReach } = PHONE_LAYOUT.heldTracks;
        expect(hit).toHaveAttribute('width', String(right + rowReach));
    });

    // D11、D70：冇音檔 = 灰色
    it('should grey out a track without audio', () => {
        const { container } = renderList(held([row(1, false), row(2)]));
        const grey = screen.getByRole('listitem', { name: '第 1 首：歌 1（未有音檔）' });
        expect(grey).toHaveAttribute('data-playable', 'false');
        expect(container.querySelector('[data-part="held-number"]')).not.toHaveAttribute(
            'fill',
            ACCENT,
        );
    });

    it('should end a title that does not fit with an ellipsis', () => {
        const title = '一首非常非常非常非常非常非常長的歌名不會放得下';
        const { container } = renderList(held([row(1, true, title)]));
        const shown = container.querySelector('[data-part="held-title"]')?.textContent ?? '';
        expect(shown.endsWith('…')).toBe(true);
        expect(shown.length).toBeLessThan(title.length);
        // 讀屏照讀全名
        expect(screen.getByRole('listitem', { name: `第 1 首：${title}` })).toBeInTheDocument();
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
        expect(rowY(name(1))).toBe(top + pitch * 0.5 - pitch);
        expect(list()).toHaveAttribute('data-fade-top', 'true');
    });

    // S-177：欄食咗滾輪（頁面唔捲、唔回彈）
    it('should keep the wheel from scrolling the page', () => {
        const { list } = renderList(held(LONG));
        const wheel = createEvent.wheel(list(), { deltaY: pitch });
        fireEvent(list(), wheel);
        expect(wheel.defaultPrevented).toBe(true);
    });

    // S-198：Ctrl + 滾輪 / 觸控板 pinch 係縮放：留畀瀏覽器，欄唔捲
    it('should leave a pinch-zoom wheel to the browser', () => {
        const { list, rowY } = renderList(held(LONG));
        const wheel = createEvent.wheel(list(), { deltaY: pitch, ctrlKey: true });
        fireEvent(list(), wheel);
        expect(wheel.defaultPrevented).toBe(false);
        expect(rowY(name(1))).toBe(top + pitch * 0.5);
    });

    // 短歌單冇嘢捲：欄唔入 Tab 次序；長歌單：欄本身（有名嘅捲動範圍）先入 Tab 次序
    it('should only put a column that can scroll in the Tab order', () => {
        const short = renderList(held([row(1), row(2)]));
        expect(short.list()).not.toHaveAttribute('tabindex');
        short.unmount();
        expect(renderList(held(LONG)).list()).toHaveAttribute('tabindex', '0');
    });

    // S-179：欄本身 focus 得（長歌單）先有外框，同行嘅範圍一樣闊、同欄一樣高；淨係畫面
    it('should have a focus frame around a column that can take the focus', () => {
        const long = renderList(held(LONG));
        const frame = long.container.querySelector('[data-part="held-frame"]');
        const { right, rowReach } = PHONE_LAYOUT.heldTracks;
        expect(frame).toHaveAttribute('x', '0');
        expect(frame).toHaveAttribute('y', String(top));
        expect(frame).toHaveAttribute('width', String(right + rowReach));
        expect(frame).toHaveAttribute('height', String(long.room()));
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
        expect(rowY(name(1))).toBe(top - pitch * 0.5);
        fireEvent.wheel(list(), { deltaY: -1, deltaMode: 2 });
        expect(rowY(name(1))).toBe(top + pitch * 0.5);
    });

    it('should page through the list with Page Down and Page Up', () => {
        const { list, rowY, room } = renderList(held(LONG));
        const most = LONG.length * pitch - room();
        fireEvent.keyDown(list(), { key: 'PageDown' });
        expect(rowY(name(1))).toBe(top + pitch * 0.5 - Math.min(room() - pitch, most));
        fireEvent.keyDown(list(), { key: 'PageUp' });
        fireEvent.keyDown(list(), { key: 'ArrowUp' });
        fireEvent.keyDown(list(), { key: 'a' });
        expect(rowY(name(1))).toBe(top + pitch * 0.5);
    });

    it('should scroll by keyboard and stop at both ends', () => {
        const { list, rowY } = renderList(held(LONG));
        fireEvent.keyDown(list(), { key: 'ArrowDown' });
        expect(rowY(name(1))).toBe(top - pitch * 0.5);
        fireEvent.keyDown(list(), { key: 'End' });
        expect(list()).toHaveAttribute('data-fade-bottom', 'false');
        fireEvent.keyDown(list(), { key: 'Home' });
        expect(rowY(name(1))).toBe(top + pitch * 0.5);
    });

    // W-043：歌名只喺行、量字函數、闊度變先截短；捲動（滾輪、拖動）唔再量字
    it('should not measure any title again when the column scrolls', () => {
        const longTitle = '(Just Like) Starting Over (Live Version) Extended';
        const rows = Array.from({ length: 41 }, (_, index) =>
            row(index + 1, true, index % 2 === 0 ? longTitle : `歌 ${index + 1}`),
        );
        const measure = vi.fn(estimateTextWidth);
        const { list } = renderList(held(rows), measure);
        const before = measure.mock.calls.length;
        expect(before).toBeGreaterThan(0);
        fireEvent.wheel(list(), { deltaY: pitch });
        fireEvent.keyDown(list(), { key: 'PageDown' });
        expect(measure.mock.calls.length - before).toBe(0);
    });

    it('should scroll by dragging a row', () => {
        const { rowY } = renderList(held(LONG));
        const item = screen.getByRole('listitem', { name: name(3) });
        const startY = 600;
        fireEvent.pointerDown(item, { pointerId: 1, clientY: startY });
        fireEvent.pointerMove(item, { pointerId: 1, clientY: startY - pitch * UNIT });
        fireEvent.pointerUp(item, { pointerId: 1, clientY: startY - pitch * UNIT });
        expect(rowY(name(3))).toBe(top + pitch * 1.5);
    });

    // W-050：第二隻手指唔好取消第一隻手指嘅拖動
    it('should keep following the first finger when a second finger touches', () => {
        const { rowY } = renderList(held(LONG));
        const item = screen.getByRole('listitem', { name: name(3) });
        fireEvent.pointerDown(item, { pointerId: 1, clientY: 600 });
        fireEvent.pointerMove(item, { pointerId: 1, clientY: 600 - pitch * UNIT });
        fireEvent.pointerDown(item, { pointerId: 2, clientY: 300 });
        fireEvent.pointerUp(item, { pointerId: 2, clientY: 300 });
        fireEvent.pointerMove(item, { pointerId: 1, clientY: 600 - pitch * 2 * UNIT });
        fireEvent.pointerUp(item, { pointerId: 1, clientY: 600 - pitch * 2 * UNIT });
        expect(rowY(name(3))).toBe(top + pitch * 0.5);
    });

    it('should not scroll on a small wobble', () => {
        const { rowY } = renderList(held(LONG));
        const item = screen.getByRole('listitem', { name: name(3) });
        fireEvent.pointerDown(item, { pointerId: 1, clientY: 600 });
        fireEvent.pointerMove(item, { pointerId: 1, clientY: 600 - (dragThresholdPx - 1) });
        fireEvent.pointerUp(item, { pointerId: 1, clientY: 600 });
        expect(rowY(name(3))).toBe(top + pitch * 2.5);
    });

    it('should make the column reach the knob while the dial is open', () => {
        const open = renderList(held(LONG, { dialOpen: true }));
        expect(open.room()).toBe(PHONE_LAYOUT.heldTracks.bottomOpen - top);
    });
});

/*
 * 設計稿第 19 版 PANEL_FLOAT（B-086 ④⑤）：字母盤開住時歌單欄出現 = 每行由右上逐行飄落（CSS 動畫，delay 由
 * 元件計）；捲動唔會再播。鬆手 = 欄底縮短，讓出嚟嗰幾行原地淡出（減少動態效果時冇）
 */
describe('HeldTrackList motion', () => {
    const delays = (container: HTMLElement) =>
        [...container.querySelectorAll<SVGGElement>('.held-row-in')].map((row) =>
            row.style.getPropertyValue('--enter-delay'),
        );
    const listOf = (view: TrackColumnView) => (
        <svg>
            <HeldTrackList
                layout={PHONE_LAYOUT}
                held={view}
                albumTitle="ROOM"
                measure={estimateTextWidth}
            />
        </svg>
    );
    afterEach(() => vi.unstubAllGlobals());

    it('should float each row in, top first, when the column appears with the dial open', () => {
        const { container } = render(listOf(held([row(1), row(2), row(3)], { dialOpen: true })));
        expect(delays(container)).toEqual(['0ms', '60ms', '120ms']);
        const column = container.querySelector<SVGGElement>('[data-part="held-tracks"]');
        expect(column?.style.getPropertyValue('--enter-dx')).toBe('170px');
        expect(column?.style.getPropertyValue('--enter-dy')).toBe('-62px');
    });

    it('should not float the rows in when the column appears with the dial closed', () => {
        const { container } = render(listOf(held([row(1), row(2)])));
        expect(delays(container)).toEqual([]);
    });

    it('should keep the same entrance when the column scrolls', () => {
        const { container } = render(listOf(held(LONG, { dialOpen: true })));
        const before = delays(container);
        fireEvent.wheel(screen.getByRole('list'), { deltaY: pitch * 3 });
        expect(delays(container)).toEqual(before);
        expect(before.length).toBeLessThan(LONG.length);
    });

    it('should fade out the rows given up when the dial is released', () => {
        vi.useFakeTimers();
        const { container, rerender } = render(listOf(held(LONG, { dialOpen: true })));
        rerender(listOf(held(LONG)));
        const ghosts = container.querySelector('[data-part="held-ghosts"]');
        expect(ghosts).not.toBeNull();
        expect(ghosts).toHaveAttribute('aria-hidden', 'true');
        const { bottomIdle, bottomOpen, fade } = PHONE_LAYOUT.heldTracks;
        const ys = [...(ghosts?.querySelectorAll('[data-part="held-title"]') ?? [])].map((text) =>
            Number(text.getAttribute('y')),
        );
        expect(ys.length).toBeGreaterThan(0);
        expect(ys.every((y) => y > bottomIdle - fade && y <= bottomOpen)).toBe(true);
        act(() => vi.advanceTimersByTime(MOTION.scene.chromeFadeMs));
        expect(container.querySelector('[data-part="held-ghosts"]')).toBeNull();
        vi.useRealTimers();
    });

    it('should not fade anything out on release when motion is reduced', () => {
        vi.stubGlobal(
            'matchMedia',
            vi.fn(() => ({ matches: true })),
        );
        const { container, rerender } = render(listOf(held(LONG, { dialOpen: true })));
        rerender(listOf(held(LONG)));
        expect(container.querySelector('[data-part="held-ghosts"]')).toBeNull();
    });
});
