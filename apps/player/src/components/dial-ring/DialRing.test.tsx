import { render } from '@testing-library/react';
import { PHONE_LAYOUT as LAYOUT } from '../../stage/layouts';
import { DialRing } from './DialRing';

/** 第 18 版嘅 22 格（DIAL_KEYS） */
const KEYS = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'F',
    '呢',
    '在',
    '橡',
    'W',
    'R',
    'R',
    '電',
    '終',
    '讓',
    '♥',
];

const renderRing = (current: number, open = true) =>
    render(
        <svg>
            <DialRing layout={LAYOUT} keys={KEYS} current={current} open={open} accent="#c8442b" />
        </svg>,
    ).container;

const letters = (container: HTMLElement) =>
    [...container.querySelectorAll('[data-part="dial-letter"]')].map((text) => text.textContent);

/* 設計稿 dialRing()；Functional Spec D28：22 格每 3 格一個字母，其餘細點；揀中嗰格永遠出字母，放大兼粗 */
describe('DialRing', () => {
    it('should show sparse letters and dots like mockup version 18 with K selected', () => {
        const container = renderRing(10);
        expect(letters(container)).toEqual(['A', 'D', 'G', 'K', '呢', 'W', '電']);
        expect(container.querySelectorAll('[data-part="dial-dot"]')).toHaveLength(14);
    });

    it('should not draw ♥ (the heart button moves onto the dial itself)', () => {
        expect(letters(renderRing(10))).not.toContain('♥');
    });

    it('should draw the selected letter larger in the regular slab face', () => {
        const container = renderRing(10);
        const selected = container.querySelector('[data-current="true"] [data-part="dial-letter"]');
        expect(selected).toHaveTextContent('K');
        expect(selected).toHaveAttribute('font-size', '46');
        expect(selected).toHaveClass('dial-letter--current');
        const other = container.querySelector('[data-current="false"] [data-part="dial-letter"]');
        expect(other).toHaveAttribute('font-size', '28');
    });

    it('should draw CJK letters a little smaller', () => {
        const container = renderRing(12);
        const selected = container.querySelector('[data-current="true"] [data-part="dial-letter"]');
        expect(selected).toHaveTextContent('呢');
        expect(Number(selected?.getAttribute('font-size'))).toBeCloseTo(46 * 0.82, 1);
    });

    it('should mark the selected position with the album colour, but not on ♥', () => {
        expect(renderRing(10).querySelector('[data-part="dial-mark"]')).toHaveAttribute(
            'stroke',
            '#c8442b',
        );
        expect(renderRing(21).querySelector('[data-part="dial-mark"]')).toBeNull();
    });

    it('should be decoration only: the knob slider speaks for it', () => {
        expect(renderRing(10).querySelector('[data-part="dial-ring"]')).toHaveAttribute(
            'aria-hidden',
            'true',
        );
    });

    it('should shrink into the knob and hide while closed', () => {
        const container = renderRing(10, false);
        const plate = container.querySelector('[data-part="dial-plate"]') as SVGElement;
        expect(plate.style.opacity).toBe('0');
        expect(plate.style.transform).toBe('scale(0.42)');
        const key = container.querySelector('[data-part="dial-key"]') as SVGElement;
        expect(key.style.opacity).toBe('0');
    });

    it('should open the letters clockwise one after another', () => {
        const container = renderRing(10, true);
        const delays = [...container.querySelectorAll<SVGElement>('[data-part="dial-key"]')].map(
            (key) => parseFloat(key.style.transitionDelay),
        );
        expect(delays[0]).toBe(0);
        expect(delays[20]).toBeGreaterThan(delays[1] ?? 0);
    });
});
