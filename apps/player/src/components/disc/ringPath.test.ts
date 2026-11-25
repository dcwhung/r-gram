import { ringPath } from './ringPath';

describe('ringPath', () => {
    it('should draw the outer and the inner circle as two closed sub-paths for even-odd filling', () => {
        const path = ringPath(500, 59);
        expect(path.match(/M/g)).toHaveLength(2);
        expect(path.match(/z/g)).toHaveLength(2);
        expect(path.startsWith('M-500 0a500 500 0 1 0 1000 0a500 500 0 1 0 -1000 0z')).toBe(true);
        expect(path.endsWith('M-59 0a59 59 0 1 0 118 0a59 59 0 1 0 -118 0z')).toBe(true);
    });
});
