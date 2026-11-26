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

const discIds = (container: HTMLElement) =>
    [...container.querySelectorAll('[data-part="stack-disc"]')].map((disc) =>
        disc.getAttribute('data-album'),
    );

/* 設計稿 discs()：其他碟沿弧線排，右邊嗰張永遠最頂（按次序畫）；唱片夾緊接喺而家隻碟後面 */
describe('DiscStack', () => {
    it('should draw the discs around the current one in dial order', () => {
        expect(discIds(renderStack())).toEqual(['d', 'e', 'f', 'g', 'h', 'i']);
    });

    it('should stop at the ends of the dial', () => {
        expect(discIds(renderStack({ current: 0 }))).toEqual(['a', 'b', 'c', 'd']);
    });

    it('should put the slot (the spindle) right after the current disc', () => {
        const container = renderStack();
        const current = container.querySelector('[data-current="true"]');
        expect(current?.getAttribute('data-album')).toBe('f');
        expect(current?.nextElementSibling).toHaveAttribute('data-part', 'slot');
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
});
