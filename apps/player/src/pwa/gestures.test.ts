import { trackGestures } from './gestures';

const pointer = (type: string, pointerId: number) => {
    const event = new Event(type);
    Object.defineProperty(event, 'pointerId', { value: pointerId });
    window.dispatchEvent(event);
};

describe('trackGestures', () => {
    it('should report a gesture from the first press until the last finger lifts', () => {
        const onChange = vi.fn();
        const stop = trackGestures(window, onChange);
        pointer('pointerdown', 1);
        pointer('pointerdown', 2);
        pointer('pointerup', 1);
        expect(onChange).toHaveBeenLastCalledWith(true);
        pointer('pointercancel', 2);
        expect(onChange).toHaveBeenLastCalledWith(false);
        stop();
    });

    it('should end the gesture when the window loses focus mid-press', () => {
        const onChange = vi.fn();
        const stop = trackGestures(window, onChange);
        pointer('pointerdown', 1);
        window.dispatchEvent(new Event('blur'));
        expect(onChange).toHaveBeenLastCalledWith(false);
        stop();
    });

    it('should stop listening once stopped', () => {
        const onChange = vi.fn();
        trackGestures(window, onChange)();
        pointer('pointerdown', 1);
        expect(onChange).not.toHaveBeenCalled();
    });
});
