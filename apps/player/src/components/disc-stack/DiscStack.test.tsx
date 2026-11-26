import { render } from '@testing-library/react';
import type { DialEntry } from '../../app/dialView';
import { PHONE_LAYOUT as LAYOUT } from '../../stage/layouts';
import { DiscStack } from './DiscStack';

const entry = (albumId: string): DialEntry => ({
    albumId,
    key: albumId.charAt(0).toUpperCase(),
    title: albumId,
    accent: '#c8442b',
    coverUrl: `https://img.example/${albumId}.webp`,
    thumbUrl: `https://img.example/${albumId}-thumb.webp`,
});
const ENTRIES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map(entry);

const renderStack = (props: { current?: number; open?: boolean; spinning?: boolean } = {}) =>
    render(
        <svg>
            <DiscStack
                layout={LAYOUT}
                entries={ENTRIES}
                current={props.current ?? 5}
                open={props.open ?? true}
                spinning={props.spinning ?? false}
            >
                <g data-part="slot" />
            </DiscStack>
        </svg>,
    ).container;

const stackAt = (current: number, entries: readonly DialEntry[] = ENTRIES) => (
    <svg>
        <DiscStack layout={LAYOUT} entries={entries} current={current} open spinning={false}>
            <g data-part="slot" />
        </DiscStack>
    </svg>
);

/** 由 current = from 轉去 to：有邊隻碟嘅元素俾拎走再插返（React 搬佢喺 DOM 嘅位置，CSS 過場會冇咗） */
const reinsertedDiscs = (from: number, to: number, entries: readonly DialEntry[] = ENTRIES) => {
    const { container, rerender } = render(stackAt(from, entries));
    const observer = new MutationObserver(() => {});
    observer.observe(container, { childList: true, subtree: true });
    rerender(stackAt(to, entries));
    const records = observer.takeRecords();
    observer.disconnect();
    const discsIn = (pick: (record: MutationRecord) => NodeList) =>
        records
            .flatMap((record) => [...pick(record)])
            .filter((node): node is Element => node instanceof Element)
            .filter((node) => node.getAttribute('data-part') === 'stack-disc')
            .map((node) => node.getAttribute('data-album'));
    const removed = discsIn((record) => record.removedNodes);
    return discsIn((record) => record.addedNodes).filter((album) => removed.includes(album));
};

const discIds = (container: HTMLElement) =>
    [...container.querySelectorAll('[data-part="stack-disc"]')].map((disc) =>
        disc.getAttribute('data-album'),
    );

