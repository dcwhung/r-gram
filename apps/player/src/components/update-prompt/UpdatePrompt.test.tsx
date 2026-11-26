import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UpdateStatus } from '../../pwa/updateManager';
import type { UpdatePort } from '../../pwa/useUpdates';
import { UpdatePrompt } from './UpdatePrompt';

/** 假嘅更新：測試決定有冇新版等緊 */
const fakePort = (initial: UpdateStatus = 'none') => {
    let status = initial;
    const listeners = new Set<() => void>();
    const port: UpdatePort = {
        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        getSnapshot: () => status,
        setPlaying: vi.fn(),
        applyNow: vi.fn(),
    };
    const set = (next: UpdateStatus) =>
        act(() => {
            status = next;
            listeners.forEach((listener) => listener());
        });
    return { port, set };
};

describe('UpdatePrompt', () => {
    it('should keep an empty live region while no update is waiting', () => {
        const { port } = fakePort();
        render(<UpdatePrompt port={port} playing={false} />);
        expect(screen.getByRole('status')).toBeEmptyDOMElement();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('should tell the update manager whether playback is active', () => {
        const { port } = fakePort();
        const { rerender } = render(<UpdatePrompt port={port} playing={false} />);
        rerender(<UpdatePrompt port={port} playing />);
        expect(port.setPlaying).toHaveBeenLastCalledWith(true);
    });

    it('should announce a waiting update with written-Chinese text and an apply button', () => {
        const { port, set } = fakePort();
        render(<UpdatePrompt port={port} playing />);
        set('waiting');
        expect(screen.getByRole('status')).toHaveTextContent('已有新版本');
        expect(screen.getByRole('button', { name: '立即更新並重新載入' })).toHaveTextContent(
            '立即更新',
        );
    });

    it('should apply the update when the button is pressed', async () => {
        const { port } = fakePort('waiting');
        render(<UpdatePrompt port={port} playing />);
        await userEvent.click(screen.getByRole('button', { name: '立即更新並重新載入' }));
        expect(port.applyNow).toHaveBeenCalledTimes(1);
    });

    it('should hide the prompt again when the update went through', () => {
        const { port, set } = fakePort('waiting');
        render(<UpdatePrompt port={port} playing />);
        set('none');
        expect(screen.queryByRole('button')).toBeNull();
    });
});
