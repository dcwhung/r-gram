import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import type { TrackRow } from '../../app/heldTracksView';
import type { ArcListView } from '../../app/listView';
import { arcRowPitch, arcRowSpec } from '../../stage/arcRows';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { estimateTextWidth } from '../../utils/textMeasure';
import { ArcTrackList } from './ArcTrackList';

const ACCENT = '#2f8f57';
/** 測試冇 <Stage>：1 設計單位 = 1 px */
const PITCH = arcRowPitch(arcRowSpec(PHONE_LAYOUT));

const row = (no: number, playable = true): TrackRow => ({
    id: `komorebi-${String(no).padStart(2, '0')}`,
    no,
    number: String(no).padStart(2, '0'),
    title: `歌 ${no}`,
    playable,
});
const tracks = (count: number) => Array.from({ length: count }, (_, index) => row(index + 1));

const view = (rows: readonly TrackRow[], focusIndex = 0, fromColumn = false): ArcListView => ({
    albumId: 'komorebi',
    accent: ACCENT,
    rows,
    focusIndex,
    emptyText: '尚未有歌曲',
    fromColumn,
});

const renderList = (list: ArcListView, floating = false) => {
    const handlers = { onClose: vi.fn(), onFocusTrack: vi.fn(), onPlay: vi.fn() };
    const result = render(
        <svg>
            <ArcTrackList
                layout={PHONE_LAYOUT}
                list={list}
                albumTitle="KOMOREBI"
                measure={estimateTextWidth}
                floating={floating}
                {...handlers}
            />
        </svg>,
    );
    const root = result.container.querySelector('[data-part="arc-list"]');
    if (!root) throw new Error('no list');
    const listbox = () => screen.getByRole('listbox');
    const selected = () => screen.getByRole('option', { selected: true });
    const seam = () => result.container.querySelector('[data-part="arc-seam"]');
    const numbers = () =>
        [...result.container.querySelectorAll('[data-part="arc-number"]')].map(
            (node) => node.textContent,
        );
    return { ...result, ...handlers, root, listbox, selected, seam, numbers };
};

/*
 * T-110：設計稿第 20 版「弧線歌單頭尾相接」（LIST_LOOP、loopWindow()、listLayer()）：捲過最後一首就係第一首，
 * 反方向一樣；中間一格接駁位（專輯色嘅點 + 短線），揀唔到、捲動跳過；每首歌同一時間只畫一次
 */
