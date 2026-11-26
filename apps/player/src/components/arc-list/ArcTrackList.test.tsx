import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import type { TrackRow } from '../../app/heldTracksView';
import type { ArcListView } from '../../app/listView';
import { arcRowPitch, arcRowSpec } from '../../stage/arcRows';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { estimateTextWidth, type TextMeasure } from '../../utils/textMeasure';
import { ArcTrackList } from './ArcTrackList';

const ACCENT = '#2f8f57';
/** 測試冇 <Stage>：1 設計單位 = 1 px */
const PITCH = arcRowPitch(arcRowSpec(PHONE_LAYOUT));
const { dragThresholdPx } = PHONE_LAYOUT.list;

const row = (no: number, playable = true, title = `歌 ${no}`): TrackRow => ({
    id: `komorebi-${String(no).padStart(2, '0')}`,
    no,
    number: String(no).padStart(2, '0'),
    title,
    playable,
});

const view = (rows: readonly TrackRow[], focusIndex = 0, fromColumn = false): ArcListView => ({
    albumId: 'komorebi',
    accent: ACCENT,
    rows,
    focusIndex,
    emptyText: '尚未有歌曲',
    fromColumn,
});

/** 30 首、歌號跳號（每 7 首冇一個號）：同真資料一樣 */
const LONG = Array.from({ length: 30 }, (_, index) => row(index + 1 + Math.floor(index / 7)));

const renderList = (
    list: ArcListView,
    measure: TextMeasure = estimateTextWidth,
    floating = false,
) => {
    const handlers = { onClose: vi.fn(), onFocusTrack: vi.fn(), onPlay: vi.fn() };
    const result = render(
        <svg>
            <ArcTrackList
                layout={PHONE_LAYOUT}
                list={list}
                albumTitle="KOMOREBI"
                measure={measure}
                floating={floating}
                {...handlers}
            />
        </svg>,
    );
    const listbox = () => screen.getByRole('listbox', { name: 'KOMOREBI 的歌曲' });
    const option = (name: string) => screen.getByRole('option', { name });
    const part = (element: Element, name: string) =>
        element.querySelector<SVGElement>(`[data-part="${name}"]`);
    const selected = () => screen.getByRole('option', { selected: true });
    return { ...result, ...handlers, listbox, option, part, selected };
};

