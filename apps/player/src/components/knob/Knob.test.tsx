import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MOTION } from '../../config/motion';
import { PHONE_LAYOUT as LAYOUT } from '../../stage/layouts';
import { Knob } from './Knob';

const POSITIONS = 22;
const STEP_DEG = (376.25 - 185) / (POSITIONS - 1);
/** 旋鈕感應圈喺螢幕上嘅位置：圓心 (200, 600)、半徑 50 px */
const CENTRE = { x: 200, y: 600 };
const RADIUS_PX = 50;

const handlers = () => ({ onStart: vi.fn(), onTurn: vi.fn(), onEnd: vi.fn(), onCancel: vi.fn() });

const renderKnob = (props: { current?: number; open?: boolean; covered?: boolean } = {}) => {
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
                covered={props.covered}
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
    return { ...view, spies, knob: screen.getByRole('slider', { hidden: true }) };
};

/** 螢幕上離旋鈕中心 distance px、角度 deg 嘅一點 */
const at = (deg: number, distance = RADIUS_PX * 2, pointerId = 1) => ({
    clientX: CENTRE.x + distance * Math.cos((deg * Math.PI) / 180),
    clientY: CENTRE.y + distance * Math.sin((deg * Math.PI) / 180),
    pointerId,
});
/** 第二隻手指（另一個 pointerId） */
const SECOND = 2;
/** 滑鼠右掣 */
const SECONDARY_BUTTON = 2;
const { dialHoldMs } = MOTION.input;
/** 輕點：㩒落放手之間嘅時間（短過 dialHoldMs） */
const TAP_MS = 80;

