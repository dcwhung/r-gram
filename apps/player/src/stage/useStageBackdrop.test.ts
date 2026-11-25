import { renderHook } from '@testing-library/react';
import { backdropFor, useStageBackdrop } from './useStageBackdrop';

const backdrop = () => document.documentElement.style.getPropertyValue('--stage-backdrop');

/* B-014：安全區外面（狀態列、底部指示條後面）由 `--stage-backdrop` 填，每個場景設返自己嘅底色 */
describe('useStageBackdrop', () => {
    it('should set the backdrop while mounted and clear it afterwards', () => {
        const { rerender, unmount } = renderHook(({ value }) => useStageBackdrop(value), {
            initialProps: { value: 'var(--color-stage)' },
        });
        expect(backdrop()).toBe('var(--color-stage)');
        rerender({ value: 'var(--color-flag-bg)' });
        expect(backdrop()).toBe('var(--color-flag-bg)');
        unmount();
        expect(backdrop()).toBe('');
    });
});

describe('backdropFor', () => {
    it('should use black for the preload flag and the stage colour at home', () => {
        expect(backdropFor('preload')).toBe('var(--color-flag-bg)');
        expect(backdropFor('home')).toBe('var(--color-stage)');
        expect(backdropFor('discChange')).toBe('var(--color-stage)');
    });

    it('should use the dimmed stage colour behind the track list', () => {
        expect(backdropFor('list')).toBe('var(--color-stage-dimmed)');
    });
});
