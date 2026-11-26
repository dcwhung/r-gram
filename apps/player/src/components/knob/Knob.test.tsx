import { fireEvent, render, screen } from '@testing-library/react';
import { PHONE_LAYOUT as LAYOUT } from '../../stage/layouts';
import { Knob } from './Knob';

const POSITIONS = 22;
const STEP_DEG = (376.25 - 185) / (POSITIONS - 1);
/** 旋鈕感應圈喺螢幕上嘅位置：圓心 (200, 600)、半徑 50 px */
const CENTRE = { x: 200, y: 600 };
const RADIUS_PX = 50;

const handlers = () => ({ onStart: vi.fn(), onTurn: vi.fn(), onEnd: vi.fn() });

const renderKnob = (props: { current?: number; open?: boolean } = {}) => {
    const spies = handlers();
    const view = render(
        <svg>
            <Knob
                layout={LAYOUT}
                positions={POSITIONS}
                current={props.current ?? 10}
                open={props.open ?? false}
                accent="#c8442b"
                glow="#ffd0c0"
                valueText="KOMOREBI"
                {...spies}
            />
        </svg>,
    );
    const hit = view.container.querySelector('[data-part="knob-hit"]') as Element;
    hit.getBoundingClientRect = () =>
        ({
            left: CENTRE.x - RADIUS_PX,
            top: CENTRE.y - RADIUS_PX,
            width: RADIUS_PX * 2,
            height: RADIUS_PX * 2,
        }) as DOMRect;
    return { ...view, spies, knob: screen.getByRole('slider') };
};

/** 螢幕上離旋鈕中心 distance px、角度 deg 嘅一點 */
const at = (deg: number, distance = RADIUS_PX * 2) => ({
    clientX: CENTRE.x + distance * Math.cos((deg * Math.PI) / 180),
    clientY: CENTRE.y + distance * Math.sin((deg * Math.PI) / 180),
    pointerId: 1,
});

describe('Knob', () => {
    // Technical Spec 實現注意事項 14：旋鈕 = role="slider" + aria-valuenow
    it('should be a slider that reads out the disc it points at', () => {
        const { knob } = renderKnob();
        expect(knob).toHaveAttribute('aria-label', '選擇唱片');
        expect(knob).toHaveAttribute('aria-valuemin', '0');
        expect(knob).toHaveAttribute('aria-valuemax', String(POSITIONS - 1));
        expect(knob).toHaveAttribute('aria-valuenow', '10');
        expect(knob).toHaveAttribute('aria-valuetext', 'KOMOREBI');
        expect(knob).toHaveAttribute('tabindex', '0');
    });

    it('should turn the pointer to the angle of the current position', () => {
        const { container } = renderKnob({ current: 0 });
        const pointer = container.querySelector('[data-part="knob-pointer"]') as SVGElement;
        expect(pointer.style.transform).toContain('rotate(185deg)');
    });

    it('should glow only while the dial is open', () => {
        const closed = renderKnob().container.querySelector('[data-part="knob-glow"]');
        expect(closed).toHaveAttribute('data-on', 'false');
        const open = renderKnob({ open: true }).container.querySelectorAll(
            '[data-part="knob-glow"]',
        );
        expect(open[1]).toHaveAttribute('data-on', 'true');
    });

    describe('dragging', () => {
        it('should open the dial when the knob is grabbed', () => {
            const { knob, spies } = renderKnob();
            fireEvent.pointerDown(knob, at(0));
            expect(spies.onStart).toHaveBeenCalledTimes(1);
            expect(spies.onTurn).not.toHaveBeenCalled();
        });

        it('should report each new position while the pointer turns round the knob', () => {
            const { knob, spies } = renderKnob();
            fireEvent.pointerDown(knob, at(0));
            fireEvent.pointerMove(knob, at(STEP_DEG));
            fireEvent.pointerMove(knob, at(STEP_DEG * 1.2));
            fireEvent.pointerMove(knob, at(STEP_DEG * 3));
            expect(spies.onTurn.mock.calls).toEqual([[11], [13]]);
        });

        it('should turn back to earlier discs anticlockwise', () => {
            const { knob, spies } = renderKnob();
            fireEvent.pointerDown(knob, at(90));
            fireEvent.pointerMove(knob, at(90 - 2 * STEP_DEG));
            expect(spies.onTurn).toHaveBeenLastCalledWith(8);
        });

        it('should ignore the pointer over the centre of the knob', () => {
            const { knob, spies } = renderKnob();
            fireEvent.pointerDown(knob, at(0, 2));
            fireEvent.pointerMove(knob, at(120, 2));
            expect(spies.onTurn).not.toHaveBeenCalled();
        });

        it('should close the dial on the chosen disc when released or cancelled', () => {
            const { knob, spies } = renderKnob();
            fireEvent.pointerDown(knob, at(0));
            fireEvent.pointerUp(knob, at(0));
            expect(spies.onEnd).toHaveBeenCalledTimes(1);
            fireEvent.pointerDown(knob, at(0));
            fireEvent.pointerCancel(knob, at(0));
            expect(spies.onEnd).toHaveBeenCalledTimes(2);
        });

        it('should not react to moves without a grab', () => {
            const { knob, spies } = renderKnob();
            fireEvent.pointerMove(knob, at(90));
            fireEvent.pointerUp(knob, at(90));
            expect(spies.onTurn).not.toHaveBeenCalled();
            expect(spies.onEnd).not.toHaveBeenCalled();
        });
    });

    // US-012：鍵盤可以操作（方向鍵逐格、Home / End、Enter 或 Esc 完成）
    describe('keyboard', () => {
        it('should open the dial and move one disc with an arrow key', () => {
            const { knob, spies } = renderKnob();
            fireEvent.keyDown(knob, { key: 'ArrowRight' });
            expect(spies.onStart).toHaveBeenCalledTimes(1);
            expect(spies.onTurn).toHaveBeenCalledWith(11);
        });

        it('should not reopen an open dial', () => {
            const { knob, spies } = renderKnob({ open: true });
            fireEvent.keyDown(knob, { key: 'End' });
            expect(spies.onStart).not.toHaveBeenCalled();
            expect(spies.onTurn).toHaveBeenCalledWith(POSITIONS - 1);
        });

        it.each(['Enter', 'Escape'])('should finish choosing with %s', (key) => {
            const { knob, spies } = renderKnob({ open: true });
            fireEvent.keyDown(knob, { key });
            expect(spies.onEnd).toHaveBeenCalledTimes(1);
        });

        it('should finish choosing when the focus leaves the knob', () => {
            const { knob, spies } = renderKnob({ open: true });
            fireEvent.blur(knob);
            expect(spies.onEnd).toHaveBeenCalledTimes(1);
        });

        it('should ignore Enter and leaving when the dial is closed', () => {
            const { knob, spies } = renderKnob();
            fireEvent.keyDown(knob, { key: 'Enter' });
            fireEvent.blur(knob);
            expect(spies.onEnd).not.toHaveBeenCalled();
            expect(spies.onStart).not.toHaveBeenCalled();
        });
    });
});
