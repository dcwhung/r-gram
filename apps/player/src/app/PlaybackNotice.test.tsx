import { render } from '@testing-library/react';
import { PlaybackNotice } from './PlaybackNotice';

/* US-004：載入失敗嘅一行提示，讀屏都會讀（live region 一直喺度，有錯先填字） */
describe('PlaybackNotice', () => {
    it('should announce a track that failed to load', () => {
        const { container } = render(<PlaybackNotice failedTitle="Apollo" />);
        const region = container.querySelector('[aria-live="polite"]');
        expect(region).toHaveTextContent('未能播放「Apollo」');
    });

    it('should stay empty otherwise', () => {
        const { container } = render(<PlaybackNotice failedTitle={null} />);
        expect(container.querySelector('[aria-live="polite"]')).toBeEmptyDOMElement();
    });
});
