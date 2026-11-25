import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
    it('should show the app name, the unofficial notice and the version from package.json', () => {
        render(<App />);
        expect(screen.getByText('R Gram')).toBeInTheDocument();
        expect(screen.getByText('歌迷自製　非官方')).toBeInTheDocument();
        expect(screen.getByText(/^v\d+\.\d+\.\d+$/)).toBeInTheDocument();
    });
});
