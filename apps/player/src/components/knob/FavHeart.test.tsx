import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { px } from '../svgNumber';
import { heartHitPoint, heartPoint } from '../../stage/geometry';
import { PHONE_LAYOUT as LAYOUT } from '../../stage/layouts';
import { FavHeart } from './FavHeart';

const renderHeart = (props: { open?: boolean; lit?: boolean } = {}) => {
    const onPress = vi.fn();
    const view = render(
        <svg>
            <FavHeart
                layout={LAYOUT}
                open={props.open ?? false}
                lit={props.lit ?? false}
                onPress={onPress}
            />
        </svg>,
    );
    return { ...view, onPress, button: screen.getByRole('button') };
};

const translateOf = (element: Element | null) =>
    (element as SVGElement | null)?.style.transform ?? '';

/* 設計稿 favHeart()：刻度最尾嘅 ♥；平時喺刻度線外面，轉碟時沿同一個角度滑出去字母盤；身處 Favourites 碟時轉紅 */
describe('FavHeart', () => {
    it('should be a button that goes to the Favourites disc', () => {
        const { button, onPress } = renderHeart();
        expect(button).toHaveAttribute('aria-label', '前往「我的收藏」');
        expect(button).toHaveAttribute('aria-pressed', 'false');
        fireEvent.click(button);
        expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should show as pressed and lit while on the Favourites disc', () => {
        const { button } = renderHeart({ lit: true });
        expect(button).toHaveAttribute('aria-pressed', 'true');
        expect(button.querySelector('[data-part="heart-glow"]')).not.toBeNull();
    });

    it('should sit just outside the scale while closed and on the dial while open', () => {
        const glyphAt = (open: boolean) =>
            translateOf(renderHeart({ open }).container.querySelector('[data-part="heart-glyph"]'));
        const near = heartPoint(LAYOUT, 0);
        expect(glyphAt(false)).toContain(`translate(${px(near.x)}px, ${px(near.y)}px)`);
        cleanup();
        const far = heartPoint(LAYOUT, 1);
        expect(glyphAt(true)).toContain(`translate(${px(far.x)}px, ${px(far.y)}px)`);
    });

    it('should keep its touch area just off the knob while closed', () => {
        const hit = renderHeart().container.querySelector('[data-part="heart-hit"]');
        const { x, y } = heartHitPoint(LAYOUT, 0);
        expect(translateOf(hit)).toContain(`translate(${px(x)}px, ${px(y)}px)`);
    });
});