/** 㩒住旋鈕夠時間（S-152：㩒住或者開始擰先開字母盤） */
const hold = (knob: Element, point = at(0)) => {
    fireEvent.pointerDown(knob, point);
    act(() => vi.advanceTimersByTime(dialHoldMs));
};

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

    // S-074：歌單嘅暗層蓋住時 Tab 唔到、讀屏唔讀
    it('should leave the Tab order and screen readers while covered', () => {
        const { knob } = renderKnob({ covered: true });
        expect(knob).toHaveAttribute('tabindex', '-1');
        expect(knob).toHaveAttribute('aria-hidden', 'true');
    });

    it('should turn the pointer to the angle of the current position', () => {
        const { container } = renderKnob({ current: 0 });
        const pointer = container.querySelector('[data-part="knob-pointer"]') as SVGElement;
        expect(pointer.style.transform).toContain('rotate(185deg)');
    });

    it('should glow only while the dial is open', () => {
        const glowOf = (open: boolean) =>
            renderKnob({ open }).container.querySelector('[data-part="knob-glow"]');
        expect(glowOf(false)).toHaveAttribute('data-on', 'false');
        cleanup();
        expect(glowOf(true)).toHaveAttribute('data-on', 'true');
    });

    describe('dragging', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });
        afterEach(() => {
            vi.useRealTimers();
        });

        // S-152（用戶決定 B-083 ①）：㩒住夠 dialHoldMs 先開字母盤
        it('should open the dial once the knob has been held for the hold time', () => {
            const { knob, spies } = renderKnob();
            fireEvent.pointerDown(knob, at(0));
            act(() => vi.advanceTimersByTime(dialHoldMs - 1));
            expect(spies.onStart).not.toHaveBeenCalled();
            act(() => vi.advanceTimersByTime(1));
            expect(spies.onStart).toHaveBeenCalledTimes(1);
            expect(spies.onTurn).not.toHaveBeenCalled();
        });

        // S-152：輕點（冇擰）唔開字母盤，亦唔會開咗即刻收（閃一下）
        it('should do nothing on a quick tap', () => {
            const { knob, spies } = renderKnob();
            fireEvent.pointerDown(knob, at(0));
            act(() => vi.advanceTimersByTime(TAP_MS));
            fireEvent.pointerUp(knob, at(0));
            act(() => vi.advanceTimersByTime(dialHoldMs));
            expect(spies.onStart).not.toHaveBeenCalled();
            expect(spies.onEnd).not.toHaveBeenCalled();
            expect(spies.onTurn).not.toHaveBeenCalled();
        });

        it('should open the dial at once when the pointer starts turning', () => {
            const { knob, spies } = renderKnob();
            const order: string[] = [];
            spies.onStart.mockImplementation(() => order.push('start'));
            spies.onTurn.mockImplementation(() => order.push('turn'));
            fireEvent.pointerDown(knob, at(0));
            fireEvent.pointerMove(knob, at(STEP_DEG));
            expect(order).toEqual(['start', 'turn']);
            act(() => vi.advanceTimersByTime(dialHoldMs));
            expect(spies.onStart).toHaveBeenCalledTimes(1);
        });

        it('should not open for a wobble below the turn threshold', () => {
            const { knob, spies } = renderKnob();
            const start = at(0);
            fireEvent.pointerDown(knob, start);
            const wobble = LAYOUT.knob.turnThresholdPx - 1;
            fireEvent.pointerMove(knob, { ...start, clientY: start.clientY + wobble });
            fireEvent.pointerUp(knob, start);
            expect(spies.onStart).not.toHaveBeenCalled();
        });

        it.each([
            ['cancelled', (knob: Element) => fireEvent.pointerCancel(knob, at(0))],
            ['left', (knob: Element) => fireEvent.pointerLeave(knob, at(0))],
            ['loses the capture', (knob: Element) => fireEvent.lostPointerCapture(knob, at(0))],
        ])('should not open later when the press is %s before the hold time', (_, end) => {
            const { knob, spies } = renderKnob();
            fireEvent.pointerDown(knob, at(0));
            end(knob);
            act(() => vi.advanceTimersByTime(dialHoldMs));
            expect(spies.onStart).not.toHaveBeenCalled();
            expect(spies.onEnd).not.toHaveBeenCalled();
            // 之後可以再㩒
            hold(knob);
            expect(spies.onStart).toHaveBeenCalledTimes(1);
        });

        it('should drop a pending open when it is removed', () => {
            const { knob, spies, unmount } = renderKnob();
            fireEvent.pointerDown(knob, at(0));
            unmount();
            act(() => vi.advanceTimersByTime(dialHoldMs));
            expect(spies.onStart).not.toHaveBeenCalled();
        });

        // 手指離開旋鈕都照轉：㩒落嗰陣攞 pointer capture
        it('should capture the pointer that grabs the knob', () => {
            const { knob } = renderKnob();
            const capture = vi.fn();
            knob.setPointerCapture = capture;
            fireEvent.pointerDown(knob, at(0));
            expect(capture).toHaveBeenCalledWith(1);
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

        // T-110 第 20 版：一路擰過 ♥ 就返第一隻碟，再擰落去照轉；向後擰過第一隻碟就係 ♥
        it('should turn past ♥ to the first disc and on, and back from the first disc to ♥', () => {
            const forward = renderKnob({ current: POSITIONS - 2 });
            fireEvent.pointerDown(forward.knob, at(0));
            [1, 2, 3, 4].forEach((steps) =>
                fireEvent.pointerMove(forward.knob, at(STEP_DEG * steps)),
            );
            expect(forward.spies.onTurn.mock.calls).toEqual([[POSITIONS - 1], [0], [1], [2]]);
            cleanup();
            const back = renderKnob({ current: 0 });
            fireEvent.pointerDown(back.knob, at(0));
            fireEvent.pointerMove(back.knob, at(-STEP_DEG));
            expect(back.spies.onTurn).toHaveBeenLastCalledWith(POSITIONS - 1);
        });

        it('should ignore the pointer over the centre of the knob', () => {
            const { knob, spies } = renderKnob();
            fireEvent.pointerDown(knob, at(0, 2));
            fireEvent.pointerMove(knob, at(120, 2));
            expect(spies.onTurn).not.toHaveBeenCalled();
        });

        it('should close the dial on the chosen disc when released or cancelled', () => {
            const { knob, spies } = renderKnob();
            hold(knob);
            fireEvent.pointerUp(knob, at(0));
            expect(spies.onEnd).toHaveBeenCalledTimes(1);
            hold(knob);
            fireEvent.pointerCancel(knob, at(0));
            expect(spies.onEnd).toHaveBeenCalledTimes(2);
        });

        // S-150：手勢跟住㩒落嗰個 pointer；第二隻手指唔可以搶、唔可以令指針跳
        it('should ignore a second finger while the first one turns the knob', () => {
            const { knob, spies } = renderKnob();
            fireEvent.pointerDown(knob, at(0));
            fireEvent.pointerMove(knob, at(STEP_DEG));
            fireEvent.pointerDown(knob, at(150, RADIUS_PX, SECOND));
            fireEvent.pointerMove(knob, at(150 + 4 * STEP_DEG, RADIUS_PX * 2, SECOND));
            fireEvent.pointerUp(knob, at(150 + 4 * STEP_DEG, RADIUS_PX * 2, SECOND));
            expect(spies.onStart).toHaveBeenCalledTimes(1);
            expect(spies.onTurn.mock.calls).toEqual([[11]]);
            expect(spies.onEnd).not.toHaveBeenCalled();
            fireEvent.pointerMove(knob, at(STEP_DEG * 2));
            fireEvent.pointerUp(knob, at(STEP_DEG * 2));
            expect(spies.onTurn.mock.calls).toEqual([[11], [12]]);
            expect(spies.onEnd).toHaveBeenCalledTimes(1);
        });

        it('should not start a turn with a button other than the primary one', () => {
            const { knob, spies } = renderKnob();
            fireEvent.pointerDown(knob, { ...at(0), button: SECONDARY_BUTTON });
            fireEvent.pointerMove(knob, at(STEP_DEG * 2));
            expect(spies.onStart).not.toHaveBeenCalled();
            expect(spies.onTurn).not.toHaveBeenCalled();
        });

        it('should close the dial when the knob loses the pointer capture', () => {
            const { knob, spies } = renderKnob();
            hold(knob);
            fireEvent.lostPointerCapture(knob, { pointerId: 1 });
            expect(spies.onEnd).toHaveBeenCalledTimes(1);
            fireEvent.pointerMove(knob, at(STEP_DEG * 2));
            expect(spies.onTurn).not.toHaveBeenCalled();
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

        // T-110 第 20 版：旋鈕頭尾相接：右鍵由 ♥ 去第一隻碟，左鍵由第一隻碟去 ♥
        it('should wrap the arrow keys round the ends of the scale', () => {
            const last = renderKnob({ current: POSITIONS - 1, open: true });
            fireEvent.keyDown(last.knob, { key: 'ArrowRight' });
            expect(last.spies.onTurn).toHaveBeenCalledWith(0);
            cleanup();
            const first = renderKnob({ current: 0, open: true });
            fireEvent.keyDown(first.knob, { key: 'ArrowLeft' });
            expect(first.spies.onTurn).toHaveBeenCalledWith(POSITIONS - 1);
        });

        // 指針由刻度尾跳返刻度頭（唔會轉成個刻度弧返去）；之後一格一格照舊有過場
        it('should jump the pointer across the seam and move it smoothly otherwise', () => {
            const knobAt = (current: number) => (
                <svg>
                    <Knob
                        layout={LAYOUT}
                        positions={POSITIONS}
                        current={current}
                        open
                        accent="#c8442b"
                        glow="#ffd0c0"
                        valueText="KOMOREBI"
                        {...handlers()}
                    />
                </svg>
            );
            const { container, rerender } = render(knobAt(POSITIONS - 1));
            const knob = screen.getByRole('slider');
            const pointer = () => container.querySelector('[data-part="knob-pointer"]');
            fireEvent.keyDown(knob, { key: 'ArrowRight' });
            rerender(knobAt(0));
            expect(pointer()).toHaveClass('knob-move--jump');
            fireEvent.keyDown(knob, { key: 'ArrowRight' });
            rerender(knobAt(1));
            expect(pointer()).not.toHaveClass('knob-move--jump');
            fireEvent.keyDown(knob, { key: 'End' });
            rerender(knobAt(POSITIONS - 1));
            expect(pointer()).not.toHaveClass('knob-move--jump');
        });

        // W-060：擰（拖動）係主要手勢：拖過 ♥ 嗰一步指針跳，下一步照舊有過場；倒轉一樣
        it('should jump the pointer for the dragged step across the seam only', () => {
            const knobAt = (current: number) => (
                <svg>
                    <Knob
                        layout={LAYOUT}
                        positions={POSITIONS}
                        current={current}
                        open
                        accent="#c8442b"
                        glow="#ffd0c0"
                        valueText="KOMOREBI"
                        {...handlers()}
                    />
                </svg>
            );
            const { container, rerender } = render(knobAt(POSITIONS - 1));
            const hit = container.querySelector('[data-part="knob-hit"]') as Element;
            hit.getBoundingClientRect = () =>
                ({
                    left: CENTRE.x - RADIUS_PX,
                    top: CENTRE.y - RADIUS_PX,
                    width: RADIUS_PX * 2,
                    height: RADIUS_PX * 2,
                }) as DOMRect;
            const knob = screen.getByRole('slider');
            const jumps = () =>
                container
                    .querySelector('[data-part="knob-pointer"]')
                    ?.classList.contains('knob-move--jump');
            // 由 ♥ 開始：一格 = 第一隻碟（跳）、兩格 = 第二隻、返一格 = 第一隻、返到起點 = ♥（跳）、再返 = ♥ 前面
            const steps: readonly [number, number, boolean][] = [
                [STEP_DEG, 0, true],
                [STEP_DEG * 2, 1, false],
                [STEP_DEG, 0, false],
                [0, POSITIONS - 1, true],
                [-STEP_DEG, POSITIONS - 2, false],
            ];
            fireEvent.pointerDown(knob, at(0));
            steps.forEach(([deg, current, jump]) => {
                fireEvent.pointerMove(knob, at(deg));
                rerender(knobAt(current));
                expect({ current, jump: jumps() }).toEqual({ current, jump });
            });
            fireEvent.pointerUp(knob, at(-STEP_DEG));
        });

        /*
         * S-218：`jump` 淨係講啱啱嗰一步。Esc 取消如果行最短路返去要跨過 ♥ 同第一隻碟之間，都係跳（唔會轉成個刻度弧）；
         * Enter 唔係一步（指針唔郁），之後唔係旋鈕嘅改動（例如㩒 ♥ 掣）唔當跳
         */
        describe('after finishing or cancelling', () => {
            const knobAt = (current: number, open: boolean) => (
                <svg>
                    <Knob
                        layout={LAYOUT}
                        positions={POSITIONS}
                        current={current}
                        open={open}
                        accent="#c8442b"
                        glow="#ffd0c0"
                        valueText="KOMOREBI"
                        {...handlers()}
                    />
                </svg>
            );
            const setUp = (current: number) => {
                const view = render(knobAt(current, true));
                const knob = screen.getByRole('slider');
                const jumps = () =>
                    view.container
                        .querySelector('[data-part="knob-pointer"]')
                        ?.classList.contains('knob-move--jump');
                /** 撳一個鍵，外面跟住將 current / open 改成 next */
                const press = (key: string, current: number, open = true) => {
                    fireEvent.keyDown(knob, { key });
                    view.rerender(knobAt(current, open));
                    return jumps();
                };
                return { press, jumps, rerender: view.rerender };
            };

            it('should jump back across the seam when a turn past ♥ is cancelled', () => {
                const { press } = setUp(0);
                expect(press('ArrowLeft', POSITIONS - 1)).toBe(true);
                expect(press('ArrowLeft', POSITIONS - 2)).toBe(false);
                expect(press('Escape', 0, false)).toBe(true);
            });

            it('should move back smoothly when the cancelled turn did not cross the seam', () => {
                const { press } = setUp(5);
                expect(press('ArrowRight', 6)).toBe(false);
                expect(press('ArrowRight', 7)).toBe(false);
                expect(press('Escape', 5, false)).toBe(false);
            });

            it('should drop the jump on Enter and not jump for a change from elsewhere', () => {
                const { press, jumps, rerender } = setUp(POSITIONS - 1);
                expect(press('ArrowRight', 0)).toBe(true);
                expect(press('Enter', 0, false)).toBe(false);
                rerender(knobAt(POSITIONS - 1, false));
                expect(jumps()).toBe(false);
            });
        });

        it('should not reopen an open dial', () => {
            const { knob, spies } = renderKnob({ open: true });
            fireEvent.keyDown(knob, { key: 'End' });
            expect(spies.onStart).not.toHaveBeenCalled();
            expect(spies.onTurn).toHaveBeenCalledWith(POSITIONS - 1);
        });

        it('should keep the new disc with Enter', () => {
            const { knob, spies } = renderKnob({ open: true });
            fireEvent.keyDown(knob, { key: 'Enter' });
            expect(spies.onEnd).toHaveBeenCalledTimes(1);
            expect(spies.onCancel).not.toHaveBeenCalled();
        });

        // S-154：Esc = 取消（返去開始嗰隻碟），唔係完成
        it('should cancel choosing with Escape', () => {
            const { knob, spies } = renderKnob({ open: true });
            fireEvent.keyDown(knob, { key: 'Escape' });
            expect(spies.onCancel).toHaveBeenCalledTimes(1);
            expect(spies.onEnd).not.toHaveBeenCalled();
        });

        it('should drop a drag cancelled with Escape', () => {
            const { knob, spies } = renderKnob({ open: true });
            fireEvent.pointerDown(knob, at(0));
            fireEvent.keyDown(knob, { key: 'Escape' });
            fireEvent.pointerMove(knob, at(STEP_DEG * 2));
            fireEvent.pointerUp(knob, at(STEP_DEG * 2));
            expect(spies.onCancel).toHaveBeenCalledTimes(1);
            expect(spies.onTurn).not.toHaveBeenCalled();
            expect(spies.onEnd).not.toHaveBeenCalled();
        });

        it('should finish choosing when the focus leaves the knob', () => {
            const { knob, spies } = renderKnob({ open: true });
            fireEvent.blur(knob);
            expect(spies.onEnd).toHaveBeenCalledTimes(1);
        });

        it('should ignore Enter, Escape and leaving when the dial is closed', () => {
            const { knob, spies } = renderKnob();
            fireEvent.keyDown(knob, { key: 'Enter' });
            fireEvent.keyDown(knob, { key: 'Escape' });
            fireEvent.blur(knob);
            expect(spies.onEnd).not.toHaveBeenCalled();
            expect(spies.onCancel).not.toHaveBeenCalled();
            expect(spies.onStart).not.toHaveBeenCalled();
        });
    });
});