/* T-037：弧線歌單（設計稿第 18 版「歌單（㩒碟面）」listLayer()；Functional Spec US-004、D23、D25、D39、D60） */
describe('ArcTrackList', () => {
    it('should be a listbox named after the album, with the focused row selected', () => {
        const { listbox, selected } = renderList(view([row(1), row(2), row(3)], 1));
        expect(listbox()).toHaveAttribute('tabindex', '0');
        expect(selected()).toHaveAccessibleName('第 2 首：歌 2');
        expect(listbox()).toHaveAttribute('aria-activedescendant', selected().id);
        expect(screen.getAllByRole('option')).toHaveLength(3);
    });

    it('should place the rows on the arc of the mockup, the focused one in the frame', () => {
        const { option, part } = renderList(view([row(1), row(2), row(3)], 0));
        const focused = part(option('第 1 首：歌 1'), 'arc-number');
        expect(focused).toHaveAttribute('x', '384');
        expect(focused).toHaveAttribute('y', '1196');
        expect(focused).toHaveAttribute('fill', ACCENT);
        expect(focused).toHaveAttribute('font-size', '30.2');
        const title = part(option('第 1 首：歌 1'), 'arc-title');
        expect(title).toHaveAttribute('font-size', '42');
        // 歌名 x = 歌號 x + 歌號字級 × 1.25 + 18（設計稿 listLayer()）
        expect(title).toHaveAttribute('x', '439.8');
        const next = part(option('第 2 首：歌 2'), 'arc-number');
        expect(next).toHaveAttribute('x', '391.2');
        expect(next).toHaveAttribute('y', '1284.9');
        expect(option('第 2 首：歌 2')).toHaveAttribute('opacity', '0.4168');
    });

    // 設計稿 focusFrame()：框由碟芯膠圈邊（940 − 700 × 0.16 = 828）伸到弧線左邊 6 之外，左邊圓頭
    it('should draw the white frame from the clamp to the left of the arc', () => {
        const { container } = renderList(view([row(1)]));
        const frame = container.querySelector('[data-part="arc-frame"]');
        expect(frame?.parentElement).toHaveAttribute('transform', 'translate(828 1196)');
        expect(frame).toHaveAttribute('d', 'M0 -44H-450a44 44 0 0 0 0 88H0');
        expect(frame).toHaveAttribute('vector-effect', 'non-scaling-stroke');
    });

    // CR-006 D60：歌號照 track.no（可以跳號）
    it('should show the real track numbers, skipping where the album skips', () => {
        const { container } = renderList(view(LONG, 15));
        const numbers = [...container.querySelectorAll('[data-part="arc-number"]')].map(
            (node) => node.textContent,
        );
        expect(numbers).toEqual(['13', '14', '15', '17', '18', '19', '20', '21', '22']);
        expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-setsize', '30');
    });

    // D23：歌名約 8 個中文字，再長用「…」；讀屏讀全名
    it('should cut a long title with an ellipsis and keep the full title in its name', () => {
        const long = '戀人日常（的直線抽擊）再加長啲';
        const { option, part } = renderList(view([row(1, true, long)]));
        const title = part(option(`第 1 首：${long}`), 'arc-title');
        expect(title?.textContent?.endsWith('…')).toBe(true);
        expect(title?.textContent?.length).toBeLessThanOrEqual(PHONE_LAYOUT.list.titleChars + 1);
    });

    // W-053 ②：截短闊度 = titleChars 個全形字（揀中字級）：啱啱 8 個字原樣，9 個字先「…」
    it('should keep a title of exactly eight full-width characters and cut one of nine', () => {
        const eight = '長夜漫漫我的愛晚';
        const nine = `${eight}安`;
        const { option, part } = renderList(view([row(1, true, eight), row(2, true, nine)]));
        expect(part(option(`第 1 首：${eight}`), 'arc-title')).toHaveTextContent(eight);
        const cut = part(option(`第 2 首：${nine}`), 'arc-title');
        expect(cut?.textContent?.endsWith('…')).toBe(true);
    });

    // D11：未有音檔 = 灰色、㩒唔到；鍵盤同吸附都唔停喺佢
    it('should grey out a row without audio, ignore presses on it and skip it', () => {
        const { option, onPlay, listbox, selected } = renderList(
            view([row(1), row(2, false), row(3)]),
        );
        const grey = option('第 2 首：歌 2（未有音檔）');
        expect(grey).toHaveAttribute('aria-disabled', 'true');
        expect(grey).toHaveClass('arc-row--off');
        fireEvent.click(grey);
        expect(onPlay).not.toHaveBeenCalled();
        fireEvent.keyDown(listbox(), { key: 'ArrowDown' });
        expect(selected()).toHaveAccessibleName('第 3 首：歌 3');
    });

    it('should move the frame with the arrow, page, home and end keys and report the track', () => {
        const { listbox, selected, onFocusTrack } = renderList(view(LONG, 0));
        fireEvent.keyDown(listbox(), { key: 'ArrowDown' });
        expect(selected()).toHaveAccessibleName('第 2 首：歌 2');
        fireEvent.keyDown(listbox(), { key: 'PageDown' });
        expect(selected()).toHaveAccessibleName('第 6 首：歌 6');
        fireEvent.keyDown(listbox(), { key: 'End' });
        expect(selected()).toHaveAccessibleName('第 34 首：歌 34');
        fireEvent.keyDown(listbox(), { key: 'Home' });
        expect(selected()).toHaveAccessibleName('第 1 首：歌 1');
        expect(onFocusTrack.mock.calls.map(([id]) => id)).toEqual([
            'komorebi-02',
            'komorebi-06',
            'komorebi-34',
            'komorebi-01',
        ]);
    });

    it('should play the focused row with Enter or Space', () => {
        const { listbox, onPlay } = renderList(view([row(1), row(2), row(3)], 1));
        fireEvent.keyDown(listbox(), { key: 'Enter' });
        fireEvent.keyDown(listbox(), { key: ' ' });
        expect(onPlay.mock.calls).toEqual([['komorebi-02'], ['komorebi-02']]);
    });

    // W-051（用戶決定）：行唔㩒得：㩒框入面或者淡色嗰行都冇反應（唔播、唔收、唔移）；播歌經唱片夾或者 Enter
    it('should do nothing when a row is tapped, framed or dim', () => {
        const { option, onPlay, onClose, onFocusTrack, selected } = renderList(view(LONG, 0));
        const framed = option('第 1 首：歌 1');
        const dim = option('第 4 首：歌 4');
        for (const target of [framed, dim]) {
            const hit = target.querySelector('[data-part="arc-hit"]');
            if (!hit) throw new Error('no hit band');
            fireEvent.pointerDown(hit, { pointerId: 1, clientY: 600 });
            fireEvent.pointerUp(hit, { pointerId: 1, clientY: 600 });
            fireEvent.click(hit);
        }
        expect(onPlay).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
        expect(onFocusTrack).not.toHaveBeenCalled();
        expect(selected()).toHaveAccessibleName('第 1 首：歌 1');
    });

    it('should not present the rows as buttons', () => {
        const { option } = renderList(view([row(1), row(2)]));
        expect(screen.queryByRole('button', { name: /第 2 首/ })).toBeNull();
        expect(option('第 2 首：歌 2')).not.toHaveAttribute('tabindex');
        expect(option('第 2 首：歌 2')).not.toHaveClass('pressable');
    });

    // D25：㩒暗位收返；Esc 一樣
    it('should close from the dimmed area or with Escape', () => {
        const { onClose } = renderList(view([row(1)]));
        const veil = screen.getByRole('button', { name: '關閉歌單' });
        fireEvent.click(veil);
        fireEvent.keyDown(document.body, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('should take the keyboard focus when it opens', () => {
        const { listbox } = renderList(view([row(1)]));
        expect(document.activeElement).toBe(listbox());
    });

    it('should keep Tab inside the open list', () => {
        const { listbox } = renderList(view([row(1)]));
        const veil = screen.getByRole('button', { name: '關閉歌單' });
        fireEvent.keyDown(listbox(), { key: 'Tab' });
        expect(document.activeElement).toBe(veil);
        fireEvent.keyDown(veil, { key: 'Tab' });
        expect(document.activeElement).toBe(listbox());
        fireEvent.keyDown(listbox(), { key: 'Tab', shiftKey: true });
        expect(document.activeElement).toBe(veil);
    });

    it('should drag the rows along the arc and snap to the nearest row, without a press', () => {
        const { container, selected, onPlay, onClose, onFocusTrack } = renderList(view(LONG, 0));
        const root = container.querySelector('[data-part="arc-list"]');
        if (!root) throw new Error('no list');
        fireEvent.pointerDown(root, { pointerId: 1, clientY: 1000 });
        fireEvent.pointerMove(root, { pointerId: 1, clientY: 1000 - PITCH * 2.3 });
        fireEvent.pointerUp(root, { pointerId: 1 });
        fireEvent.click(screen.getByRole('button', { name: '關閉歌單' }));
        expect(selected()).toHaveAccessibleName('第 3 首：歌 3');
        expect(onFocusTrack).toHaveBeenLastCalledWith('komorebi-03');
        expect(onPlay).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    // W-050：第二隻手指（或者手掌）唔好取消第一隻手指嘅拖動；拖完一定停喺一行
    it('should keep the first finger dragging when a second finger touches, and snap to a row', () => {
        const { container, selected, onFocusTrack } = renderList(view(LONG, 0));
        const root = container.querySelector('[data-part="arc-list"]');
        if (!root) throw new Error('no list');
        fireEvent.pointerDown(root, { pointerId: 1, clientY: 1000 });
        fireEvent.pointerMove(root, { pointerId: 1, clientY: 1000 - PITCH * 1.25 });
        fireEvent.pointerDown(root, { pointerId: 2, clientY: 400 });
        fireEvent.pointerUp(root, { pointerId: 2 });
        fireEvent.pointerMove(root, { pointerId: 1, clientY: 1000 - PITCH * 2.25 });
        fireEvent.pointerUp(root, { pointerId: 1 });
        expect(selected()).toHaveAccessibleName('第 3 首：歌 3');
        expect(onFocusTrack).toHaveBeenLastCalledWith('komorebi-03');
        const number = selected().querySelector('[data-part="arc-number"]');
        expect(number).toHaveAttribute('y', '1196');
    });

    it('should snap to a row when the drag is cancelled or loses the pointer', () => {
        const { container, selected, onFocusTrack } = renderList(view(LONG, 0));
        const root = container.querySelector('[data-part="arc-list"]');
        if (!root) throw new Error('no list');
        fireEvent.pointerDown(root, { pointerId: 1, clientY: 1000 });
        fireEvent.pointerMove(root, { pointerId: 1, clientY: 1000 - PITCH * 1.4 });
        fireEvent.lostPointerCapture(root, { pointerId: 1 });
        expect(onFocusTrack).toHaveBeenLastCalledWith('komorebi-02');
        fireEvent.pointerDown(root, { pointerId: 3, clientY: 1000 });
        fireEvent.pointerMove(root, { pointerId: 3, clientY: 1000 - PITCH * 0.8 });
        fireEvent.pointerCancel(root, { pointerId: 3 });
        expect(selected()).toHaveAccessibleName('第 3 首：歌 3');
        expect(onFocusTrack).toHaveBeenLastCalledWith('komorebi-03');
    });

    // W-050：手指嘅隱含 capture 由行轉去成個歌單（setPointerCapture）時，行收到 lostpointercapture：唔係拖完
    it('should keep dragging when the capture moves from a row to the list', () => {
        const { container, option, selected } = renderList(view(LONG, 0));
        const root = container.querySelector('[data-part="arc-list"]');
        if (!root) throw new Error('no list');
        const row = option('第 1 首：歌 1');
        fireEvent.pointerDown(row, { pointerId: 1, clientY: 1000 });
        fireEvent.pointerMove(row, { pointerId: 1, clientY: 1000 - PITCH });
        fireEvent.lostPointerCapture(row, { pointerId: 1 });
        fireEvent.pointerMove(root, { pointerId: 1, clientY: 1000 - PITCH * 2 });
        fireEvent.pointerUp(root, { pointerId: 1 });
        expect(selected()).toHaveAccessibleName('第 3 首：歌 3');
    });

    it('should let a new press replace one that never started dragging', () => {
        const { container, selected } = renderList(view(LONG, 0));
        const root = container.querySelector('[data-part="arc-list"]');
        if (!root) throw new Error('no list');
        fireEvent.pointerDown(root, { pointerId: 1, clientY: 1000 });
        fireEvent.pointerDown(root, { pointerId: 2, clientY: 1000 });
        fireEvent.pointerMove(root, { pointerId: 2, clientY: 1000 - PITCH });
        fireEvent.pointerUp(root, { pointerId: 2 });
        expect(selected()).toHaveAccessibleName('第 2 首：歌 2');
    });

    it('should neither scroll nor play on a small movement over a row', () => {
        const { option, onPlay, selected } = renderList(view([row(1), row(2)]));
        const target = option('第 2 首：歌 2');
        fireEvent.pointerDown(target, { pointerId: 1, clientY: 600 });
        fireEvent.pointerMove(target, { pointerId: 1, clientY: 600 - (dragThresholdPx - 1) });
        fireEvent.pointerUp(target, { pointerId: 1 });
        fireEvent.click(target);
        expect(onPlay).not.toHaveBeenCalled();
        expect(selected()).toHaveAccessibleName('第 1 首：歌 1');
    });

    it('should step a row per wheel row and keep the page from scrolling', () => {
        const { container, selected } = renderList(view(LONG, 0));
        const root = container.querySelector('[data-part="arc-list"]');
        if (!root) throw new Error('no list');
        const wheel = createEvent.wheel(root, { deltaY: PITCH * 0.6 });
        fireEvent(root, wheel);
        expect(wheel.defaultPrevented).toBe(true);
        expect(selected()).toHaveAccessibleName('第 1 首：歌 1');
        fireEvent.wheel(root, { deltaY: PITCH * 0.6 });
        expect(selected()).toHaveAccessibleName('第 2 首：歌 2');
        fireEvent.wheel(root, { deltaY: -1, deltaMode: 1 });
        expect(selected()).toHaveAccessibleName('第 1 首：歌 1');
    });

    // S-198：Ctrl + 滾輪 / 觸控板 pinch 係縮放：留畀瀏覽器，歌單唔捲
    it('should leave a pinch-zoom wheel to the browser', () => {
        const { container, selected } = renderList(view(LONG, 0));
        const root = container.querySelector('[data-part="arc-list"]');
        if (!root) throw new Error('no list');
        const wheel = createEvent.wheel(root, { deltaY: 3, deltaMode: 1, ctrlKey: true });
        fireEvent(root, wheel);
        expect(wheel.defaultPrevented).toBe(false);
        expect(selected()).toHaveAccessibleName('第 1 首：歌 1');
    });

    // 效能：歌名只喺開歌單時量一次；捲動唔再量字
    it('should not measure titles again while scrolling', () => {
        const measure = vi.fn(estimateTextWidth);
        const { listbox } = renderList(view(LONG, 0), measure);
        const before = measure.mock.calls.length;
        fireEvent.keyDown(listbox(), { key: 'PageDown' });
        fireEvent.keyDown(listbox(), { key: 'ArrowDown' });
        expect(measure.mock.calls.length - before).toBe(0);
    });

    // D39：冇歌嘅專輯：框入面「尚未有歌曲」，冇行，照樣收得返
    it('should show the empty text in the frame for an album without tracks', () => {
        const { container, onClose } = renderList(view([]));
        const empty = container.querySelector('[data-part="arc-empty"]');
        expect(empty).toHaveTextContent('尚未有歌曲');
        expect(empty).toHaveAttribute('x', '384');
        expect(empty).toHaveAttribute('y', '1196');
        expect(empty).toHaveAttribute('font-size', '42');
        expect(screen.queryByRole('listbox')).toBeNull();
        const veil = screen.getByRole('button', { name: '關閉歌單' });
        expect(document.activeElement).toBe(veil);
        fireEvent.keyDown(veil, { key: 'Enter' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    // 暗層中間留返唱片夾個窿（設計稿 dimLayer()）：唱片夾（play）喺下面照㩒得
    it('should dim the stage with a hole over the clamp', () => {
        renderList(view([row(1)]));
        const shown = screen.getByRole('button', { name: '關閉歌單' });
        expect(shown).toHaveAttribute('fill-rule', 'evenodd');
        expect(shown).toHaveAttribute('opacity', '0.8');
        expect(shown.getAttribute('d')).toContain('a112 112 0 1 0 224 0');
    });

    // 全部都未有音檔：滾輪同方向鍵一樣逐行捲（S-204），但冇嘢播
    it('should still scroll a disc where nothing can play, and play nothing', () => {
        const silent = [row(1, false), row(2, false), row(3, false)];
        const { container, listbox, selected, onPlay } = renderList(view(silent, 0));
        const root = container.querySelector('[data-part="arc-list"]');
        if (!root) throw new Error('no list');
        fireEvent.wheel(root, { deltaY: 1, deltaMode: 1 });
        expect(selected()).toHaveAccessibleName('第 2 首：歌 2（未有音檔）');
        fireEvent.keyDown(listbox(), { key: 'ArrowDown' });
        expect(selected()).toHaveAccessibleName('第 3 首：歌 3（未有音檔）');
        fireEvent.keyDown(listbox(), { key: 'Home' });
        expect(selected()).toHaveAccessibleName('第 1 首：歌 1（未有音檔）');
        fireEvent.keyDown(listbox(), { key: 'End' });
        expect(selected()).toHaveAccessibleName('第 3 首：歌 3（未有音檔）');
        fireEvent.keyDown(listbox(), { key: 'Enter' });
        expect(onPlay).not.toHaveBeenCalled();
    });

    it('should play once for a held-down Enter and ignore other keys', () => {
        const { listbox, selected, onPlay } = renderList(view([row(1), row(2)], 0));
        fireEvent.keyDown(listbox(), { key: 'Enter' });
        fireEvent.keyDown(listbox(), { key: 'Enter', repeat: true });
        fireEvent.keyDown(listbox(), { key: 'a' });
        expect(onPlay).toHaveBeenCalledTimes(1);
        expect(selected()).toHaveAccessibleName('第 1 首：歌 1');
    });

    it('should bring the focus back in from outside the stage with Tab and Shift+Tab', () => {
        const outside = document.createElement('button');
        document.body.append(outside);
        const { listbox } = renderList(view([row(1)]));
        const veil = screen.getByRole('button', { name: '關閉歌單' });
        outside.focus();
        fireEvent.keyDown(outside, { key: 'Tab' });
        expect(document.activeElement).toBe(veil);
        outside.focus();
        fireEvent.keyDown(outside, { key: 'Tab', shiftKey: true });
        expect(document.activeElement).toBe(listbox());
        outside.remove();
    });
});

/*
 * 設計稿第 19 版 LIST_FLOAT（B-086 ②）：由歌單欄開弧線歌單：見到嘅行由歌單欄嘅位飄去弧線（黑字變白字），
 * 暗層淡入、框由唱片夾伸出，歌單欄其餘嘅行原地淡出。`floating` 由 TopGroup 決定（減少動態效果時 false）
 */
describe('ArcTrackList floating in from the column', () => {
    const MANY = Array.from({ length: 12 }, (_, index) => row(index + 1));
    const floats = (container: HTMLElement) =>
        [...container.querySelectorAll<SVGGElement>('.arc-row-float')].map((element) =>
            element.style.getPropertyValue('--float-delay'),
        );

    it('should float the visible rows in one after another, top first', () => {
        const { container } = renderList(view(MANY, 0, true), estimateTextWidth, true);
        const shown = screen.getAllByRole('option').length;
        expect(floats(container)).toEqual(
            Array.from({ length: shown }, (_, slot) => `${slot * 80}ms`),
        );
        expect(container.querySelector('[data-part="arc-veil"]')).toHaveClass('arc-veil--in');
        expect(container.querySelector('.arc-frame-in')).not.toBeNull();
    });

    it('should fade out the column rows that do not reach the arc', () => {
        const { container } = renderList(view(MANY, 0, true), estimateTextWidth, true);
        const ghosts = container.querySelector('[data-part="arc-ghosts"]');
        expect(ghosts).toHaveAttribute('aria-hidden', 'true');
        const shown = screen.getAllByRole('option').length;
        const titles = [...(ghosts?.querySelectorAll('[data-part="held-title"]') ?? [])];
        expect(titles[0]).toHaveTextContent(`歌 ${shown + 1}`);
        const { top, pitch, bottomIdle } = PHONE_LAYOUT.heldTracks;
        expect(titles.length).toBe(
            Math.min(MANY.length, Math.floor((bottomIdle - top) / pitch - 0.5) + 1) - shown,
        );
    });

    // 長歌單：淡出行止於鬆手後嘅欄底（bottomIdle 1290），唔係字母盤開住嘅 1470（review W-054 M40）
    it('should stop the fading column rows at the released bottom of the column', () => {
        const LONGER = Array.from({ length: 20 }, (_, index) => row(index + 1));
        const { container } = renderList(view(LONGER, 0, true), estimateTextWidth, true);
        const ghosts = container.querySelector('[data-part="arc-ghosts"]');
        const titles = [...(ghosts?.querySelectorAll('[data-part="held-title"]') ?? [])];
        const { top, pitch, bottomIdle } = PHONE_LAYOUT.heldTracks;
        const lastY = Number(titles.at(-1)?.getAttribute('y'));
        expect(lastY).toBeLessThan(bottomIdle);
        expect(lastY + pitch).toBeGreaterThanOrEqual(bottomIdle);
        expect(titles.length).toBe(
            Math.floor((bottomIdle - top) / pitch - 0.5) + 1 - screen.getAllByRole('option').length,
        );
    });

    it('should open with no float when not floating', () => {
        const { container } = renderList(view(MANY), estimateTextWidth, false);
        expect(floats(container)).toEqual([]);
        expect(container.querySelector('[data-part="arc-ghosts"]')).toBeNull();
        expect(container.querySelector('[data-part="arc-veil"]')).not.toHaveClass('arc-veil--in');
    });
});