/* 設計稿 discs()：其他碟沿弧線排，右邊嗰張永遠最頂（按次序畫）；唱片夾緊接喺而家隻碟後面 */
describe('DiscStack', () => {
    it('should draw the discs around the current one in dial order', () => {
        expect(discIds(renderStack())).toEqual(['d', 'e', 'f', 'g', 'h', 'i']);
    });

    // T-110 第 20 版：碟疊頭尾相接（設計稿 stackOffset()）：第一隻碟前面係最尾嗰隻（♥），♥ 後面係第一、二隻碟
    it('should loop round the ends of the dial', () => {
        expect(discIds(renderStack({ current: 0 }))).toEqual(['i', 'j', 'a', 'b', 'c', 'd']);
        expect(discIds(renderStack({ current: 9 }))).toEqual(['h', 'i', 'j', 'a', 'b', 'c']);
    });

    // 設計稿 discs()：按離而家隻碟幾遠排，♥ 之後嘅第一隻碟畫喺 ♥ 上面，滑入去「下一隻」嘅位
    it('should draw the first disc on top of ♥ as the next one, with the slot right after ♥', () => {
        const container = renderStack({ current: 9 });
        const current = container.querySelector('[data-current="true"]');
        expect(current?.getAttribute('data-album')).toBe('j');
        expect(current?.nextElementSibling).toHaveAttribute('data-part', 'slot');
        const first = container.querySelector<SVGElement>('[data-album="a"]');
        const next = renderStack({ current: 4 }).querySelector<SVGElement>('[data-album="f"]');
        expect(first?.style.transform).toBe(next?.style.transform);
        expect(first?.style.opacity).toBe('1');
    });

    it('should put the slot (the spindle) right after the current disc', () => {
        const container = renderStack();
        const current = container.querySelector('[data-current="true"]');
        expect(current?.getAttribute('data-album')).toBe('f');
        expect(current?.nextElementSibling).toHaveAttribute('data-part', 'slot');
    });

    // W-037：碟喺範圍入面就一直係同一個元素（唔會俾 React 拎走再插返），由轉盤滑去弧線先有過場
    it.each([
        ['back', 5, 4],
        ['forward', 5, 6],
        ['forward past ♥', 9, 0],
        ['back past the first disc', 0, 9],
    ])('should keep every disc element in place when turning one step %s', (_, from, to) => {
        expect(reinsertedDiscs(from, to)).toEqual([]);
    });

    it('should give the current disc its cover over its thumbnail, and the others thumbnails only', () => {
        const container = renderStack();
        const hrefs = (albumId: string) =>
            [...container.querySelectorAll(`[data-album="${albumId}"] image`)].map((image) =>
                image.getAttribute('href'),
            );
        expect(hrefs('f')).toEqual([
            'https://img.example/f-thumb.webp',
            'https://img.example/f.webp',
        ]);
        expect(hrefs('g')).toEqual(['https://img.example/g-thumb.webp']);
    });

    it('should spin the current disc only', () => {
        const container = renderStack({ spinning: true });
        const spinning = [...container.querySelectorAll('[data-spinning="true"]')];
        expect(spinning).toHaveLength(1);
        expect(spinning[0]?.closest('[data-part="stack-disc"]')).toHaveAttribute('data-album', 'f');
    });

    it('should hide the other discs while the dial is closed', () => {
        const container = renderStack({ open: false });
        const opacity = (albumId: string) =>
            (container.querySelector(`[data-album="${albumId}"]`) as SVGElement).style.opacity;
        expect(opacity('f')).toBe('1');
        expect(opacity('g')).toBe('0');
    });

    it('should show one disc before and two after the current one while open', () => {
        const container = renderStack();
        const shown = [...container.querySelectorAll<SVGElement>('[data-part="stack-disc"]')]
            .filter((disc) => disc.style.opacity === '1')
            .map((disc) => disc.getAttribute('data-album'));
        expect(shown).toEqual(['e', 'f', 'g', 'h']);
    });

    it('should keep the other discs out of reach of the pointer and screen readers', () => {
        const other = renderStack().querySelector('[data-album="g"]');
        expect(other).toHaveAttribute('pointer-events', 'none');
        expect(other).toHaveAttribute('aria-hidden', 'true');
    });

    /*
     * S-217（已接受嘅限制，stackOrder.ts）：條目（連 ♥）≤ 5 時畫嘅範圍包住成個圈，前面嗰隻（−1，見到）一步之後
     * 變去後面（+3），排喺最尾 → React 搬佢喺 DOM 嘅位，佢嘅過場冇咗（即刻消失，唔係邊滑邊淡）。
     * ≥ 7 時永遠唔使搬（真 catalog 22 個）。呢個測試寫低呢條界線：改咗次序規則要留意
     */
    describe('small catalogues (accepted limit)', () => {
        const entriesOf = (count: number) => ENTRIES.slice(0, count);
        const movedOnSomeStep = (count: number) =>
            entriesOf(count).some((_, current) =>
                [1, -1].some(
                    (step) =>
                        reinsertedDiscs(current, (current + step + count) % count, entriesOf(count))
                            .length > 0,
                ),
            );

        it('should move the disc in front to the back of the DOM with five entries or fewer', () => {
            const count = 5;
            expect(reinsertedDiscs(0, 1, entriesOf(count))).toEqual([
                entriesOf(count)[count - 1]?.albumId,
            ]);
            expect(movedOnSomeStep(4)).toBe(true);
        });

        it.each([7, 8, 10])('should never move a disc node with %d entries', (count) => {
            expect(movedOnSomeStep(count)).toBe(false);
        });
    });
});