describe('ArcTrackList looping', () => {
    it('should draw the seam above the first track as a dot and a short line in the accent', () => {
        const { seam } = renderList(view(tracks(12), 0));
        const mark = seam();
        expect(mark).toHaveAttribute('aria-hidden', 'true');
        expect(mark).toHaveAttribute('opacity', '0.8721');
        const dot = mark?.querySelector('circle');
        expect(dot).toHaveAttribute('cx', '400.2');
        expect(dot).toHaveAttribute('cy', '1107.1');
        expect(dot).toHaveAttribute('r', '9');
        expect(dot).toHaveAttribute('fill', ACCENT);
        const line = mark?.querySelector('path');
        expect(line).toHaveAttribute('d', 'M417.2 1107.1h230');
        expect(line).toHaveAttribute('stroke', ACCENT);
        expect(line).toHaveAttribute('stroke-width', '5');
        expect(line).toHaveAttribute('stroke-linecap', 'round');
    });

    it('should show the last tracks above the seam and each track only once', () => {
        const long = renderList(view(tracks(12), 0));
        expect(long.numbers()).toEqual(['10', '11', '12', '01', '02', '03', '04', '05']);
        long.unmount();
        const few = renderList(view(tracks(3), 0));
        expect(few.numbers()).toEqual(['01', '02', '03']);
        expect(few.seam()).not.toBeNull();
    });

    it('should not draw the seam when it is far from the frame, or when there are no tracks', () => {
        expect(renderList(view(tracks(30), 15)).seam()).toBeNull();
        expect(renderList(view([])).seam()).toBeNull();
    });

    // 接駁位唔係掣：㩒佢同㩒行一樣冇反應（唔會當㩒暗位收返）
    it('should do nothing when the seam is tapped', () => {
        const { seam, onClose, onPlay } = renderList(view(tracks(12), 0));
        const hit = seam()?.querySelector('[data-part="arc-hit"]');
        if (!hit) throw new Error('no hit band');
        fireEvent.click(hit);
        expect(onClose).not.toHaveBeenCalled();
        expect(onPlay).not.toHaveBeenCalled();
    });

    it('should go from the last track to the first and back with the arrow keys', () => {
        const { listbox, selected, onFocusTrack } = renderList(view(tracks(30), 29));
        fireEvent.keyDown(listbox(), { key: 'ArrowDown' });
        expect(selected()).toHaveAccessibleName('第 1 首：歌 1');
        fireEvent.keyDown(listbox(), { key: 'ArrowUp' });
        expect(selected()).toHaveAccessibleName('第 30 首：歌 30');
        expect(onFocusTrack.mock.calls.map(([id]) => id)).toEqual(['komorebi-01', 'komorebi-30']);
    });

    it('should wheel past the last track to the first', () => {
        const { root, selected } = renderList(view(tracks(9), 8));
        const wheel = createEvent.wheel(root, { deltaY: 1, deltaMode: 1 });
        fireEvent(root, wheel);
        expect(selected()).toHaveAccessibleName('第 1 首：歌 1');
        fireEvent.wheel(root, { deltaY: -1, deltaMode: 1 });
        expect(selected()).toHaveAccessibleName('第 9 首：歌 9');
    });

    it('should drag across the seam and never stop on it', () => {
        const { root, selected, onFocusTrack } = renderList(view(tracks(12), 11));
        fireEvent.pointerDown(root, { pointerId: 1, clientY: 1000 });
        fireEvent.pointerMove(root, { pointerId: 1, clientY: 1000 - PITCH * 0.8 });
        fireEvent.pointerUp(root, { pointerId: 1 });
        expect(selected()).toHaveAccessibleName('第 12 首：歌 12');
        fireEvent.pointerDown(root, { pointerId: 2, clientY: 1000 });
        fireEvent.pointerMove(root, { pointerId: 2, clientY: 1000 - PITCH * 1.7 });
        fireEvent.pointerUp(root, { pointerId: 2 });
        expect(selected()).toHaveAccessibleName('第 1 首：歌 1');
        // 接駁位喺拖動距離入面佔一格：由第 1 首向上拖 3.2 行 = 停喺第 11 首
        fireEvent.pointerDown(root, { pointerId: 3, clientY: 1000 });
        fireEvent.pointerMove(root, { pointerId: 3, clientY: 1000 + PITCH * 3.2 });
        fireEvent.pointerUp(root, { pointerId: 3 });
        expect(selected()).toHaveAccessibleName('第 11 首：歌 11');
        expect(onFocusTrack).toHaveBeenLastCalledWith('komorebi-11');
    });

    it('should skip rows without audio across the seam', () => {
        const rows = [row(1, false), row(2, false), row(3), row(4), row(5)];
        const { listbox, selected } = renderList(view(rows, 4));
        fireEvent.keyDown(listbox(), { key: 'ArrowDown' });
        expect(selected()).toHaveAccessibleName('第 3 首：歌 3');
        fireEvent.keyDown(listbox(), { key: 'ArrowUp' });
        expect(selected()).toHaveAccessibleName('第 5 首：歌 5');
    });

    it('should stay on the only track of a one-track list', () => {
        const { listbox, selected, root, seam } = renderList(view(tracks(1), 0));
        expect(seam()).not.toBeNull();
        fireEvent.keyDown(listbox(), { key: 'ArrowDown' });
        fireEvent.wheel(root, { deltaY: -1, deltaMode: 1 });
        expect(selected()).toHaveAccessibleName('第 1 首：歌 1');
        expect(screen.getAllByRole('option')).toHaveLength(1);
    });
});

/*
 * 第 20 版由歌單欄開（LIST_FLOAT + 頭尾相接）：淨係框嘅近邊嗰啲行由歌單欄飄落；接駁位另一邊嘅行同接駁位
 * 喺框線伸出時原地淡入（arc-row-appear）
 */
describe('ArcTrackList looping, floating in from the column', () => {
    it('should float only the near-side rows and fade in the far side and the seam', () => {
        const { container, seam } = renderList(view(tracks(12), 0, true), true);
        const floated = [...container.querySelectorAll('.arc-row-float')];
        expect(floated.map((node) => node.getAttribute('aria-label'))).toEqual(
            [1, 2, 3, 4, 5].map((no) => `第 ${no} 首：歌 ${no}`),
        );
        const appearing = [...container.querySelectorAll('[data-part="arc-row"].arc-row-appear')];
        expect(appearing.map((node) => node.getAttribute('aria-label'))).toEqual(
            [10, 11, 12].map((no) => `第 ${no} 首：歌 ${no}`),
        );
        expect(seam()).toHaveClass('arc-row-appear');
    });

    it('should not fade anything in when it is not floating', () => {
        const { container, seam } = renderList(view(tracks(12), 0, true), false);
        expect(container.querySelector('.arc-row-appear')).toBeNull();
        expect(seam()).not.toHaveClass('arc-row-appear');
    });
});
