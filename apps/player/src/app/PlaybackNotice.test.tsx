import { render, screen } from '@testing-library/react';
import { PlaybackNotice } from './PlaybackNotice';

/* US-004：載入失敗嘅一行提示，讀屏都會讀（live region 一直喺度，有錯先填字） */
describe('PlaybackNotice', () => {
    it('should announce a track that failed to load', () => {
        render(<PlaybackNotice failedTitle="Apollo" />);
        expect(screen.getByRole('status')).toHaveTextContent('未能播放「Apollo」');
    });

    it('should stay empty otherwise', () => {
        render(<PlaybackNotice failedTitle={null} />);
        expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });
});
