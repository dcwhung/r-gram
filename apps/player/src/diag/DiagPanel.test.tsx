import { act, fireEvent, render, screen } from '@testing-library/react';
import { DiagPanel, LIVE_REFRESH_MS } from './DiagPanel';
import { DiagRecorder } from './recorder';

describe('DiagPanel', () => {
    let recorder: DiagRecorder;

    beforeEach(() => {
        vi.stubGlobal('requestAnimationFrame', () => 1);
        vi.stubGlobal('cancelAnimationFrame', () => undefined);
        recorder = new DiagRecorder();
        recorder.start();
    });

    afterEach(() => {
        recorder.stop();
        vi.useRealTimers();
    });

    const renderPanel = (onClose = vi.fn()) => {
        render(<DiagPanel recorder={recorder} onClose={onClose} />);
        return onClose;
    };

    it('should show the live numbers, the load moments and the log', () => {
        renderPanel();
        expect(screen.getByRole('region', { name: '畫面尺寸診斷' })).toBeInTheDocument();
        const text = screen.getByTestId('diag-text').textContent ?? '';
        expect(text).toContain('mode ');
        expect(text).toContain('fit key changes/s 0 (max 0)');
        expect(text).toContain('enabled @+');
        expect(text).toContain('[log 0]');
    });

    it('should update when an event is logged', () => {
        renderPanel();
        act(() => {
            window.dispatchEvent(new Event('resize'));
        });
        expect(screen.getByTestId('diag-text').textContent).toContain('[log 1]');
    });

    it('should refresh the live numbers on a timer', () => {
        vi.useFakeTimers();
        renderPanel();
        const snapshot = vi.spyOn(recorder, 'snapshot');
        act(() => {
            vi.advanceTimersByTime(LIVE_REFRESH_MS);
        });
        expect(snapshot).toHaveBeenCalled();
    });

    it('should copy the whole report', async () => {
        const writeText = vi.fn(() => Promise.resolve());
        vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
        renderPanel();
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: '複製' }));
        });
        expect(writeText).toHaveBeenCalledWith(expect.stringContaining('R Gram viewport diag'));
        expect(screen.getByRole('status')).toHaveTextContent('已複製');
    });

    it('should fall back to a selected text box when the clipboard is not there', async () => {
        vi.stubGlobal('navigator', { ...navigator, clipboard: undefined });
        renderPanel();
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: '複製' }));
        });
        const box = screen.getByRole<HTMLTextAreaElement>('textbox', { name: '複製' });
        expect(box.value).toContain('R Gram viewport diag');
        expect(box.selectionEnd).toBe(box.value.length);
        expect(screen.getByRole('status')).toHaveTextContent('未能自動複製');
    });

    it('should clear the log and close', () => {
        const onClose = renderPanel();
        act(() => {
            window.dispatchEvent(new Event('resize'));
        });
        fireEvent.click(screen.getByRole('button', { name: '清除記錄' }));
        expect(screen.getByTestId('diag-text').textContent).toContain('[log 0]');
        fireEvent.click(screen.getByRole('button', { name: '關閉' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
