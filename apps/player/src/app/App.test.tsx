import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
    it('should show the app name, the unofficial notice and the version from package.json', () => {
        render(<App />);
        expect(screen.getByText('R Gram')).toBeInTheDocument();
        // 中間係全形空格：Testing Library 會將空白正規化，所以用 regex 對
        expect(screen.getByText(/^歌迷自製\s非官方$/)).toBeInTheDocument();
        expect(screen.getByText(/^v\d+\.\d+\.\d+$/)).toBeInTheDocument();
    });
});
